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
const remoteUrl = renderExternalUrl(process.env.DATABASE_URL);
if (!localUrl || !process.env.DATABASE_URL) {
  console.error("Нужны LOCAL_DATABASE_URL и DATABASE_URL");
  process.exit(1);
}

const backupDir = path.join(__dirname, "..", "backups");
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const toPosix = (p) => p.replace(/\\/g, "/");

const tables = [
  "user_parent_children",
  "teacher_subjects",
  "director_quarter_schedule",
  "class_diary_days",
  "class_diary_lessons",
];

const CHUNK_DATA_LINES = 80;

function splitCsvIntoChunks(fullCsvPath, chunkDir, baseName) {
  const text = fs.readFileSync(fullCsvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const header = lines[0];
  const data = lines.slice(1);
  const parts = [];
  for (let i = 0; i < data.length; i += CHUNK_DATA_LINES) {
    const chunkLines = [header, ...data.slice(i, i + CHUNK_DATA_LINES)];
    const partPath = path.join(chunkDir, `${baseName}_part_${parts.length}.csv`);
    fs.writeFileSync(partPath, chunkLines.join("\n") + "\n", "utf8");
    parts.push(partPath);
  }
  return parts;
}

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
  const posixFull = toPosix(csv);
  console.log(`\n${t}: экспорт…`);
  const exportSql = `\\copy (SELECT * FROM public.${t}) TO '${posixFull}' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')\n`;
  const exportPath = path.join(backupDir, `_exp_${t}.sql`);
  fs.writeFileSync(exportPath, exportSql, "utf8");
  execFileSync(psql, [localUrl, "-v", "ON_ERROR_STOP=1", "-f", exportPath], { stdio: "inherit" });

  const chunks = splitCsvIntoChunks(csv, backupDir, t);
  console.log(`${t}: импорт ${chunks.length} частей…`);
  for (let i = 0; i < chunks.length; i++) {
    const cp = chunks[i];
    const imp = `\\copy public.${t} FROM '${toPosix(cp)}' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')\n`;
    const impPath = path.join(backupDir, `_imp_${t}_${i}.sql`);
    fs.writeFileSync(impPath, imp, "utf8");
    let attempt = 0;
    while (attempt < 5) {
      try {
        execFileSync(psql, [remoteUrl, "-v", "ON_ERROR_STOP=1", "-f", impPath], { stdio: "inherit" });
        break;
      } catch (e) {
        attempt++;
        console.warn(`retry ${attempt} part ${i + 1}/${chunks.length}`);
        if (attempt >= 5) throw e;
        require("child_process").execFileSync("powershell", [
          "-Command",
          "Start-Sleep -Seconds " + String(2 * attempt),
        ]);
      }
    }
    try {
      fs.unlinkSync(cp);
      fs.unlinkSync(impPath);
    } catch {
      /* ok */
    }
  }
  try {
    fs.unlinkSync(csv);
    fs.unlinkSync(exportPath);
  } catch {
    /* ok */
  }
}

console.log("\nГотово.");
