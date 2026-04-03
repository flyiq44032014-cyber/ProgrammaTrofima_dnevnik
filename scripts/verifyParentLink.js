/* One-off diagnostics: node scripts/verifyParentLink.js [email] */
require("dotenv").config();
const { Pool } = require("pg");

const email = process.argv[2] || "latsin.parent@school.local";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const u = await pool.query(
      "SELECT id, email FROM users WHERE lower(email) = lower($1)",
      [email]
    );
    console.log("user", u.rows);
    if (!u.rows[0]) return;
    const uid = u.rows[0].id;
    const upc = await pool.query(
      `SELECT id, student_id, last_name, first_name, patronymic, class_label
       FROM user_parent_children WHERE user_id = $1 ORDER BY sort_order, id`,
      [uid]
    );
    console.log("user_parent_children", upc.rows);
    const lat = await pool.query(
      `SELECT id, name, class_label, class_schedule_id FROM students
       WHERE name ILIKE $1 OR name ILIKE $2
       ORDER BY id`,
      ["%Лацин%", "%Laцин%"]
    );
    console.log("students_like_lat", lat.rows);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
