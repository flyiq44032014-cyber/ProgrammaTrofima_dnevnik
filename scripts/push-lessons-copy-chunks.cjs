"use strict";
/**
 * Заливает class_diary_lessons на Render из подготовленного pg_dump (COPY).
 * 1) Файл: pg_dump … -t class_diary_lessons → strip → scripts/_tmp_lessons_clean.sql
 * 2) node scripts/push-lessons-copy-chunks.cjs
 *
 * Переменные: DATABASE_URL, LOCAL_DATABASE_URL (для запасного пути),
 * CHUNK_LINES (default 200; при обрывах ставьте 40–60).
 *
 * Если COPY-чанк после всех попыток не проходит — запасной путь: SELECT с локали
 * и INSERT на удалёнку батчами (см. LESSONS_FALLBACK_BATCH).
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require("pg");

function renderExternalUrl(urlString) {
  try {
    const u = new URL(urlString);
    if (u.hostname && !u.hostname.includes(".") && /^dpg-/i.test(u.hostname)) {
      u.hostname = `${u.hostname}.frankfurt-postgres.render.com`;
    }
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return urlString;
  }
}

function pgRemoteCfg(url) {
  return {
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    application_name: "push-lessons-copy-chunks",
  };
}

const cleanPath = path.join(__dirname, "_tmp_lessons_clean.sql");
const CHUNK = Math.max(25, parseInt(process.env.CHUNK_LINES || "200", 10) || 200);
const COPY_ATTEMPTS = parseInt(process.env.COPY_ATTEMPTS || "6", 10) || 6;
const FB_BATCH = Math.max(1, parseInt(process.env.LESSONS_FALLBACK_BATCH || "3", 10) || 3);
const FB_ROW_RETRIES = parseInt(process.env.LESSONS_FALLBACK_ROW_RETRIES || "12", 10) || 12;

const remoteUrl = renderExternalUrl(process.env.DATABASE_URL);
const localUrl = process.env.LOCAL_DATABASE_URL;
const password = new URL(remoteUrl).password;
const psql = "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";

const COLS = [
  "id",
  "class_id",
  "date_iso",
  "lesson_order",
  "lesson_key",
  "title",
  "time_label",
  "grade",
  "teacher",
  "topic",
  "homework",
  "control_work",
  "place",
  "homework_next",
  "blocks_json",
];

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseCopyBlocks(text) {
  const lines = text.split(/\r?\n/);
  const copyLineIdx = lines.findIndex((l) => l.startsWith("COPY public.class_diary_lessons"));
  if (copyLineIdx < 0) throw new Error("COPY class_diary_lessons not found");
  const endIdx = lines.findIndex((l, i) => i > copyLineIdx && l === "\\.");
  if (endIdx < 0) throw new Error("COPY terminator \\. not found");
  const copyHeader = lines[copyLineIdx];
  const dataLines = lines.slice(copyLineIdx + 1, endIdx);
  return { copyHeader, dataLines };
}

function idsFromCopyDataLines(lines) {
  const ids = [];
  for (const line of lines) {
    const t = line.indexOf("\t");
    if (t <= 0) throw new Error("bad COPY line (no id tab)");
    ids.push(parseInt(line.slice(0, t), 10));
  }
  return ids;
}

async function fetchLessonsFromLocal(ids) {
  const src = new Client({ connectionString: localUrl });
  await src.connect();
  const { rows } = await src.query(
    `SELECT ${COLS.map((c) => `"${c}"`).join(", ")} FROM public.class_diary_lessons WHERE id = ANY($1::int[]) ORDER BY id`,
    [ids]
  );
  await src.end();
  if (rows.length !== ids.length) {
    console.error(`warning: local returned ${rows.length} rows, expected ${ids.length}`);
  }
  return rows;
}

async function insertBatchesRemote(dst0, rows) {
  const colList = COLS.map((c) => `"${c}"`).join(", ");
  const tq = "public.class_diary_lessons";
  let dst = dst0;

  for (let i = 0; i < rows.length; i += FB_BATCH) {
    const chunk = rows.slice(i, i + FB_BATCH);
    const values = [];
    const params = [];
    let p = 1;
    for (const row of chunk) {
      const ph = COLS.map(() => `$${p++}`);
      values.push(`(${ph.join(",")})`);
      for (const c of COLS) {
        params.push(row[c] === undefined ? null : row[c]);
      }
    }
    const sql = `INSERT INTO ${tq} (${colList}) VALUES ${values.join(",")} ON CONFLICT (id) DO NOTHING`;
    let ok = false;
    for (let attempt = 1; attempt <= FB_ROW_RETRIES && !ok; attempt++) {
      try {
        await dst.query(sql, params);
        ok = true;
      } catch (e) {
        const transient =
          e.code === "ECONNRESET" ||
          String(e.message || "").includes("terminated") ||
          String(e.message || "").includes("ECONNRESET");
        if (!transient && e.code !== "57P01") throw e;
        console.error(`\n  fallback retry ${attempt}: ${e.message}`);
        await dst.end().catch(() => {});
        await sleep(500 * attempt);
        dst = new Client(pgRemoteCfg(remoteUrl));
        dst.on("error", (err) => console.error("[dst]", err.message));
        await dst.connect();
        await dst.query("SET statement_timeout = '180s'");
      }
    }
    if (!ok) throw new Error("fallback INSERT failed");
    process.stdout.write(`\r  fallback +${Math.min(i + chunk.length, rows.length)}/${rows.length}`);
  }
  return dst;
}

async function fallbackCopyPart(dataLines, partIdx) {
  if (!localUrl) {
    throw new Error(
      "COPY не удался и LOCAL_DATABASE_URL не задан. Укажите локальный URL в .env или выполните: node scripts/push-class-diary-lessons.cjs"
    );
  }
  const ids = idsFromCopyDataLines(dataLines);
  console.error(`\nCOPY part ${partIdx} не прошёл → запасной путь: INSERT ${ids.length} строк через pg (локаль → Render)`);
  const rows = await fetchLessonsFromLocal(ids);
  let dst = new Client(pgRemoteCfg(remoteUrl));
  dst.on("error", (e) => console.error("[dst]", e.message));
  await dst.connect();
  await dst.query("SET statement_timeout = '180s'");
  const dst2 = await insertBatchesRemote(dst, rows);
  await dst2.end();
  console.error(`\n  запасной путь part ${partIdx} готов`);
}

async function main() {
  const env = { ...process.env, PGPASSWORD: password };
  const trunc = spawnSync(
    psql,
    [remoteUrl, "-v", "ON_ERROR_STOP=1", "-c", "TRUNCATE TABLE public.class_diary_lessons RESTART IDENTITY CASCADE;"],
    { env, encoding: "utf8" }
  );
  if (trunc.status !== 0) {
    console.error(trunc.stderr || trunc.stdout);
    throw new Error("TRUNCATE failed");
  }

  const text = fs.readFileSync(cleanPath, "utf8");
  const { copyHeader, dataLines } = parseCopyBlocks(text);
  const parts = [];
  for (let i = 0; i < dataLines.length; i += CHUNK) {
    parts.push(dataLines.slice(i, i + CHUNK));
  }
  console.error("chunks:", parts.length, "rows:", dataLines.length, "chunkLines:", CHUNK);

  const outDir = path.join(__dirname, "_lessons_chunks");
  fs.mkdirSync(outDir, { recursive: true });
  parts.forEach((rows, idx) => {
    const body = [copyHeader, ...rows, "\\.", ""].join("\n");
    fs.writeFileSync(path.join(outDir, `part_${idx}.sql`), body, "utf8");
  });

  for (let idx = 0; idx < parts.length; idx++) {
    const file = path.join(outDir, `part_${idx}.sql`);
    let ok = false;
    for (let attempt = 1; attempt <= COPY_ATTEMPTS && !ok; attempt++) {
      const r = spawnSync(psql, [remoteUrl, "-v", "ON_ERROR_STOP=1", "-f", file], {
        env,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
      if (r.status === 0) {
        ok = true;
        process.stdout.write(`\r${idx + 1}/${parts.length}`);
      } else {
        console.error(`\npart ${idx} attempt ${attempt} failed:`, r.stderr || r.stdout);
        sleepSync(1000 * attempt);
      }
    }
    if (!ok) {
      await fallbackCopyPart(parts[idx], idx);
      process.stdout.write(`\r${idx + 1}/${parts.length}`);
    }
  }

  const fin = new Client(pgRemoteCfg(remoteUrl));
  await fin.connect();
  await fin.query(
    `SELECT setval(pg_get_serial_sequence('public.class_diary_lessons','id'), COALESCE((SELECT MAX(id) FROM public.class_diary_lessons), 1))`
  );
  await fin.end();

  console.log("\nГотово COPY (+ при необходимости запасной путь), строк:", dataLines.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
