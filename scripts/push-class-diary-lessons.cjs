"use strict";
/** Запасной способ залить class_diary_lessons (локаль → Render) без pg_dump COPY.
 *  Быстрее для полной таблицы: node scripts/push-lessons-copy-chunks.cjs (там же авто-fallback через pg).
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
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
    application_name: "push-class-diary-lessons",
  };
}

const localUrl = process.env.LOCAL_DATABASE_URL;
const remoteUrl = renderExternalUrl(process.env.DATABASE_URL);
const fresh = process.argv.includes("--fresh");
const BATCH = Math.max(1, parseInt(process.env.LESSONS_BATCH || "150", 10) || 150);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const src = new Client({ connectionString: localUrl });
  await src.connect();
  const { rows } = await src.query(
    `SELECT id, class_id, date_iso, lesson_order, lesson_key, title, time_label, grade, teacher, topic, homework, control_work, place, homework_next, blocks_json FROM public.class_diary_lessons ORDER BY id`
  );
  await src.end();

  let dst = new Client(pgRemoteCfg(remoteUrl));
  dst.on("error", (e) => console.error("[dst]", e.message));
  await dst.connect();
  await dst.query("SET statement_timeout = '180s'");
  if (fresh) {
    await dst.query("TRUNCATE TABLE public.class_diary_lessons RESTART IDENTITY CASCADE");
  }
  const maxRow = await dst.query(`SELECT COALESCE(MAX(id), 0)::int AS m FROM public.class_diary_lessons`);
  const startAfter = maxRow.rows[0].m;
  const pending = rows.filter((r) => r.id > startAfter);
  console.error("remote max id:", startAfter, "pending:", pending.length, "/", rows.length, fresh ? "(fresh)" : "(resume)");

  if (pending.length === 0) {
    await dst.query(
      `SELECT setval(pg_get_serial_sequence('public.class_diary_lessons','id'), COALESCE((SELECT MAX(id) FROM public.class_diary_lessons), 1))`
    );
    await dst.end();
    console.error("Нечего догружать.");
    return;
  }

  const cols = [
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
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const tq = "public.class_diary_lessons";

  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const values = [];
    const params = [];
    let p = 1;
    for (const row of chunk) {
      const ph = cols.map(() => `$${p++}`);
      values.push(`(${ph.join(",")})`);
      for (const c of cols) {
        params.push(row[c] === undefined ? null : row[c]);
      }
    }
    const sql = `INSERT INTO ${tq} (${colList}) VALUES ${values.join(",")} ON CONFLICT (id) DO NOTHING`;
    let ok = false;
    for (let attempt = 1; attempt <= 8 && !ok; attempt++) {
      try {
        await dst.query("BEGIN");
        await dst.query(sql, params);
        await dst.query("COMMIT");
        ok = true;
        process.stdout.write(
          `\r${i + chunk.length}/${pending.length}  id=${chunk[chunk.length - 1].id}`
        );
      } catch (e) {
        await dst.query("ROLLBACK").catch(() => {});
        const transient =
          e.code === "ECONNRESET" ||
          String(e.message || "").includes("terminated") ||
          String(e.message || "").includes("ECONNRESET");
        if (!transient && e.code !== "57P01") throw e;
        console.error(`\nretry ${attempt} after ${e.message}`);
        await dst.end().catch(() => {});
        await sleep(800 * attempt);
        dst = new Client(pgRemoteCfg(remoteUrl));
        dst.on("error", (err) => console.error("[dst]", err.message));
        await dst.connect();
        await dst.query("SET statement_timeout = '180s'");
      }
    }
    if (!ok) throw new Error("batch failed");
  }

  await dst.query(
    `SELECT setval(pg_get_serial_sequence('public.class_diary_lessons','id'), COALESCE((SELECT MAX(id) FROM public.class_diary_lessons), 1))`
  );
  await dst.end();
  console.log("\nГотово class_diary_lessons, всего в локали:", rows.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
