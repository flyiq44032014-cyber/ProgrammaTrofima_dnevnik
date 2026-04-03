const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString:
      "postgresql://neondb_owner:npg_42dNjPpOovHF@ep-steep-block-ago8y8cz-pooler.c-2.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require",
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const kids = [
    { id: "stu-3a-1", grade: 3, roomRus: "Каб. 101", roomMath: "Каб. 102" },
    { id: "stu-6b-1", grade: 6, roomRus: "Каб. 201", roomMath: "Каб. 202" },
  ];
  const weekdays = [
    "воскресенье",
    "понедельник",
    "вторник",
    "среда",
    "четверг",
    "пятница",
    "суббота",
  ];

  try {
    for (const kid of kids) {
      for (
        let d = new Date("2026-03-01T12:00:00");
        d <= new Date("2026-03-31T12:00:00");
        d.setDate(d.getDate() + 1)
      ) {
        const date = new Date(d);
        const iso = date.toISOString().slice(0, 10);
        const w = date.getDay();

        await client.query(
          "INSERT INTO diary_days (child_id, date_iso, weekday, month_genitive, year) VALUES ($1, $2::date, $3, $4, 2026) ON CONFLICT (child_id, date_iso) DO UPDATE SET weekday = EXCLUDED.weekday, month_genitive = EXCLUDED.month_genitive, year = EXCLUDED.year",
          [kid.id, iso, weekdays[w], "марта"]
        );

        await client.query(
          "DELETE FROM diary_lessons WHERE child_id = $1 AND date_iso = $2::date",
          [kid.id, iso]
        );

        if (w === 0 || w === 6) {
          await client.query(
            "INSERT INTO diary_lessons (child_id, date_iso, lesson_order, lesson_key, title, time_label, grade, teacher, topic, homework, control_work, place, homework_next, blocks_json) VALUES ($1, $2::date, 1, $3, 'Классный час', '10:00-10:30', NULL, 'Куратор класса', 'Внеурочная деятельность', NULL, NULL, 'Каб. 100', NULL, NULL)",
            [kid.id, iso, "weekend-" + iso]
          );
          continue;
        }

        const rusGrade = ((date.getDate() + kid.grade + 1) % 3) + 3;
        const mathGrade = ((date.getDate() + kid.grade) % 3) + 3;

        await client.query(
          "INSERT INTO diary_lessons (child_id, date_iso, lesson_order, lesson_key, title, time_label, grade, teacher, topic, homework, control_work, place, homework_next, blocks_json) VALUES ($1, $2::date, 1, $3, 'Русский язык', '08:30-09:15', $4, 'Петрова А.И.', $5, $6, NULL, $7, NULL, NULL), ($1, $2::date, 2, $8, 'Математика', '09:25-10:10', $9, 'Иванов С.П.', $10, $11, NULL, $12, NULL, NULL)",
          [
            kid.id,
            iso,
            "rus-" + iso,
            rusGrade,
            "Тема дня " + date.getDate(),
            "Упр. " + (10 + date.getDate()),
            kid.roomRus,
            "math-" + iso,
            mathGrade,
            "Счет и задачи " + date.getDate(),
            "№ " + (200 + date.getDate()),
            kid.roomMath,
          ]
        );
      }
    }

    const days = await client.query(
      "SELECT child_id, COUNT(*)::int AS days FROM diary_days WHERE child_id IN ('stu-3a-1','stu-6b-1') AND date_iso BETWEEN '2026-03-01'::date AND '2026-03-31'::date GROUP BY child_id ORDER BY child_id"
    );
    const lessons = await client.query(
      "SELECT child_id, COUNT(*)::int AS lessons FROM diary_lessons WHERE child_id IN ('stu-3a-1','stu-6b-1') AND date_iso BETWEEN '2026-03-01'::date AND '2026-03-31'::date GROUP BY child_id ORDER BY child_id"
    );
    console.log("days:", days.rows);
    console.log("lessons:", lessons.rows);
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

