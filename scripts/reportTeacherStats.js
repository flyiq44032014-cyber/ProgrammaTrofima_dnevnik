require("dotenv").config();
const { Pool } = require("pg");

async function main() {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const total = await p.query("select count(*)::int as c from users where role='teacher'");
  const sched = await p.query("select count(*)::int as c from director_quarter_schedule where quarter=4");
  const nulls = await p.query("select count(*)::int as c from director_quarter_schedule where quarter=4 and teacher_user_id is null");
  const bySubj = await p.query(
    `select subject_name, count(*)::int as c
     from director_quarter_schedule
     where quarter=4 and teacher_user_id is null
     group by subject_name
     order by c desc, subject_name`
  );
  const slotSubj = await p.query(
    `select subject_name, max(c)::int as max_parallel_missing
     from (
       select subject_name, weekday_idx, lesson_order, count(*)::int as c
       from director_quarter_schedule
       where quarter=4 and teacher_user_id is null
       group by subject_name, weekday_idx, lesson_order
     ) t
     group by subject_name
     order by max_parallel_missing desc, subject_name`
  );
  const loads = await p.query(
    `select
       u.id,
       trim(concat_ws(' ', u.last_name, u.first_name, nullif(u.patronymic, ''))) as fio,
       count(s.*)::int as load
     from users u
     left join director_quarter_schedule s
       on s.teacher_user_id = u.id and s.quarter = 4
     where u.role = 'teacher'
     group by u.id, fio
     order by load desc, fio asc`
  );

  const arr = loads.rows.map((r) => Number(r.load));
  const sum = arr.reduce((a, b) => a + b, 0);
  const avg = arr.length ? sum / arr.length : 0;
  const med = arr.length ? arr[Math.floor(arr.length / 2)] : 0;
  const p90 = arr.length ? arr[Math.floor(arr.length * 0.9)] : 0;

  console.log("teachers_total", total.rows[0].c);
  console.log("schedule_rows", sched.rows[0].c);
  console.log("teacher_unassigned", nulls.rows[0].c);
  console.log("load_min_avg_med_p90_max", arr[arr.length - 1] || 0, avg.toFixed(2), med, p90, arr[0] || 0);
  console.log("top10_loads", JSON.stringify(loads.rows.slice(0, 10), null, 2));
  console.log("unassigned_by_subject", JSON.stringify(bySubj.rows, null, 2));
  console.log("max_parallel_missing_by_subject", JSON.stringify(slotSubj.rows, null, 2));
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

