"use strict";
/**
 * Сверка локальной БД и Render по числу строк во всех общих таблицах public.
 * Таблицы только на Render (v2 и т.д.) должны быть пустыми — иначе расхождение с «копией локали».
 *
 *   node scripts/verify-db-parity.cjs
 *   node scripts/verify-db-parity.cjs --fix   — TRUNCATE на Render только таблиц «только Render» с count>0
 *
 * Нужны LOCAL_DATABASE_URL и DATABASE_URL в .env
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { spawnSync } = require("child_process");

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

const psql = "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const localUrl = process.env.LOCAL_DATABASE_URL;
const remoteUrl = renderExternalUrl(process.env.DATABASE_URL);
const fix = process.argv.includes("--fix");

function runSql(url, sql) {
  const u = new URL(url);
  const env = { ...process.env, PGPASSWORD: u.password || "" };
  const r = spawnSync(psql, [url, "-t", "-A", "-c", sql], { env, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  return { ok: r.status === 0, out: (r.stdout || "").trim(), err: r.stderr || r.stdout };
}

function tableList(url) {
  const r = runSql(
    url,
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`
  );
  if (!r.ok) throw new Error(r.err);
  return r.out ? r.out.split(/\r?\n/).filter(Boolean) : [];
}

function countRows(url, table) {
  const r = runSql(url, `SELECT count(*)::bigint FROM public.${table}`);
  if (!r.ok) return { ok: false, n: -1, err: r.err };
  const n = parseInt(r.out, 10);
  return { ok: true, n: Number.isFinite(n) ? n : -1 };
}

function main() {
  if (!localUrl || !remoteUrl) {
    console.error("Задайте LOCAL_DATABASE_URL и DATABASE_URL в .env");
    process.exit(1);
  }

  const L = tableList(localUrl);
  const R = tableList(remoteUrl);
  const setL = new Set(L);
  const setR = new Set(R);
  const onlyRemote = R.filter((t) => !setL.has(t)).sort();

  let fatal = false;
  const sharedMismatch = [];

  for (const t of L) {
    if (!setR.has(t)) {
      console.error(`Локальная таблица ${t} отсутствует на Render — критично.`);
      fatal = true;
      continue;
    }
    const cL = countRows(localUrl, t);
    const cR = countRows(remoteUrl, t);
    if (!cL.ok || !cR.ok) {
      console.error(`Ошибка count для ${t}`);
      fatal = true;
      continue;
    }
    if (cL.n !== cR.n) {
      sharedMismatch.push({ t, local: cL.n, remote: cR.n });
    }
  }

  const remoteExtraData = [];
  for (const t of onlyRemote) {
    const c = countRows(remoteUrl, t);
    if (!c.ok) {
      console.error(`Ошибка count для render-only ${t}`);
      fatal = true;
      continue;
    }
    if (c.n > 0) {
      remoteExtraData.push({ t, n: c.n });
    }
  }

  if (fatal) {
    process.exit(1);
  }

  if (sharedMismatch.length) {
    console.error("Расхождение числа строк (локаль vs Render):");
    for (const x of sharedMismatch) {
      console.error(`  ${x.t}: локаль=${x.local} Render=${x.remote}`);
    }
    console.error("Исправление: node scripts/sync-full-data-chunked.cjs --resume (или полный sync без --resume).");
  }

  if (remoteExtraData.length) {
    console.error("На Render есть строки в таблицах, которых нет на локали (должны быть пустыми):");
    for (const x of remoteExtraData) {
      console.error(`  ${x.t}: ${x.n} строк`);
    }
    if (fix) {
      const list = remoteExtraData.map((x) => `public.${x.t}`).join(", ");
      const sql = `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`;
      console.error("Выполняю --fix:", sql);
      const u = new URL(remoteUrl);
      const env = { ...process.env, PGPASSWORD: u.password || "" };
      const r = spawnSync(psql, [remoteUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], { env, encoding: "utf8" });
      if (r.status !== 0) {
        console.error(r.stderr || r.stdout);
        process.exit(1);
      }
      for (const x of remoteExtraData) {
        const c = countRows(remoteUrl, x.t);
        if (c.ok && c.n !== 0) {
          console.error(`После TRUNCATE в ${x.t} всё ещё ${c.n} строк`);
          process.exit(1);
        }
      }
      console.error("Лишние строки на Render удалены.");
    }
  }

  if (sharedMismatch.length) {
    process.exit(1);
  }
  if (remoteExtraData.length && !fix) {
    console.error("Повторите с --fix чтобы очистить лишние строки на Render.");
    process.exit(1);
  }

  console.log(`OK: все ${L.length} общих таблиц совпадают по count(*).`);
  console.log(
    `На Render дополнительно ${onlyRemote.length} таблиц (только хостинг), все с 0 строк — как у «чистой копии» локали.`
  );
  process.exit(0);
}

main();
