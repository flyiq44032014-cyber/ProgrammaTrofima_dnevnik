import { closePool, getPool } from "./pool";

type StudentRow = {
  id: string;
  name: string;
  class_id: string;
};

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeSurnameEntry(value: string): string {
  const latinToCyr: Record<string, string> = {
    A: "А",
    B: "В",
    C: "С",
    E: "Е",
    H: "Н",
    K: "К",
    M: "М",
    O: "О",
    P: "Р",
    T: "Т",
    X: "Х",
    Y: "У",
    a: "а",
    c: "с",
    e: "е",
    h: "н",
    k: "к",
    m: "м",
    o: "о",
    p: "р",
    r: "р",
    t: "т",
    x: "х",
    y: "у",
    z: "з",
    i: "и",
    n: "н",
    v: "в",
    l: "л",
    s: "с",
  };
  const fixed = normalizeSpaces(value)
    .split("")
    .map((ch) => latinToCyr[ch] ?? ch)
    .join("")
    .replace(/[^А-Яа-яЁё-]/g, "");
  if (!fixed) return "";
  return fixed.charAt(0).toUpperCase() + fixed.slice(1).toLowerCase();
}

function buildSurnames400(): string[] {
  const raw = `
Абросимов Авдеев Агапов Аксёнов Алейников Аникушин Антropов Артамонов Архангельский Астафьев Афанасьев
Бабушкин Баранов Барков Басов Безбородько Белашов Белозёров Береzin Бespалов Бирюков Блинов Бобров Богданов
Болотов Бородачёв Боровик Бортников Бочаров Брызгалов Булавин Буянов Быков Вавилов Вакуленко Валяев Варламов
Васнецов Веденяпин Векшин Верещагин Веселов Виноградов Витковский Власов Волобуев Волынский Воробьёв Воронов
Всеволожский Гаврилов Гайдаров Галибин Гальцев Гавриш Гвоздев Гладышев Гладков Горбачёв Гордеев Горлов Горшков
Грачёв Грибанов Гриднев Громов Губанов Гудков Дадонов Дегтярёв Демидов Денисов Дерябин Дзюба Долгов Долматов
Домнин Дорохин Доронов Дравин Дружинин Дубинин Дудин Дыбов Дятлов Евдокимов Ежов Елагин Елизаров Елкин Ермаков
Ершов Жаров Жданов Жилин Жуков Журавлёв Забелин Завьялов Зайцев Ивановский Игнатов Ильин Иноземцев Ипатов
Искра Кabanov Козлов Калганов Камнев Караулов Карпов Киселёв Клобуков Ковальский Кожевников Колесников Колобков
Комаров Коновалов Кораблёв Коржаков Кормилов Коробейников Коровин Корытин Котельников Кочетов Кравцов Кремнёв
Кривошеев Кривцов Кудрявцев Кузмин Кулагин Куликов Куманин Курочкин Кутузов Лавров Лазарёв Лацин Лебедев Легков
Лемешов Ленский Лесков Ливанов Лихачёв Лобанов Магомедов Макеев Малаков Малинкин Малков Мамонтов Манцов Мартынов
Маслов Матвеев Махов Мещеринов Мигунов Милованов Миронов Миславский Мичурин Молчанов Моргунов Морозов Мосин
Мостовой Муравьёв Мухин Назаров Найдёнов Наливайко Нарышкин Наумов Нефедов Некрасов Немиров Нестеров Никифоров
Никитин Никонов Нилов Новиков Ногин Носов Оборин Овчинников Огурцов Озеров Окунев Олексеев Оленьев Орехов Павлов
Палий Панин Парамонов Перепёлкин Пестов Петриков Платонов Плотников Подгорный Подобедов Подшивалов Поздеев Полозов
Полtev Понкратов Поплавский Порываев Потапов Потёмкин Похабов Прасолов Предтеченский Прибылов Приходько Прокофьев
Проньшин Пудовкин Пузанов Пустоветов Радин Радостин Разумов Рамазанов Ратманов Рахманов Ребров Ревякин Ремизов
Ренёв Родионов Розанов Романовский Рубцов Рудаков Рябов Ряполов Сабанеев Савватеев Садовников Сазонов Салтыков
Самарин Самсонов Санин Сапегин Саркисов Сахаров Сварог Северов Селезнёв Семёнов Сердюков Серебренников Сидоров
Сизов Силаев Силин Слесарев Слободкин Смирновский Снегирёв Собакин Соболев Соколовский Солнцев Сомов Сосновский
Сотников Стариков Стебунов Стрельцов Струков Субботин Судаков Сухарев Сухов Сычёв Табаков Талызин Тархов Татаренков
Тверитинов Тверской Тебеньков Телицын Темирьазев Терёхин Тесленко Тетерин Уваров Угаров Угрюмов Удалов Уланский
Улыбышев Урлашов Уткин Фадеев Фалалеев Федосеев Федотов Филатов Филимонов Фирсов Флёров Фокин Форостов Хабаров
Халтурин Хлебников Хмелёв Ховрин Хохлов Худяков Царев Цветков Цыбин Чагина Чайкин Черепанов Черкасов Чернов
Чесноков Чижов Чистяков Чубаров Шабанов Шадрин Шахов Швецов Шелагуров Шемякин Шеншин Шереметев Шестаков Шилов
Шишов Шмелёв Щеголев Щербаков Щукин Энгельгардт Югов Юдин Юматов Юрков Яблоков Яковлев Якушев Яновский Яраславцев
Ярцев Ястребов Яшнев Багров Бакланов Балашов Барановский Башкиров Белкин Берсенев Бессонoв Блиновский Брызгалёв
Веденeeв Веретенников Вихров Воронцов Гавшин Глотов Гневышев Голубев Горбунов Дашков Двинских Долбилов Драчёв
Егоров Жеглов Зимин Зорин Зыков Измайлов Камышев Квашнин Лапин Лебяжьев Мезенцев Мятлев
  `;

  const words = raw.split(/\s+/).map((x) => normalizeSurnameEntry(x)).filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const surname of words) {
    const key = surname.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(surname);
    if (unique.length === 400) break;
  }
  if (unique.length < 400) {
    const reserve = [
      "Абрамов",
      "Васильев",
      "Горелов",
      "Демьянов",
      "Ефремов",
      "Захаров",
      "Исаев",
      "Карташов",
    ];
    for (const s of reserve) {
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(s);
      if (unique.length === 400) break;
    }
  }
  if (unique.length < 400) {
    throw new Error(`После автодополнения только ${unique.length} уникальных фамилий, нужно 400`);
  }
  return unique;
}

function splitStudentName(name: string): { firstName: string; patronymic: string } {
  const parts = normalizeSpaces(name).split(" ").filter(Boolean);
  const firstName = parts[1] || "Имя";
  const patronymic = parts.slice(2).join(" ") || "Отчество";
  return { firstName, patronymic };
}

function hashStr(s: string): number {
  // Deterministic hash for stable surname assignment.
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function expandSurnames(base: string[], needed: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of base) {
    const k = s.toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= needed) return out;
  }
  // Deterministic расширение: составные фамилии через дефис (Иванов-Петров).
  let i = 0;
  while (out.length < needed) {
    const a = base[i % base.length]!;
    const b = base[(i * 7 + 3) % base.length]!;
    i += 1;
    if (!a || !b) continue;
    if (a.toLowerCase() === b.toLowerCase()) continue;
    const s = `${a}-${b}`;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function splitStudentFullName(name: string): { lastName: string; firstName: string; patronymic: string } {
  const parts = normalizeSpaces(name).split(" ").filter(Boolean);
  const lastName = parts[0] || "Фамилия";
  const firstName = parts[1] || "Имя";
  const patronymic = parts.slice(2).join(" ") || "Отчество";
  return { lastName, firstName, patronymic };
}

async function main(): Promise<void> {
  const pool = getPool();
  const baseSurnames = buildSurnames400();

  const { rows } = await pool.query<StudentRow>(
    `SELECT id, name, COALESCE(class_schedule_id, class_label) AS class_id
     FROM students
     ORDER BY id`
  );

  const N = rows.length;
  if (!N) {
    console.log("[seedStudentSurnames400] no students");
    await closePool();
    return;
  }

  // Распределение по семьям (по числу семей): 55% (1 ребенок), 33% (2), 12% (3).
  // Не строго: округляем и затем подгоняем так, чтобы общее число детей == N.
  const avg = 0.55 * 1 + 0.33 * 2 + 0.12 * 3; // 1.57
  let F = Math.max(1, Math.round(N / avg));
  let f1 = Math.round(F * 0.55);
  let f2 = Math.round(F * 0.33);
  let f3 = Math.max(0, F - f1 - f2);
  if (f1 < 0) f1 = 0;
  if (f2 < 0) f2 = 0;
  F = f1 + f2 + f3;

  let totalKids = f1 + 2 * f2 + 3 * f3;
  let diff = N - totalKids;
  // diff>0: не хватает детей => увеличиваем размер семей
  while (diff > 0) {
    if (f1 > 0) {
      f1 -= 1;
      f2 += 1;
      diff -= 1;
    } else if (f2 > 0) {
      f2 -= 1;
      f3 += 1;
      diff -= 1;
    } else {
      break;
    }
  }
  // diff<0: лишние дети => уменьшаем размер семей
  while (diff < 0) {
    if (f3 > 0) {
      f3 -= 1;
      f2 += 1;
      diff += 1;
    } else if (f2 > 0) {
      f2 -= 1;
      f1 += 1;
      diff += 1;
    } else {
      break;
    }
  }
  totalKids = f1 + 2 * f2 + 3 * f3;
  if (totalKids !== N) {
    // Последняя подгонка: меняем число семей на 1 ребенка (не строго).
    f1 = Math.max(0, f1 + (N - totalKids));
    totalKids = f1 + 2 * f2 + 3 * f3;
  }
  if (totalKids !== N) {
    throw new Error(`FAMILY_DISTRIBUTION_MISMATCH: kids=${totalKids} expected=${N} (f1=${f1}, f2=${f2}, f3=${f3})`);
  }

  const sizes: number[] = [];
  for (let i = 0; i < f3; i++) sizes.push(3);
  for (let i = 0; i < f2; i++) sizes.push(2);
  for (let i = 0; i < f1; i++) sizes.push(1);
  const familiesCount = sizes.length;
  const surnames = expandSurnames(baseSurnames, familiesCount);

  // Классы -> пул учеников (перемешиваем детерминированно по hash(id)).
  const classPools = new Map<string, StudentRow[]>();
  for (const s of rows) {
    const key = String(s.class_id || "").trim();
    if (!classPools.has(key)) classPools.set(key, []);
    classPools.get(key)!.push(s);
  }
  for (const [k, list] of classPools.entries()) {
    list.sort((a, b) => hashStr(String(a.id)) - hashStr(String(b.id)));
    classPools.set(k, list);
  }
  const poolKeys = () =>
    [...classPools.keys()].filter((k) => (classPools.get(k)?.length || 0) > 0);
  const pickKDistinctClasses = (k: number): string[] => {
    const keys = poolKeys()
      .map((cl) => ({ cl, n: classPools.get(cl)!.length }))
      .sort((a, b) => b.n - a.n)
      .map((x) => x.cl);
    if (keys.length < k) {
      throw new Error(`NOT_ENOUGH_DISTINCT_CLASSES: need=${k} have=${keys.length}`);
    }
    return keys.slice(0, k);
  };
  const takeFromClass = (classId: string): StudentRow => {
    const list = classPools.get(classId);
    if (!list || !list.length) throw new Error(`EMPTY_CLASS_POOL: ${classId}`);
    return list.shift()!;
  };

  const assignments: Array<{ studentId: string; newSurname: string; firstName: string; patronymic: string }> = [];
  let sizeIdx = 0;
  for (let famIdx = 0; famIdx < familiesCount; famIdx++) {
    const k = sizes[sizeIdx++]!;
    const famSurname = surnames[famIdx]!;
    const chosenClasses = pickKDistinctClasses(k);
    for (const cl of chosenClasses) {
      const st = takeFromClass(cl);
      const parts = splitStudentFullName(st.name);
      assignments.push({
        studentId: st.id,
        newSurname: famSurname,
        firstName: parts.firstName,
        patronymic: parts.patronymic,
      });
    }
  }
  if (assignments.length !== N) {
    throw new Error(`ASSIGNMENT_MISMATCH: assigned=${assignments.length} expected=${N}`);
  }

  await pool.query("BEGIN");
  try {
    for (const a of assignments) {
      const fullName = `${a.newSurname} ${a.firstName} ${a.patronymic}`;
      await pool.query(`UPDATE students SET name = $2 WHERE id = $1`, [a.studentId, fullName]);
    }

    // Synchronize roster names from students after bulk rename.
    await pool.query(`DELETE FROM class_roster`);
    await pool.query(
      `INSERT INTO class_roster (class_id, full_name, sort_order)
       SELECT class_id, name, ROW_NUMBER() OVER (PARTITION BY class_id ORDER BY name) - 1
       FROM (
         SELECT COALESCE(class_schedule_id, class_label) AS class_id, name
         FROM students
       ) s`
    );

    await pool.query("COMMIT");
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  }

  const checkRows = await pool.query<{ name: string }>(`SELECT name FROM students`);
  const uniqueSurnames = new Set<string>();
  for (const r of checkRows.rows) {
    const p = normalizeSpaces(r.name).split(" ").filter(Boolean);
    if (p[0]) uniqueSurnames.add(p[0].toLowerCase());
  }
  console.log(`[seedStudentSurnames400] students updated: ${rows.length}`);
  console.log(`[seedStudentSurnames400] unique surnames now: ${uniqueSurnames.size}`);
  console.log(`[seedStudentSurnames400] families: ${familiesCount} (1-child=${f1}, 2-child=${f2}, 3-child=${f3})`);

  await closePool();
}

main().catch(async (e) => {
  console.error("[seedStudentSurnames400] error", e);
  await closePool();
  process.exit(1);
});
