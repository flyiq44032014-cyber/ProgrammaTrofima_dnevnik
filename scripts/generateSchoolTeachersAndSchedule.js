require("dotenv").config();
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const QUARTER = 4;
const MAX_DAILY = 6;
const LESSON_TIMES = { 1: "8:30", 2: "9:25", 3: "10:25", 4: "11:30", 5: "12:35", 6: "13:40", 7: "14:45" };
const CORE_SUBJECTS = ["Русский язык", "Математика", "Литература", "История", "Обществознание", "География", "Биология", "Иностранный язык", "Информатика", "Физика", "Химия", "Физическая культура", "Музыка", "Изобразительное искусство", "Труд", "Окружающий мир"];

const TEACHER_FIO = [
  "Соколова Виктория Павловна","Лебедева Алёна Михайловна","Зайцева Елена Станиславовна","Морозова Ольга Вадимовна","Новикова Марина Евгеньевна","Волкова Ирина Родионовна","Орлова Кристина Артёмовна","Григорьева София Игоревна","Попова Ульяна Фёдоровна","Соколова Вероника Тимофеевна","Киселёва Дарья Романовна","Беляева Арина Вячеславовна","Романова Пелагея Зиновьевна","Матвеева Элина Богдановна","Захарова Лидия Семёновна","Быкова Милана Никитична","Ермакова Арина Вадимовна","Симонова Кира Егоровна","Антонова Эмилия Савельевна","Комарова Аглая Филаретовна","Гаврилова Нонна Капитоновна","Наумова Фаина Макаровна","Данилова Злата Платоновна","Шестакова Ариадна Всеволодовна","Миронова Лариса Яковлевна","Титова Эсфирь Марковна","Осипова Клавдия Давыдовна","Полякова Раиса Корниловна","Жукова Тамара Афанасьевна","Блинова Любовь Степановна","Рябова Галина Леонтьевна","Кудрявцева Нина Геннадьевна","Агафонова Таисия Петровна","Малева Ева Станиславовна","Севостьянова Динара Ильинична","Ларионова Белла Артемовна","Пастухова Регина Осиповна","Уварова Мира Вениаминовна","Щербакова Лия Ефимовна","Воробьёва Зоя Матвеевна","Герасимова Ида Романовна","Давыдова Роза Глебовна","Ефремова Ника Емельяновна","Зимина Лия Саввична","Калашникова Влада Пантелеевна","Лискова Милица Тимофеевна","Мельникова Снежана Оскаровна","Назарова Ярослава Семёновна","Овчинникова Лада Вадимовна","Пирогова Кира Ефремовна","Родионова Аида Зиновьевна","Савицкая Этель Богдановна","Терехова Лада Капитоновна","Устинова Мира Фёдоровна","Фадеева Нонна Яковлевна","Хохлова Злата Всеволодовна","Чистякова Элина Платоновна","Шадрина Динара Никитична","Яковлева Ариадна Артёмовна","Белов Аркадий Петрович","Воронин Ефим Степанович","Гаврилов Зенон Леонтьевич","Демидов Игнатий Матвеевич","Ермолаев Капитон Романович","Жуков Иннокентий Саввич",
  "Иванова Елена Викторовна","Петрова Анна Сергеевна","Смирнова Ольга Петровна","Козлова Мария Александровна","Федорова Наталья Григорьевна","Михайлова Ирина Дмитриевна","Сидорова Татьяна Павловна","Лебедева Екатерина Ивановна","Васильева Светлана Константиновна","Кузнецова Елизавета Борисовна","Романова Валерия Андреевна","Морозова Дарья Николаевна","Новикова Арина Максимовна","Волкова Полина Денисовна","Орлова Ксения Сергеевна","Григорьева Юлия Олеговна","Попова Вероника Александровна","Козлов Владимир Игоревич","Михайлов Дмитрий Алексеевич","Григорьев Сергей Леонидович",
  "Белова Антонина Филипповна","Виноградова Рената Владимiровна","Дмитриева Вера Ефимовна","Егорова Маргарита Савельевна","Зиновьева Ксения Платоновна","Ильина Валентина Аркадьевна","Козлова Эвелина Тимофеевна","Лапина Яна Всеволодовна","Макарова Лиана Богдановна","Назарова Эльвира Капитоновна","Озерова Диана Романовна","Павлова Инна Матвеевна","Резникова Taisia Зиновьевна","Селиверстова Аэлита Геннадьевна","Тимофеева Нелли Олеговна","Успенская Жанна Петровна","Фролова Эльза Станиславовна","Хлопова Мира Ильинична","Чернова Лада Артемовна","Шаповалова Роза Осиповна","Щукина Влада Вениаминовна",
];

const GROUP_SUBJECTS = {
  philology: ["Русский язык", "Литература"],
  math: ["Математика", "Информатика"],
  social: ["История", "Обществознание"],
  nature: ["География", "Биология", "Окружающий мир"],
  science: ["Физика", "Химия"],
  lang: ["Иностранный язык"],
  pe: ["Физическая культура"],
  creative: ["Музыка", "Изобразительное искусство", "Труд"],
  general: ["Классный час"],
};

function roomTypeBySubject(s0) {
  const s = String(s0 || "").toLowerCase();
  if (s.includes("физическ")) return "gym";
  if (s.includes("хими")) return "chem";
  if (s.includes("физик")) return "phys";
  if (s.includes("информат")) return "it";
  if (s.includes("музык")) return "music";
  if (s.includes("изобраз")) return "art";
  if (s.includes("труд")) return "labor";
  return "regular";
}
function subjectGroup(s0) {
  const s = String(s0 || "").toLowerCase();
  if (s.includes("русск") || s.includes("литерат")) return "philology";
  if (s.includes("математ") || s.includes("информат")) return "math";
  if (s.includes("истор") || s.includes("обществ")) return "social";
  if (s.includes("географ") || s.includes("биолог") || s.includes("окружа")) return "nature";
  if (s.includes("физик") || s.includes("хими")) return "science";
  if (s.includes("иностран")) return "lang";
  if (s.includes("физическ")) return "pe";
  if (s.includes("музык") || s.includes("изобраз") || s.includes("труд")) return "creative";
  return "general";
}
function subjectsForGrade(grade) {
  if (grade <= 4) return ["Русский язык", "Математика", "Литература", "Окружающий мир", "Физическая культура", "Музыка", "Изобразительное искусство", "Труд"];
  if (grade <= 6) return ["Русский язык", "Математика", "Литература", "История", "География", "Биология", "Иностранный язык", "Информатика", "Физическая культура"];
  if (grade <= 8) return ["Русский язык", "Математика", "Литература", "История", "Обществознание", "География", "Биология", "Иностранный язык", "Информатика", "Физика", "Химия", "Физическая культура"];
  return ["Русский язык", "Математика", "Литература", "История", "Обществознание", "Биология", "Иностранный язык", "Информатика", "Физика", "Химия", "Физическая культура"];
}
function lessonsPerDay(grade) {
  if (grade <= 4) return 4;
  if (grade <= 8) return 5;
  return 6;
}
function buildBag(grade, n) {
  const sub = subjectsForGrade(grade);
  const bag = [];
  const add = (x, c) => { if (sub.includes(x)) for (let i = 0; i < c; i += 1) bag.push(x); };
  if (grade <= 4) { add("Русский язык", 4); add("Математика", 4); add("Литература", 3); add("Окружающий мир", 2); add("Физическая культура", 2); add("Музыка", 1); add("Изобразительное искусство", 1); add("Труд", 1); }
  else if (grade <= 6) { add("Русский язык", 4); add("Математика", 4); add("Литература", 3); add("История", 2); add("География", 2); add("Биология", 2); add("Иностранный язык", 3); add("Информатика", 2); add("Физическая культура", 2); }
  else if (grade <= 8) { add("Русский язык", 4); add("Математика", 4); add("Литература", 2); add("История", 2); add("Обществознание", 1); add("География", 2); add("Биология", 2); add("Иностранный язык", 3); add("Информатика", 2); add("Физика", 2); add("Химия", 2); add("Физическая культура", 2); }
  else { add("Русский язык", 3); add("Математика", 4); add("Литература", 2); add("История", 2); add("Обществознание", 2); add("Биология", 2); add("Иностранный язык", 3); add("Информатика", 2); add("Физика", 2); add("Химия", 2); add("Физическая культура", 2); }
  const p = ["Русский язык", "Математика", "Литература", "Иностранный язык", "История", "Биология"];
  let k = 0;
  while (bag.length < n) {
    if (sub.includes(p[k % p.length])) bag.push(p[k % p.length]);
    k += 1;
  }
  return bag.slice(0, n);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  const TARGET_TEACHERS = Math.max(1, Math.min(TEACHER_FIO.length, Number(process.env.TEACHER_COUNT || TEACHER_FIO.length)));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`ALTER TABLE director_quarter_schedule ADD COLUMN IF NOT EXISTS cabinet_label TEXT`);
    const hash = await bcrypt.hash("TeacherAuto2026", 10);

    await client.query(`DELETE FROM teacher_subjects WHERE teacher_user_id IN (SELECT id FROM users WHERE role='teacher')`);
    await client.query(`DELETE FROM users WHERE role='teacher'`);
    await client.query(`DELETE FROM director_quarter_schedule WHERE quarter = $1`, [QUARTER]);

    const activeFio = TEACHER_FIO.slice(0, TARGET_TEACHERS);
    const teacherIds = [];
    for (let i = 0; i < activeFio.length; i += 1) {
      const fio = activeFio[i].trim().split(/\s+/);
      const email = `auto.teacher.${String(i + 1).padStart(2, "0")}@school.local`;
      const ins = await client.query(
        `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
         VALUES ($1, $2, 'teacher', $3, $4, $5) RETURNING id`,
        [email, hash, fio[0] || "Учитель", fio[1] || "БезИмени", fio.slice(2).join(" ")]
      );
      teacherIds.push(Number(ins.rows[0].id));
    }

    const matrixCounts = [
      ["philology", 22], // Русский + Литература
      ["math", 14],      // Математика + Информатика
      ["lang", 10],      // Иностранный язык
      ["pe", 8],         // Физическая культура
      ["science", 8],    // Физика + Химия
      ["nature", 9],     // Биология + География + Окружающий мир
      ["social", 8],     // История + Обществознание
      ["creative", 6],   // Музыка + ИЗО + Труд
    ];
    const primaryGroupByTeacher = [];
    for (const [groupName, count] of matrixCounts) {
      for (let i = 0; i < count && primaryGroupByTeacher.length < teacherIds.length; i += 1) {
        primaryGroupByTeacher.push(groupName);
      }
    }
    // Base matrix for first 85 teachers.
    while (primaryGroupByTeacher.length < Math.min(85, teacherIds.length)) primaryGroupByTeacher.push("general");
    // Extra teachers: close current deficit first, then reinforce peak subjects.
    const extraSubjectPlan = [
      "Математика","Математика","Математика","Математика","Математика","Математика",
      "Литература","Литература","Биология",
      "Русский язык","Русский язык","Русский язык","Русский язык",
      "Иностранный язык","Иностранный язык","Иностранный язык",
      "Физическая культура","Физическая культура",
      "Математика","Русский язык","Литература",
    ];
    for (let i = primaryGroupByTeacher.length; i < teacherIds.length; i += 1) {
      const subj = extraSubjectPlan[i - primaryGroupByTeacher.length] || "Математика";
      primaryGroupByTeacher.push(subjectGroup(subj));
    }

    for (let i = 0; i < teacherIds.length; i += 1) {
      const tid = teacherIds[i];
      const group = primaryGroupByTeacher[i] || "general";
      const allowed = GROUP_SUBJECTS[group] || ["Классный час"];
      for (const s of allowed) {
        await client.query(
          `INSERT INTO teacher_subjects (teacher_user_id, subject_name)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [tid, s]
        );
      }
      if (i >= 85) {
        const subj = extraSubjectPlan[i - 85] || "Математика";
        await client.query(
          `INSERT INTO teacher_subjects (teacher_user_id, subject_name)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [tid, subj]
        );
      }
    }

    // Secondary competencies to absorb peaks.
    const teacherIdsByGroup = new Map();
    for (let i = 0; i < teacherIds.length; i += 1) {
      const g = primaryGroupByTeacher[i] || "general";
      if (!teacherIdsByGroup.has(g)) teacherIdsByGroup.set(g, []);
      teacherIdsByGroup.get(g).push(teacherIds[i]);
    }
    const reserveRules = [
      ["social", "Русский язык", 4],
      ["nature", "Иностранный язык", 2],
      ["creative", "Физическая культура", 2],
      ["science", "Математика", 2],
    ];
    for (const [fromGroup, subjectName, count] of reserveRules) {
      const ids = teacherIdsByGroup.get(fromGroup) || [];
      for (let i = 0; i < Math.min(count, ids.length); i += 1) {
        await client.query(
          `INSERT INTO teacher_subjects (teacher_user_id, subject_name)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [ids[i], subjectName]
        );
      }
    }

    const classRows = await client.query(`SELECT id, grade FROM school_classes ORDER BY grade, id`);
    const classRoomMap = new Map();
    classRows.rows.forEach((r, idx) => classRoomMap.set(String(r.id), `Каб. ${101 + idx}`));
    const roomPools = {
      gym: ["Спортзал"],
      chem: ["Лаб. химии 301", "Лаб. химии 302"],
      phys: ["Лаб. физики 311", "Лаб. физики 312"],
      it: ["Каб. информатики 201", "Каб. информатики 202"],
      music: ["Каб. музыки 401"],
      art: ["Каб. ИЗО 402"],
      labor: ["Мастерская 403"],
    };

    const ts = await client.query(`SELECT teacher_user_id, subject_name FROM teacher_subjects ORDER BY teacher_user_id`);
    const teachersBySubject = new Map();
    const allTeachers = [];
    for (const r of ts.rows) {
      const tid = Number(r.teacher_user_id);
      const sub = String(r.subject_name || "").toLowerCase();
      if (!teachersBySubject.has(sub)) teachersBySubject.set(sub, []);
      teachersBySubject.get(sub).push(tid);
      if (!allTeachers.includes(tid)) allTeachers.push(tid);
    }

    const planned = [];
    const slotSubLoad = new Map();
    for (const c of classRows.rows) {
      const classId = String(c.id);
      const grade = Number(c.grade || 0);
      const perDay = lessonsPerDay(grade);
      const bag = buildBag(grade, perDay * 5);
      const left = new Map();
      bag.forEach((s) => left.set(s, (left.get(s) || 0) + 1));
      for (let d = 0; d < 5; d += 1) {
        let prev = "";
        for (let l = 1; l <= perDay; l += 1) {
          const slot = `${d}:${l}`;
          const cand = [...left.entries()].filter(([s, n]) => n > 0 && s !== prev);
          if (!cand.length) {
            const any = [...left.entries()].filter(([, n]) => n > 0);
            if (!any.length) break;
            cand.push(any[0]);
          }
          cand.sort((a, b) => ((slotSubLoad.get(`${slot}|${a[0]}`) || 0) - (slotSubLoad.get(`${slot}|${b[0]}`) || 0)) || (b[1] - a[1]));
          const subject = cand[0][0];
          left.set(subject, (left.get(subject) || 0) - 1);
          slotSubLoad.set(`${slot}|${subject}`, (slotSubLoad.get(`${slot}|${subject}`) || 0) + 1);
          prev = subject;
          planned.push({ classId, weekday: d, order: l, subject, timeLabel: LESSON_TIMES[l] || "" });
        }
      }
    }

    const busyTeacher = new Set();
    const busyRoom = new Set();
    const dayLoad = new Map();
    const weekLoad = new Map();
    let inserted = 0;
    let noTeacher = 0;
    let noRoom = 0;
    for (const it of planned) {
      const slot = `${it.weekday}:${it.order}`;
      const subKey = String(it.subject).toLowerCase();
      const poolT = teachersBySubject.get(subKey) || allTeachers;
      let teacherId = null;
      for (const tid of poolT) {
        const tk = `${slot}|${tid}`;
        const dk = `${tid}|${it.weekday}`;
        if (busyTeacher.has(tk)) continue;
        if ((dayLoad.get(dk) || 0) >= MAX_DAILY) continue;
        teacherId = tid;
        busyTeacher.add(tk);
        dayLoad.set(dk, (dayLoad.get(dk) || 0) + 1);
        weekLoad.set(tid, (weekLoad.get(tid) || 0) + 1);
        break;
      }
      if (teacherId == null) noTeacher += 1;

      const rt = roomTypeBySubject(it.subject);
      let room = null;
      if (rt === "regular") {
        const fixed = classRoomMap.get(it.classId) || "Каб. 199";
        const rk = `${slot}|${fixed}`;
        if (!busyRoom.has(rk)) { room = fixed; busyRoom.add(rk); }
        else {
          for (const alt of classRoomMap.values()) {
            const ak = `${slot}|${alt}`;
            if (!busyRoom.has(ak)) { room = alt; busyRoom.add(ak); break; }
          }
        }
      } else {
        for (const rr of roomPools[rt] || []) {
          const rk = `${slot}|${rr}`;
          if (!busyRoom.has(rk)) { room = rr; busyRoom.add(rk); break; }
        }
        if (!room) {
          const fallback = classRoomMap.get(it.classId) || "Каб. 199";
          const fk = `${slot}|${fallback}`;
          if (!busyRoom.has(fk)) { room = fallback; busyRoom.add(fk); }
        }
      }
      if (!room) noRoom += 1;

      await client.query(
        `INSERT INTO director_quarter_schedule
         (class_id, quarter, weekday_idx, lesson_order, subject_name, teacher_user_id, time_label, cabinet_label)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [it.classId, QUARTER, it.weekday, it.order, it.subject, teacherId, it.timeLabel, room]
      );
      inserted += 1;
    }

    const teacherConflicts = await client.query(`SELECT COUNT(*)::int AS c FROM (
      SELECT teacher_user_id, weekday_idx, lesson_order
      FROM director_quarter_schedule
      WHERE quarter=$1 AND teacher_user_id IS NOT NULL
      GROUP BY teacher_user_id, weekday_idx, lesson_order
      HAVING COUNT(*) > 1
    ) q`, [QUARTER]);
    const roomConflicts = await client.query(`SELECT COUNT(*)::int AS c FROM (
      SELECT cabinet_label, weekday_idx, lesson_order
      FROM director_quarter_schedule
      WHERE quarter=$1 AND cabinet_label IS NOT NULL AND trim(cabinet_label) <> ''
      GROUP BY cabinet_label, weekday_idx, lesson_order
      HAVING COUNT(*) > 1
    ) q`, [QUARTER]);

    await client.query("COMMIT");
    const loads = teacherIds.map((id) => weekLoad.get(id) || 0).sort((a, b) => a - b);
    const sum = loads.reduce((acc, x) => acc + x, 0);
    const avg = loads.length ? (sum / loads.length) : 0;
    const p50 = loads.length ? loads[Math.floor(loads.length / 2)] : 0;
    const p90 = loads.length ? loads[Math.floor(loads.length * 0.9)] : 0;
    console.log(`Teachers created from pool: ${activeFio.length}`);
    console.log(`Target teachers requested: ${TARGET_TEACHERS}`);
    console.log(`Schedule rows inserted (Q${QUARTER}): ${inserted}`);
    console.log(`Teacher hard conflicts: ${Number(teacherConflicts.rows[0]?.c || 0)}`);
    console.log(`Room hard conflicts: ${Number(roomConflicts.rows[0]?.c || 0)}`);
    console.log(`Unassigned teacher slots: ${noTeacher}`);
    console.log(`Unassigned room slots: ${noRoom}`);
    console.log(`Teacher weekly load min/avg/p50/p90/max: ${loads[0] || 0}/${avg.toFixed(2)}/${p50}/${p90}/${loads[loads.length - 1] || 0}`);
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

