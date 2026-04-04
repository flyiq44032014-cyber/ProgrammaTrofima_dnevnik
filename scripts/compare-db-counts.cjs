"use strict";
/** Сравнение числа строк по ключевым таблицам: локаль vs Render (.env). */
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

const local = process.env.LOCAL_DATABASE_URL;
const remote = renderExternalUrl(process.env.DATABASE_URL);
const tables = [
  "user_parent_children",
  "teacher_subjects",
  "director_quarter_schedule",
  "class_diary_lessons",
  "class_diary_days",
  "school_classes",
  "grade_history_by_subject",
  "grade_history_detail",
  "grade_history_summary",
  "finals",
  "performance_rows",
  "performance_meta",
  "students",
  "users",
];
async function counts(url, useSsl) {
  const c = new Client(
    useSsl ? { connectionString: url, ssl: { rejectUnauthorized: false } } : { connectionString: url }
  );
  await c.connect();
  const out = {};
  for (const t of tables) {
    try {
      const r = await c.query(`SELECT count(*)::int AS n FROM ${t}`);
      out[t] = r.rows[0].n;
    } catch (e) {
      out[t] = "ERR: " + e.message;
    }
  }
  const r2 = await c.query(`SELECT count(*)::int AS n FROM students WHERE class_schedule_id IS NOT NULL`);
  out.students_with_schedule = r2.rows[0].n;
  await c.end();
  return out;
}
(async () => {
  if (!local || !remote) {
    console.error("Нужны LOCAL_DATABASE_URL и DATABASE_URL в .env");
    process.exit(1);
  }
  const L = await counts(local, false);
  const R = await counts(remote, true);
  console.log(JSON.stringify({ local: L, remote: R }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
