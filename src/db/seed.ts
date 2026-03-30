import "dotenv/config";
import bcrypt from "bcrypt";
import type { PoolClient } from "pg";
import fs from "fs";
import path from "path";
import {
  buildClassDiaries,
  buildRosters,
  schoolClassesMeta,
} from "../data/teacherSeedData";
import { getSeedSnapshot } from "../data/mock";
import { closePool, getPool } from "./pool";

async function seedTeacherTables(c: PoolClient): Promise<void> {
  const rosters = buildRosters();
  const diaries = buildClassDiaries();
  for (const cl of schoolClassesMeta) {
    await c.query(
      `INSERT INTO school_classes (id, grade, label, subject_name) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET grade = EXCLUDED.grade, label = EXCLUDED.label, subject_name = EXCLUDED.subject_name`,
      [cl.id, cl.grade, cl.label, cl.subjectName]
    );
  }
  await c.query(`DELETE FROM class_roster WHERE class_id = ANY($1::text[])`, [
    schoolClassesMeta.map((x) => x.id),
  ]);
  for (const cl of schoolClassesMeta) {
    const names = rosters[cl.id] ?? [];
    for (let i = 0; i < names.length; i++) {
      await c.query(
        `INSERT INTO class_roster (class_id, full_name, sort_order) VALUES ($1, $2, $3)`,
        [cl.id, names[i], i]
      );
    }
  }
  await c.query(`DELETE FROM class_diary_lessons WHERE class_id = ANY($1::text[])`, [
    schoolClassesMeta.map((x) => x.id),
  ]);
  await c.query(`DELETE FROM class_diary_days WHERE class_id = ANY($1::text[])`, [
    schoolClassesMeta.map((x) => x.id),
  ]);
  for (const cl of schoolClassesMeta) {
    const byDate = diaries[cl.id];
    if (!byDate) continue;
    for (const [, day] of Object.entries(byDate)) {
      await c.query(
        `INSERT INTO class_diary_days (class_id, date_iso, weekday, month_genitive, year)
         VALUES ($1, $2::date, $3, $4, $5)`,
        [cl.id, day.date, day.weekday, day.monthGenitive, day.year]
      );
      for (const les of day.lessons) {
        await c.query(
          `INSERT INTO class_diary_lessons (
             class_id, date_iso, lesson_order, lesson_key, title, time_label, grade,
             teacher, topic, homework, control_work, place, homework_next, blocks_json
           ) VALUES (
             $1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb
           )`,
          [
            cl.id,
            day.date,
            les.order,
            les.id,
            les.title,
            les.timeLabel,
            les.grade ?? null,
            les.teacher ?? null,
            les.topic ?? null,
            les.homework ?? null,
            les.controlWork ?? null,
            les.place ?? null,
            les.homeworkNext ?? null,
            les.blocks && les.blocks.length ? JSON.stringify(les.blocks) : null,
          ]
        );
      }
    }
  }
}

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("Задайте DATABASE_URL в .env");
    process.exit(1);
  }
  const pool = getPool();
  const schemaPath = path.join(process.cwd(), "src", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);
  const schemaTeacherPath = path.join(process.cwd(), "src", "db", "schema_teacher.sql");
  await pool.query(fs.readFileSync(schemaTeacherPath, "utf8"));

  const snap = getSeedSnapshot();

  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("TRUNCATE students CASCADE");
    await c.query("TRUNCATE school_classes CASCADE");

    await seedTeacherTables(c);

    for (const s of snap.children) {
      const cs =
        "classScheduleId" in s && s.classScheduleId
          ? s.classScheduleId
          : null;
      await c.query(
        `INSERT INTO students (id, name, class_label, class_schedule_id) VALUES ($1, $2, $3, $4)`,
        [s.id, s.name, s.classLabel, cs]
      );
    }

    for (const [childId, byDate] of Object.entries(snap.diaryByChild)) {
      for (const [, day] of Object.entries(byDate)) {
        await c.query(
          `INSERT INTO diary_days (child_id, date_iso, weekday, month_genitive, year)
           VALUES ($1, $2::date, $3, $4, $5)`,
          [childId, day.date, day.weekday, day.monthGenitive, day.year]
        );
        for (const les of day.lessons) {
          await c.query(
            `INSERT INTO diary_lessons (
               child_id, date_iso, lesson_order, lesson_key, title, time_label, grade,
               teacher, topic, homework, control_work, place, homework_next, blocks_json
             ) VALUES (
               $1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb
             )`,
            [
              childId,
              day.date,
              les.order,
              les.id,
              les.title,
              les.timeLabel,
              les.grade ?? null,
              les.teacher ?? null,
              les.topic ?? null,
              les.homework ?? null,
              les.controlWork ?? null,
              les.place ?? null,
              les.homeworkNext ?? null,
              les.blocks && les.blocks.length ? JSON.stringify(les.blocks) : null,
            ]
          );
        }
      }
    }

    for (const [childId, perf] of Object.entries(snap.performanceByChild)) {
      const finalsYear = snap.finalsByChild[childId]?.yearLabel ?? "2025/2026";
      await c.query(
        `INSERT INTO performance_meta (
           child_id, trimester_label, date_label, day_num, weekday, month_genitive, year, finals_year_label
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          childId,
          perf.trimesterLabel,
          perf.dateLabel,
          perf.dayNum,
          perf.weekday,
          perf.monthGenitive,
          perf.year,
          finalsYear,
        ]
      );
      for (let i = 0; i < perf.rows.length; i++) {
        const row = perf.rows[i];
        await c.query(
          `INSERT INTO performance_rows (
             child_id, subject_id, subject_name, student_avg, class_avg, parallel_avg, sort_order
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            childId,
            row.subjectId,
            row.subjectName,
            row.studentAvg,
            row.classAvg,
            row.parallelAvg,
            i,
          ]
        );
      }
    }

    for (const [childId, rows] of Object.entries(snap.gradeHistorySummary)) {
      for (const g of rows) {
        await c.query(
          `INSERT INTO grade_history_summary (child_id, date_iso, date_display, grades_json)
           VALUES ($1, $2::date, $3, $4::jsonb)`,
          [childId, g.date, g.dateDisplay, JSON.stringify(g.grades)]
        );
      }
    }

    for (const [childId, byDate] of Object.entries(snap.gradeHistoryDetail)) {
      for (const [, detail] of Object.entries(byDate)) {
        await c.query(
          `INSERT INTO grade_history_detail (child_id, date_iso, items_json)
           VALUES ($1, $2::date, $3::jsonb)`,
          [childId, detail.date, JSON.stringify(detail.items)]
        );
      }
    }

    for (const [childId, bySubj] of Object.entries(snap.gradeHistoryBySubject)) {
      for (const [subjectId, dayRows] of Object.entries(bySubj)) {
        for (const g of dayRows) {
          await c.query(
            `INSERT INTO grade_history_by_subject (child_id, subject_id, date_iso, date_display, grades_json)
             VALUES ($1, $2, $3::date, $4, $5::jsonb)`,
            [childId, subjectId, g.date, g.dateDisplay, JSON.stringify(g.grades)]
          );
        }
      }
    }

    for (const [childId, finals] of Object.entries(snap.finalsByChild)) {
      for (let i = 0; i < finals.rows.length; i++) {
        const r = finals.rows[i];
        await c.query(
          `INSERT INTO finals (child_id, subject, t1, t2, t3, year_grade, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            childId,
            r.subject,
            r.t1 ?? null,
            r.t2 ?? null,
            r.t3 ?? null,
            r.year ?? null,
            i,
          ]
        );
      }
    }

    const demoUsersEnabled = process.env.SEED_DEMO_USERS === "1";
    if (demoUsersEnabled) {
      await c.query(`DELETE FROM users`);
      await c.query(
        `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
         VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12)`,
        [
          "roditel@yandex.ru",
          bcrypt.hashSync("1234", 10),
          "parent",
          "Демо",
          "Родитель",
          "",
          "uchitel@yandex.ru",
          bcrypt.hashSync("0987", 10),
          "teacher",
          "Демо",
          "Учитель",
          "",
        ]
      );
    } else {
      console.log(
        "Демо-пользователи в БД не добавлены: установи SEED_DEMO_USERS=1 при запуске db:seed"
      );
    }

    await c.query("COMMIT");
    console.log(
      "База заполнена: students, дневник, успеваемость, оценки, итоговые, классы учителя."
    );
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
  await closePool();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
