"use strict";
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PG_BIN = "C:\\Program Files\\PostgreSQL\\17\\bin";
const psql = path.join(PG_BIN, "psql.exe");

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

const localUrl = process.env.LOCAL_DATABASE_URL;
let remoteUrl = renderExternalUrl(process.env.DATABASE_URL);
if (!localUrl || !process.env.DATABASE_URL) {
  console.error("Нужны LOCAL_DATABASE_URL и DATABASE_URL");
  process.exit(1);
}

const backupDir = path.join(__dirname, "..", "backups");
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const toPosix = (p) => p.replace(/\\/g, "/");

/** Порядок импорта (родители FK сначала). */
const tables = [
  "user_parent_children",
  "teacher_subjects",
  "director_quarter_schedule",
  "class_diary_days",
  "class_diary_lessons",
];

console.log("TRUNCATE на хостинге…");
execFileSync(
  psql,
  [
    remoteUrl,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "TRUNCATE TABLE public.class_diary_lessons, public.class_diary_days, public.director_quarter_schedule, public.teacher_subjects, public.user_parent_children RESTART IDENTITY CASCADE;",
  ],
  { stdio: "inherit" }
);

for (const t of tables) {
  const csv = path.join(backupDir, `${t}.csv`);
  const posix = toPosix(csv);
  console.log(`\n${t}: экспорт CSV…`);
  const exportSql = `\\copy (SELECT * FROM public.${t}) TO '${posix}' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')\n`;
  const exportPath = path.join(backupDir, `_export_${t}.sql`);
  fs.writeFileSync(exportPath, exportSql, "utf8");
  execFileSync(psql, [localUrl, "-v", "ON_ERROR_STOP=1", "-f", exportPath], { stdio: "inherit" });

  console.log(`${t}: импорт на Render…`);
  const importSql = `\\copy public.${t} FROM '${posix}' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')\n`;
  const importPath = path.join(backupDir, `_import_${t}.sql`);
  fs.writeFileSync(importPath, importSql, "utf8");
  execFileSync(psql, [remoteUrl, "-v", "ON_ERROR_STOP=1", "-f", importPath], { stdio: "inherit" });

  try {
    fs.unlinkSync(csv);
    fs.unlinkSync(exportPath);
    fs.unlinkSync(importPath);
  } catch {
    /* ok */
  }
}

console.log("\nГотово.");
