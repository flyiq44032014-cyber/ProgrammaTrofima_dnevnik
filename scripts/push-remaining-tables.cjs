"use strict";
/**
 * Заливает данные таблиц с локальной БД на Render по одной таблице (INSERT батчами).
 * Требует: PostgreSQL 17 bin, .env с LOCAL_DATABASE_URL и DATABASE_URL.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PG_BIN = "C:\\Program Files\\PostgreSQL\\17\\bin";
const pgDump = path.join(PG_BIN, "pg_dump.exe");
const psql = path.join(PG_BIN, "psql.exe");

function renderExternalUrl(urlString) {
  try {
    const u = new URL(urlString);
    const h = u.hostname;
    if (h && !h.includes(".") && /^dpg-/i.test(h)) {
      u.hostname = `${h}.frankfurt-postgres.render.com`;
    }
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return urlString;
  }
}

function stripPgdumpSession(sql) {
  let s = sql.replace(/^\\restrict[^\n]*\s*/m, "");
  return s
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("SET ") && !line.startsWith("SELECT pg_catalog.set_config"))
    .join("\n");
}

const localUrl = process.env.LOCAL_DATABASE_URL;
let remoteUrl = process.env.DATABASE_URL;
if (!localUrl || !remoteUrl) {
  console.error("Нужны LOCAL_DATABASE_URL и DATABASE_URL в .env");
  process.exit(1);
}
remoteUrl = renderExternalUrl(remoteUrl);

const tables = [
  { name: "user_parent_children", rpi: 40 },
  { name: "teacher_subjects", rpi: 40 },
  { name: "director_quarter_schedule", rpi: 35 },
  { name: "class_diary_days", rpi: 35 },
  { name: "class_diary_lessons", rpi: 12 },
];

const backupDir = path.join(__dirname, "..", "backups");
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

console.log("TRUNCATE на хостинге…");
execFileSync(
  psql,
  [remoteUrl, "-v", "ON_ERROR_STOP=1", "-c", 
    "TRUNCATE TABLE public.class_diary_lessons, public.class_diary_days, public.director_quarter_schedule, public.teacher_subjects, public.user_parent_children RESTART IDENTITY CASCADE;"],
  { stdio: "inherit" }
);

for (const { name, rpi } of tables) {
  const raw = path.join(backupDir, `push-${name}.sql`);
  const clean = path.join(backupDir, `push-${name}-clean.sql`);
  console.log(`\n>>> ${name} (rows-per-insert=${rpi})`);
  execFileSync(
    pgDump,
    [
      "--data-only",
      "--column-inserts",
      `--rows-per-insert=${rpi}`,
      "-f",
      raw,
      "-t",
      `public.${name}`,
      localUrl,
    ],
    { stdio: "inherit" }
  );
  const sql = fs.readFileSync(raw, "utf8");
  fs.writeFileSync(clean, stripPgdumpSession(sql), "utf8");
  execFileSync(psql, [remoteUrl, "-v", "ON_ERROR_STOP=1", "-f", clean], { stdio: "inherit" });
  try {
    fs.unlinkSync(raw);
    fs.unlinkSync(clean);
  } catch {
    /* ok */
  }
}

console.log("\nГотово.");
