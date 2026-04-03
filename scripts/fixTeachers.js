require("dotenv").config();
const { Pool } = require("pg");

const NAMES = [
  "Иванова Елена Викторовна",
  "Петрова Анна Сергеевна",
  "Смирнова Ольга Петровна",
  "Козлова Мария Александровна",
  "Федорова Наталья Григорьевна",
  "Михайлова Ирина Дмитриевна",
  "Сидорова Татьяна Павловна",
  "Лебедева Екатерина Ивановна",
  "Васильева Светлана Константиновна",
  "Кузнецова Елизавета Борисовна",
  "Романова Валерия Андреевна",
  "Морозова Дарья Николаевна",
  "Новикова Арина Максимовна",
  "Волкова Полина Денисовна",
  "Орлова Ксения Сергеевна",
  "Григорьева Юлия Олеговна",
  "Попова Вероника Александровна",
  "Козлов Владимир Игоревич",
  "Михайлов Дмитрий Алексеевич",
  "Григорьев Сергей Леонидович",
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM users WHERE email IN ('teacher.rus@school.local', 'teacher.math@school.local')`
    );
    for (let i = 0; i < NAMES.length; i += 1) {
      const email = `auto.teacher.${String(i + 1).padStart(2, "0")}@school.local`;
      const parts = NAMES[i].trim().split(/\s+/);
      const lastName = parts[0] || "";
      const firstName = parts[1] || "";
      const patronymic = parts.slice(2).join(" ");
      await client.query(
        `UPDATE users SET last_name = $1, first_name = $2, patronymic = $3 WHERE email = $4`,
        [lastName, firstName, patronymic, email]
      );
    }
    await client.query("COMMIT");
    const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'teacher'`);
    console.log("teachers_after", rows[0].c);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

