import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { Pool } from "pg";
import { fillPerformanceFromClassDiary } from "./fillPerformanceFromClassDiary";
import { computeQuarterFinalsFromDatedGrades } from "./finalsFromGrades";
import { TEACHER_SEED_FIO, subjectsForTeacherIndex } from "./teacherSeedNames";
import { syncFamilyParents, FAMILY_PARENT_PASSWORD } from "./syncFamilyParents";

const TIME_LABELS = ["08:30", "09:25", "10:25", "11:30", "12:35", "13:40", "14:45"];
const RU_WEEKDAYS = ["понедельник", "вторник", "среда", "четверг", "пятница"];
const SUBJECTS = [
  { id: "lit", name: "Литература" },
  { id: "eng", name: "Иностранный язык" },
  { id: "hist", name: "История" },
  { id: "social", name: "Обществознание" },
  { id: "geo", name: "География" },
  { id: "math", name: "Математика" },
  { id: "info", name: "Информатика" },
  { id: "phys", name: "Физика" },
  { id: "bio", name: "Биология" },
  { id: "chem", name: "Химия" },
  { id: "art", name: "Изобразительное искусство" },
  { id: "music", name: "Музыка" },
  { id: "work", name: "Труд (технология)" },
  { id: "pe", name: "Физическая культура" },
] as const;
const SUBJECT_NAME_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.name])) as Record<
  string,
  string
>;

type SubjectId = (typeof SUBJECTS)[number]["id"];
type SchoolClass = { id: string; grade: number; label: string; parallel: string; homeroom: string };
type StudentSeed = {
  id: string;
  fullName: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  classId: string;
  classLabel: string;
  isDemoChild: boolean;
};
type SchoolDay = {
  iso: string;
  weekday: string;
  weekdayIdx: number;
  dayNum: number;
  monthGenitive: string;
};
type Lesson = {
  subjectId: SubjectId;
  subjectName: string;
  order: number;
  timeLabel: string;
};

function shouldUseSsl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    const host = (u.hostname || "").toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h +=
      (h << 1) +
      (h << 4) +
      (h << 7) +
      (h << 8) +
      (h << 24);
  }
  return Math.abs(h >>> 0);
}

function pickDeterministic<T>(arr: T[], seed: string): T {
  return arr[hashStr(seed) % arr.length];
}

const PARENT_LINK_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomParentLinkCode(used: Set<string>): string {
  // 7 символов, уникальность обеспечиваем на уровне конкретного сид-ранa.
  // Алфавит исключает неоднозначные O/0 и I/1 (как в фронте/репозитории).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const buf = randomBytes(7);
    let out = "";
    for (let i = 0; i < 7; i += 1) {
      out += PARENT_LINK_CODE_CHARS[buf[i]! % PARENT_LINK_CODE_CHARS.length];
    }
    if (!used.has(out)) {
      used.add(out);
      return out;
    }
  }
}

function dateIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const MONTH_GEN_DISPLAY: Record<string, string> = {
  "01": "января",
  "02": "февраля",
  "03": "марта",
  "04": "апреля",
  "05": "мая",
  "06": "июня",
  "07": "июля",
  "08": "августа",
  "09": "сентября",
  "10": "октября",
  "11": "ноября",
  "12": "декабря",
};

function dateDisplayRuFromIso(iso: string): string {
  const mm = iso.slice(5, 7);
  const dn = Number(iso.slice(8, 10));
  const mg = MONTH_GEN_DISPLAY[mm];
  if (mg && Number.isFinite(dn)) return `${dn} ${mg}`;
  return iso;
}

function buildSchoolDaysInMarch2026(): SchoolDay[] {
  const out: SchoolDay[] = [];
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(Date.UTC(2026, 2, d));
    const wd = dt.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    out.push({
      iso: dateIso(2026, 3, d),
      weekday: RU_WEEKDAYS[wd - 1],
      weekdayIdx: wd - 1,
      dayNum: d,
      monthGenitive: "марта",
    });
  }
  return out;
}

function buildClasses(): SchoolClass[] {
  const result: SchoolClass[] = [];
  for (let grade = 1; grade <= 11; grade++) {
    const parallels = grade <= 7 ? ["А", "Б", "В", "Г"] : ["А", "Б", "В"];
    for (const p of parallels) {
      const id = `${grade}${p}`;
      result.push({
        id,
        grade,
        label: `${grade}${p}`,
        parallel: p,
        homeroom: grade <= 4 ? `Каб. 1${parallels.indexOf(p) + 1}` : `Каб. 2${parallels.indexOf(p) + 1}`,
      });
    }
  }
  return result;
}

const STUDENT_POOL_FILE = "ПУЛ.txt";

function readStudentPoolFromProjectRoot(root: string): string[] {
  const poolPath = path.join(root, STUDENT_POOL_FILE);
  if (!fs.existsSync(poolPath)) {
    throw new Error(`Файл ${STUDENT_POOL_FILE} не найден в корне проекта (${poolPath})`);
  }
  const raw = fs.readFileSync(poolPath, "utf8");
  const names: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    names.push(s);
  }
  if (names.length === 0) {
    throw new Error(`${STUDENT_POOL_FILE}: нет строк ФИО (кроме комментариев)`);
  }
  return names;
}

function allocateClassSizes(total: number, nClasses: number, min: number, max: number): number[] {
  if (total < nClasses * min || total > nClasses * max) {
    throw new Error(
      `Нельзя распределить ${total} учеников по ${nClasses} классам с вилкой ${min}..${max} на класс`
    );
  }
  const sizes = Array.from({ length: nClasses }, () => min);
  let rem = total - nClasses * min;
  let idx = 0;
  while (rem > 0) {
    if (sizes[idx]! >= max) {
      idx = (idx + 1) % nClasses;
      continue;
    }
    sizes[idx]! += 1;
    rem -= 1;
    idx = (idx + 1) % nClasses;
  }
  return sizes;
}

function splitStudentFullName(fullName: string): { lastName: string; firstName: string; patronymic: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 3) {
    throw new Error(`ФИО должно состоять из 3 слов: «${fullName}»`);
  }
  return { lastName: parts[0]!, firstName: parts[1]!, patronymic: parts[2]! };
}

/** Как в seedFamilyParents: один родительский аккаунт на варианты фамилии м/ж. */
function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function familyGroupKey(lastName: string): string {
  const raw = normalizeSpaces(lastName)
    .toLowerCase()
    .replace(/ё/g, "е");
  if (!raw) return "";
  if (raw.endsWith("ова") || raw.endsWith("ева") || raw.endsWith("ина")) {
    return raw.slice(0, -1);
  }
  if (raw.endsWith("ская")) {
    return `${raw.slice(0, -4)}ский`;
  }
  return raw;
}

function poolPersonFamilyKey(lastName: string): string {
  return familyGroupKey(lastName) || normalizeSpaces(lastName).toLowerCase().replace(/ё/g, "е");
}

type PoolPerson = {
  poolIndex: number;
  fullName: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  familyKey: string;
};

function shuffleClassIndices(nClasses: number, attempt: number): number[] {
  const arr = Array.from({ length: nClasses }, (_, i) => i);
  for (let i = nClasses - 1; i > 0; i -= 1) {
    const j = hashStr(`seedSimple-class-order-${attempt}-${i}`) % (i + 1);
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
  return arr;
}

/**
 * Распределение пула по классам: 17–23 человека, в одном классе не больше одного ученика на familyKey
 * (смежные фамилии м/ж считаются одной семьёй). Семьи крупнее числа классов недопустимы.
 */
function buildStudentsFromPool(classes: SchoolClass[], poolNames: string[]): StudentSeed[] {
  const nClasses = classes.length;
  const targets = allocateClassSizes(poolNames.length, nClasses, 17, 23);

  const persons: PoolPerson[] = poolNames.map((fullName, poolIndex) => {
    const { lastName, firstName, patronymic } = splitStudentFullName(fullName);
    return {
      poolIndex,
      fullName,
      lastName,
      firstName,
      patronymic,
      familyKey: poolPersonFamilyKey(lastName),
    };
  });

  const byFamily = new Map<string, PoolPerson[]>();
  for (const p of persons) {
    const arr = byFamily.get(p.familyKey) ?? [];
    arr.push(p);
    byFamily.set(p.familyKey, arr);
  }
  for (const [, fam] of byFamily) {
    if (fam.length > nClasses) {
      throw new Error(
        `seedSimple: семья по ключу «${fam[0]!.familyKey}» (${fam.length} чел.) не помещается в ${nClasses} классов без повторов в классе`
      );
    }
  }

  const familyKeysSorted = [...byFamily.keys()].sort((a, b) => {
    const da = byFamily.get(a)!.length;
    const db = byFamily.get(b)!.length;
    if (db !== da) return db - da;
    const minA = Math.min(...byFamily.get(a)!.map((x) => x.poolIndex));
    const minB = Math.min(...byFamily.get(b)!.map((x) => x.poolIndex));
    return minA - minB;
  });

  const orderedPeople: PoolPerson[] = [];
  for (const fk of familyKeysSorted) {
    const fam = byFamily.get(fk)!;
    fam.sort((x, y) => x.poolIndex - y.poolIndex);
    orderedPeople.push(...fam);
  }

  const MAX_ATTEMPTS = 250;
  let buckets: PoolPerson[][] | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const classCounts = Array.from({ length: nClasses }, () => 0);
    const classFamilyKeys = Array.from({ length: nClasses }, () => new Set<string>());
    const tryBuckets: PoolPerson[][] = Array.from({ length: nClasses }, () => []);
    const shuf = shuffleClassIndices(nClasses, attempt);
    const orderRank = new Array<number>(nClasses);
    shuf.forEach((ci, pos) => {
      orderRank[ci] = pos;
    });

    let failed = false;
    for (const p of orderedPeople) {
      const candidates: number[] = [];
      for (let ci = 0; ci < nClasses; ci += 1) {
        if (classCounts[ci]! < targets[ci]! && !classFamilyKeys[ci]!.has(p.familyKey)) {
          candidates.push(ci);
        }
      }
      if (candidates.length === 0) {
        failed = true;
        break;
      }
      let best = candidates[0]!;
      for (let k = 1; k < candidates.length; k += 1) {
        const ci = candidates[k]!;
        if (classCounts[ci]! < classCounts[best]!) {
          best = ci;
        } else if (classCounts[ci] === classCounts[best] && orderRank[ci]! < orderRank[best]!) {
          best = ci;
        }
      }
      tryBuckets[best]!.push(p);
      classCounts[best]! += 1;
      classFamilyKeys[best]!.add(p.familyKey);
    }

    if (failed) continue;

    let ok = true;
    for (let ci = 0; ci < nClasses; ci += 1) {
      if (tryBuckets[ci]!.length !== targets[ci]) {
        ok = false;
        break;
      }
      const seen = new Set<string>();
      for (const p of tryBuckets[ci]!) {
        if (seen.has(p.familyKey)) {
          ok = false;
          break;
        }
        seen.add(p.familyKey);
      }
      if (!ok) break;
    }
    if (ok) {
      buckets = tryBuckets;
      break;
    }
  }

  if (!buckets) {
    const maxFam = Math.max(...[...byFamily.values()].map((f) => f.length));
    throw new Error(
      `seedSimple: не удалось распределить учеников по классам без однофамильцев в одном классе за ${MAX_ATTEMPTS} попыток (классов ${nClasses}, макс. размер семьи ${maxFam})`
    );
  }

  const students: StudentSeed[] = [];
  for (let ci = 0; ci < classes.length; ci += 1) {
    const cl = classes[ci]!;
    const row = buckets[ci]!;
    row.sort((a, b) => a.poolIndex - b.poolIndex);
    for (let i = 0; i < row.length; i += 1) {
      const slot = i + 1;
      const { fullName, lastName, firstName, patronymic } = row[i]!;
      let id = `stu-${cl.id.toLowerCase()}-${slot}`;
      if (cl.id === "3А" && slot === 1) id = "stu-3a-1";
      if (cl.id === "6Б" && slot === 1) id = "stu-6b-1";
      const isDemoChild = (cl.id === "3А" && slot === 1) || (cl.id === "6Б" && slot === 1);
      students.push({
        id,
        fullName,
        lastName,
        firstName,
        patronymic,
        classId: cl.id,
        classLabel: cl.label,
        isDemoChild,
      });
    }
  }

  return students;
}

const LAST_NAMES = [
  "Иванов",
  "Петров",
  "Сидоров",
  "Кузнецов",
  "Смирнов",
  "Соколов",
  "Попов",
  "Лебедев",
  "Козлов",
  "Новиков",
  "Федоров",
  "Морозов",
  "Волков",
];
const FIRST_NAMES_M = [
  "Артем",
  "Иван",
  "Даниил",
  "Никита",
  "Михаил",
  "Егор",
  "Максим",
  "Алексей",
  "Сергей",
];
const FIRST_NAMES_F = [
  "Анна",
  "Мария",
  "Дарья",
  "Екатерина",
  "Полина",
  "Ксения",
  "Виктория",
  "Ольга",
  "София",
];
const PATRONYMICS_M = ["Сергеевич", "Андреевич", "Игоревич", "Дмитриевич", "Павлович", "Олегович"];
const PATRONYMICS_F = ["Сергеевна", "Андреевна", "Игоревна", "Дмитриевна", "Павловна", "Олеговна"];

function buildStudents(classes: SchoolClass[]): StudentSeed[] {
  const students: StudentSeed[] = [];
  for (const cl of classes) {
    const size = 15 + (hashStr(`size-${cl.id}`) % 11); // 15..25
    for (let i = 1; i <= size; i++) {
      let id = `stu-${cl.id.toLowerCase()}-${i}`;
      let lastName: string;
      let firstName: string;
      let patronymic: string;
      let fullName: string;
      let isDemoChild = false;
      if (cl.id === "3А" && i === 1) {
        id = "stu-3a-1";
        lastName = "Смирнова";
        firstName = "Дарья";
        patronymic = "Сергеевна";
        isDemoChild = true;
      } else if (cl.id === "6Б" && i === 1) {
        id = "stu-6b-1";
        lastName = "Смирнов";
        firstName = "Иван";
        patronymic = "Сергеевич";
        isDemoChild = true;
      } else {
        const female = hashStr(`${cl.id}-${i}`) % 2 === 0;
        const baseLastName = pickDeterministic(LAST_NAMES, `ln-${cl.id}-${i}`);
        lastName = female ? `${baseLastName}а` : baseLastName;
        firstName = female
          ? pickDeterministic(FIRST_NAMES_F, `fn-${cl.id}-${i}`)
          : pickDeterministic(FIRST_NAMES_M, `fn-${cl.id}-${i}`);
        patronymic = female
          ? pickDeterministic(PATRONYMICS_F, `pn-${cl.id}-${i}`)
          : pickDeterministic(PATRONYMICS_M, `pn-${cl.id}-${i}`);
      }
      fullName = `${lastName} ${firstName} ${patronymic}`;
      students.push({
        id,
        fullName,
        lastName,
        firstName,
        patronymic,
        classId: cl.id,
        classLabel: cl.label,
        isDemoChild,
      });
    }
  }
  return students;
}

function lessonsPerDay(grade: number, dayIdx: number): number {
  if (grade <= 4) return [4, 5, 4, 5, 4][dayIdx];
  if (grade <= 8) return [5, 6, 5, 6, 5][dayIdx];
  return [6, 7, 6, 7, 6][dayIdx];
}

function weeklyCountsForGrade(grade: number): Record<SubjectId, number> {
  const counts: Record<SubjectId, number> = {
    lit: 0,
    eng: 0,
    hist: 0,
    social: 0,
    geo: 0,
    math: 0,
    info: 0,
    phys: 0,
    bio: 0,
    chem: 0,
    art: 0,
    music: 0,
    work: 0,
    pe: 0,
  };
  if (grade <= 4) {
    Object.assign(counts, {
      lit: 8, // Русский (5) + Литература (3)
      eng: 2,
      hist: 2,
      math: 5,
      art: 2,
      music: 2,
      work: 2,
      pe: 2,
    });
  } else if (grade <= 6) {
    Object.assign(counts, {
      lit: 7, // Русский (4) + Литература (3)
      eng: 3,
      hist: 2,
      social: 2,
      geo: 2,
      math: 5,
      info: 2,
      bio: 2,
      art: 1,
      music: 1,
      work: 1,
      pe: 3,
    });
  } else if (grade <= 8) {
    Object.assign(counts, {
      lit: 7, // Русский (4) + Литература (3)
      eng: 3,
      hist: 2,
      social: 2,
      geo: 2,
      math: 5,
      info: 2,
      phys: 2,
      bio: 2,
      chem: 2,
      work: 1,
      pe: 3,
    });
  } else {
    Object.assign(counts, {
      lit: 6, // Русский (3) + Литература (3)
      eng: 3,
      hist: 2,
      social: 2,
      geo: 2,
      math: 5,
      info: 2,
      phys: 3,
      bio: 2,
      chem: 2,
      pe: 2,
    });
  }
  return counts;
}

function buildWeeklySubjectBag(grade: number): SubjectId[] {
  const counts = weeklyCountsForGrade(grade);
  const bag: SubjectId[] = [];
  for (const s of Object.keys(counts) as SubjectId[]) {
    if ((s === "phys" || s === "chem") && grade < 7) continue;
    for (let i = 0; i < counts[s]; i++) bag.push(s);
  }
  return bag;
}

function swap<T>(arr: T[], i: number, j: number): void {
  const t = arr[i];
  arr[i] = arr[j];
  arr[j] = t;
}

function rotateForParallel(days: SubjectId[][], parallel: string): SubjectId[][] {
  const cloned = days.map((d) => d.slice());
  const shift = parallel === "А" ? 0 : parallel === "Б" ? 1 : parallel === "В" ? 2 : 3;
  for (const d of cloned) {
    if (d.length > 2 && shift > 0) {
      const i = shift % d.length;
      const j = (i + 1) % d.length;
      swap(d, i, j);
    }
    // Ensure no equal neighbors after mutation.
    for (let i = 1; i < d.length; i++) {
      if (d[i] !== d[i - 1]) continue;
      const k = d.findIndex((s, idx) => idx > i && s !== d[i] && s !== d[i - 1]);
      if (k > i) swap(d, i, k);
    }
  }
  return cloned;
}

function buildWeeklyPatternForClass(grade: number, parallel: string, attempt = 0): SubjectId[][] {
  const bag = buildWeeklySubjectBag(grade);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = hashStr(`wk-${grade}-${parallel}-${attempt}-${i}`) % (i + 1);
    swap(bag, i, j);
  }
  const daySlots = Array.from({ length: 5 }, (_, i) => lessonsPerDay(grade, i));
  const days: SubjectId[][] = daySlots.map(() => []);
  const remaining = new Map<SubjectId, number>();
  for (const s of bag) remaining.set(s, (remaining.get(s) ?? 0) + 1);

  for (let day = 0; day < 5; day++) {
    for (let slot = 0; slot < daySlots[day]; slot++) {
      const prev = slot > 0 ? days[day][slot - 1] : null;
      const prevDay = day > 0 ? days[day - 1] : [];
      const candidates = [...remaining.entries()]
        .filter(([, left]) => left > 0)
        .map(([s]) => s)
        .filter((s) => s !== prev)
        .filter((s) => !(s === "pe" && prev === "pe"))
        .filter((s) => !(grade < 7 && (s === "phys" || s === "chem")))
        .sort((a, b) => {
          const ra = (remaining.get(b) ?? 0) - (remaining.get(a) ?? 0);
          if (ra !== 0) return ra;
          return hashStr(`${a}-${b}-${day}-${slot}-${attempt}`) % 2 === 0 ? 1 : -1;
        });
      const chosen = candidates[0] ?? "math";
      days[day].push(chosen);
      remaining.set(chosen, (remaining.get(chosen) ?? 0) - 1);
      if (chosen === "pe" && prevDay.includes("pe")) {
        // avoid daily consecutive PE pattern by swapping inside day if needed
        const idx = days[day].indexOf("pe");
        if (idx > 0) swap(days[day], idx, idx - 1);
      }
    }
  }
  return rotateForParallel(days, parallel);
}

function buildDailyLessonsForClass(weeklyPattern: SubjectId[][]): Lesson[][] {
  return weeklyPattern.map((daySubjects) =>
    daySubjects.map((subjectId, idx) => ({
      subjectId,
      subjectName: SUBJECT_NAME_BY_ID[subjectId],
      order: idx + 1,
      timeLabel: TIME_LABELS[idx],
    }))
  );
}

function countByClass(students: StudentSeed[]): Record<string, number> {
  return students.reduce<Record<string, number>>((acc, s) => {
    acc[s.classId] = (acc[s.classId] ?? 0) + 1;
    return acc;
  }, {});
}

type WeekLessons = Lesson[][];

function assignTeachersToQuarterSlots(params: {
  classes: SchoolClass[];
  classLessonsByWeek: Map<string, WeekLessons>;
  homeroomTeacherIds: Record<string, number>;
  teachersBySubject: Map<string, number[]>;
  allTeacherIds: number[];
}): { teacherForClassSlot: Map<string, number>; conflicts: string[] } {
  const { classes, classLessonsByWeek, homeroomTeacherIds, teachersBySubject, allTeacherIds } = params;
  type SlotLesson = { classId: string; subjectName: string; lessonOrder: number };
  const slots = new Map<string, SlotLesson[]>();
  for (const cl of classes) {
    const week = classLessonsByWeek.get(cl.id) ?? [];
    for (let weekdayIdx = 0; weekdayIdx < 5; weekdayIdx++) {
      const dayLessons = week[weekdayIdx] ?? [];
      for (const lesson of dayLessons) {
        const key = `${weekdayIdx}|${lesson.order}`;
        const list = slots.get(key) ?? [];
        list.push({ classId: cl.id, subjectName: lesson.subjectName, lessonOrder: lesson.order });
        slots.set(key, list);
      }
    }
  }
  const teacherForClassSlot = new Map<string, number>();
  const conflicts: string[] = [];
  const sortedSlotKeys = [...slots.keys()].sort((a, b) => {
    const [da, oa] = a.split("|").map(Number);
    const [db, ob] = b.split("|").map(Number);
    if (da !== db) return da - db;
    return oa - ob;
  });
  for (const slotKey of sortedSlotKeys) {
    const [wdStr] = slotKey.split("|");
    const weekdayIdx = Number(wdStr);
    const lessons = slots.get(slotKey)!;
    const used = new Set<number>();
    const sortedLessons = [...lessons].sort((x, y) => x.classId.localeCompare(y.classId, "ru"));
    for (const L of sortedLessons) {
      const homeroom = homeroomTeacherIds[L.classId];
      const poolAll = teachersBySubject.get(L.subjectName) ?? [];
      const candidates = poolAll.filter((id) => !used.has(id));
      let chosen: number;
      if (candidates.includes(homeroom)) {
        chosen = homeroom;
      } else if (candidates.length > 0) {
        chosen = candidates[0];
      } else {
        const anyFree = allTeacherIds.find((id) => !used.has(id));
        if (anyFree !== undefined) {
          chosen = anyFree;
          conflicts.push(
            `Нет специалиста «${L.subjectName}» (класс ${L.classId}, слот ${slotKey}); назначен свободный педагог id=${anyFree} вне кластера предмета`
          );
        } else {
          chosen = homeroom;
          conflicts.push(
            `Критично: не осталось свободных учителей в слоте ${slotKey}, класс ${L.classId} «${L.subjectName}» — классный id=${homeroom}`
          );
        }
      }
      if (used.has(chosen)) {
        const emergency = allTeacherIds.find((id) => !used.has(id));
        if (emergency !== undefined) {
          chosen = emergency;
          conflicts.push(
            `Исправление двойной занятости: класс ${L.classId} слот ${slotKey} «${L.subjectName}» → id=${emergency}`
          );
        } else {
          conflicts.push(
            `Двойная занятость не устранена: учитель id=${chosen}, слот ${slotKey}, класс ${L.classId}`
          );
        }
      }
      used.add(chosen);
      teacherForClassSlot.set(`${L.classId}|${weekdayIdx}|${L.lessonOrder}`, chosen);
    }
  }
  return { teacherForClassSlot, conflicts };
}

function buildPerformanceFromLessons(
  lessons: Array<{ subjectId: SubjectId; subjectName: string; dateIso: string; grade: number | null }>
): {
  rows: { subjectId: string; subjectName: string; avg: number }[];
  byDate: Map<string, { subject: string; grade: number }[]>;
  bySubjectByDate: Map<string, Map<string, number[]>>;
} {
  const gradesBySubject = new Map<string, { subjectName: string; grades: number[] }>();
  const byDate = new Map<string, { subject: string; grade: number }[]>();
  const bySubjectByDate = new Map<string, Map<string, number[]>>();
  for (const l of lessons) {
    if (l.grade === null) continue;
    const g = gradesBySubject.get(l.subjectId) ?? { subjectName: l.subjectName, grades: [] };
    g.grades.push(l.grade);
    gradesBySubject.set(l.subjectId, g);
    const d = byDate.get(l.dateIso) ?? [];
    d.push({ subject: l.subjectName, grade: l.grade });
    byDate.set(l.dateIso, d);
    const subjMap = bySubjectByDate.get(l.subjectId) ?? new Map<string, number[]>();
    const dateGrades = subjMap.get(l.dateIso) ?? [];
    dateGrades.push(l.grade);
    subjMap.set(l.dateIso, dateGrades);
    bySubjectByDate.set(l.subjectId, subjMap);
  }
  const rows = [...gradesBySubject.entries()].map(([subjectId, data]) => ({
    subjectId,
    subjectName: data.subjectName,
    avg: Number((data.grades.reduce((a, b) => a + b, 0) / Math.max(1, data.grades.length)).toFixed(2)),
  }));
  return { rows, byDate, bySubjectByDate };
}

async function main(): Promise<void> {
  const envPath = path.join(process.cwd(), ".env");
  let url = process.env.DATABASE_URL;
  if (!url && fs.existsSync(envPath)) {
    const envText = fs.readFileSync(envPath, "utf8");
    const line = envText.split(/\r?\n/).find((l) => l.trim().startsWith("DATABASE_URL="));
    if (line) url = line.trim().substring("DATABASE_URL=".length);
  }
  if (!url) {
    console.error("DATABASE_URL не задан в .env");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log("[seedSimple] Подключение к БД…");
    await pool.query(`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;`);

    const schemaSql = fs.readFileSync(path.join(process.cwd(), "src", "db", "schema.sql"), "utf8");
    const schemaTeacherSql = fs.readFileSync(
      path.join(process.cwd(), "src", "db", "schema_teacher.sql"),
      "utf8"
    );
    await pool.query(schemaSql);
    await pool.query(schemaTeacherSql);

    const classes = buildClasses();
    const schoolDays = buildSchoolDaysInMarch2026();
    const poolNames = readStudentPoolFromProjectRoot(process.cwd());
    console.log(`[seedSimple] Пул учеников: ${poolNames.length} ФИО из ${STUDENT_POOL_FILE}`);
    const students = buildStudentsFromPool(classes, poolNames);
    const classStudentCounts = countByClass(students);

    for (const cl of classes) {
      await pool.query(
        `INSERT INTO school_classes (id, grade, label, subject_name) VALUES ($1, $2, $3, $4)`,
        [cl.id, cl.grade, cl.label, cl.grade <= 4 ? "Литература" : "Математика"]
      );
    }

    let rosterSort = new Map<string, number>();
    const usedParentLinkCodes = new Set<string>();
    for (const s of students) {
      const parentLinkCode = randomParentLinkCode(usedParentLinkCodes);
      await pool.query(
        `INSERT INTO students (id, name, class_label, class_schedule_id, parent_link_code) VALUES ($1, $2, $3, $4, $5)`,
        [s.id, s.fullName, s.classLabel, s.isDemoChild ? null : s.classId, parentLinkCode]
      );
      const sort = rosterSort.get(s.classId) ?? 0;
      await pool.query(
        `INSERT INTO class_roster (class_id, full_name, sort_order) VALUES ($1, $2, $3)`,
        [s.classId, s.fullName, sort]
      );
      rosterSort.set(s.classId, sort + 1);
    }

    if (TEACHER_SEED_FIO.length !== 65) {
      throw new Error(`seedSimple: ожидается 65 ФИО учителей в teacherSeedNames, сейчас ${TEACHER_SEED_FIO.length}`);
    }

    const directorHash = bcrypt.hashSync("DirectorDemo2026", 10);
    const teacherHash = bcrypt.hashSync("TeacherDemo2026", 10);
    await pool.query(`DELETE FROM users`);
    await pool.query(
      `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
       VALUES ($1, $2, 'director', 'Петров', 'Александр', 'Николаевич')`,
      ["director.demo@school.local", directorHash]
    );

    const teacherIds: number[] = [];
    for (let i = 0; i < TEACHER_SEED_FIO.length; i += 1) {
      const { lastName, firstName, patronymic } = splitStudentFullName(TEACHER_SEED_FIO[i]!);
      const email =
        i === 0
          ? "teacher.rus@school.local"
          : i === 1
            ? "teacher.math@school.local"
            : `teacher.pool.${i}@school.local`;
      const ins = await pool.query<{ id: number }>(
        `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
         VALUES ($1, $2, 'teacher', $3, $4, $5)
         RETURNING id`,
        [email, teacherHash, lastName, firstName, patronymic]
      );
      const uid = ins.rows[0].id;
      teacherIds.push(uid);
      for (const subj of subjectsForTeacherIndex(i)) {
        await pool.query(
          `INSERT INTO teacher_subjects (teacher_user_id, subject_name) VALUES ($1, $2) ON CONFLICT (teacher_user_id, subject_name) DO NOTHING`,
          [uid, subj]
        );
      }
    }

    const familyParentHash = bcrypt.hashSync(FAMILY_PARENT_PASSWORD, 10);
    const familySync = await syncFamilyParents(pool, { passwordHash: familyParentHash });
    console.log(
      `[seedSimple] родители по семьям: семей=${familySync.families}, учёток=${familySync.parents}, связей с детьми=${familySync.linkedChildren}, пароль ${FAMILY_PARENT_PASSWORD}`
    );

    const homeroomTeacherIds: Record<string, number> = {};
    const homeroomTeacherNameByClass: Record<string, string> = {};
    for (let ci = 0; ci < classes.length; ci += 1) {
      const cl = classes[ci]!;
      const tIdx = 2 + ci;
      if (tIdx >= teacherIds.length) {
        throw new Error("seedSimple: недостаточно учителей в пуле для 40 классов");
      }
      homeroomTeacherIds[cl.id] = teacherIds[tIdx]!;
      homeroomTeacherNameByClass[cl.id] = TEACHER_SEED_FIO[tIdx]!;
    }

    const teacherIdToFio = new Map<number, string>();
    for (let i = 0; i < teacherIds.length; i += 1) {
      teacherIdToFio.set(teacherIds[i]!, TEACHER_SEED_FIO[i]!);
    }

    const teachersBySubject = new Map<string, number[]>();
    for (let i = 0; i < teacherIds.length; i += 1) {
      const uid = teacherIds[i]!;
      for (const sname of subjectsForTeacherIndex(i)) {
        const arr = teachersBySubject.get(sname) ?? [];
        arr.push(uid);
        teachersBySubject.set(sname, arr);
      }
    }

    const demo3a = students.find((s) => s.classId === "3А" && s.isDemoChild);
    const demo6b = students.find((s) => s.classId === "6Б" && s.isDemoChild);
    if (!demo3a || !demo6b) throw new Error("seedSimple: не найдены демо-ученики 3А/6Б");
    for (const cl of classes) {
      await pool.query(
        `INSERT INTO user_teacher_classes (user_id, label, grade, sort_order) VALUES ($1, $2, $3, 0)`,
        [homeroomTeacherIds[cl.id], cl.label, cl.grade]
      );
    }

    const classLessonsByWeek = new Map<string, Lesson[][]>();
    for (const cl of classes) {
      let weeklyLessons: Lesson[][] | null = null;
      for (let att = 0; att < 500; att++) {
        const weeklyPattern = buildWeeklyPatternForClass(cl.grade, cl.parallel, att);
        const wl = buildDailyLessonsForClass(weeklyPattern);
        let bad = false;
        for (const dayLessons of wl) {
          for (let i = 1; i < dayLessons.length; i++) {
            if (dayLessons[i].subjectId === dayLessons[i - 1].subjectId) {
              bad = true;
              break;
            }
            if (dayLessons[i].subjectId === "pe" && dayLessons[i - 1].subjectId === "pe") {
              bad = true;
              break;
            }
          }
          if (bad) break;
        }
        if (!bad && cl.grade < 7) {
          const hasForbidden = wl.flat().some((l) => l.subjectId === "phys" || l.subjectId === "chem");
          if (hasForbidden) bad = true;
        }
        if (!bad) {
          weeklyLessons = wl;
          break;
        }
      }
      if (!weeklyLessons) {
        throw new Error(`seedSimple: не удалось собрать неделю без повторов подряд для класса ${cl.id}`);
      }
      classLessonsByWeek.set(cl.id, weeklyLessons);
    }

    const { teacherForClassSlot, conflicts } = assignTeachersToQuarterSlots({
      classes,
      classLessonsByWeek,
      homeroomTeacherIds,
      teachersBySubject,
      allTeacherIds: teacherIds,
    });

    const subjectWeeklyTotals = new Map<string, number>();
    for (const cl of classes) {
      const week = classLessonsByWeek.get(cl.id) ?? [];
      for (const dayLessons of week) {
        for (const les of dayLessons) {
          subjectWeeklyTotals.set(les.subjectName, (subjectWeeklyTotals.get(les.subjectName) ?? 0) + 1);
        }
      }
    }
    const teacherSlotTotals = new Map<number, number>();
    for (const tid of teacherForClassSlot.values()) {
      teacherSlotTotals.set(tid, (teacherSlotTotals.get(tid) ?? 0) + 1);
    }

    let teacherDoubleBookings = 0;
    const teachersSeenPerSlot = new Map<string, Set<number>>();
    for (const [cellKey, tid] of teacherForClassSlot) {
      const parts = cellKey.split("|");
      const cls = parts[0];
      const weekdayIdx = parts[1];
      const ord = parts[2];
      const slotKey = `${weekdayIdx}|${ord}`;
      const seen = teachersSeenPerSlot.get(slotKey) ?? new Set<number>();
      if (seen.has(tid)) {
        teacherDoubleBookings += 1;
        conflicts.push(`Пересечение: учитель id=${tid} дважды в слоте ${slotKey} (класс ${cls})`);
      }
      seen.add(tid);
      teachersSeenPerSlot.set(slotKey, seen);
    }

    /** Согласовано с `teacherRepository.SEED_SIMPLE_QUARTER` и мартовскими дневниками. */
    const directorSeedQuarter = 4;
    for (const cl of classes) {
      const week = classLessonsByWeek.get(cl.id) ?? [];
      for (let weekdayIdx = 0; weekdayIdx < 5; weekdayIdx++) {
        const dayLessons = week[weekdayIdx] ?? [];
        for (const lesson of dayLessons) {
          const tid = teacherForClassSlot.get(`${cl.id}|${weekdayIdx}|${lesson.order}`);
          if (tid == null) {
            throw new Error(`seedSimple: нет назначенного учителя для ${cl.id} день ${weekdayIdx} урок ${lesson.order}`);
          }
          await pool.query(
            `INSERT INTO director_quarter_schedule
             (class_id, quarter, weekday_idx, lesson_order, subject_name, teacher_user_id, time_label)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [cl.id, directorSeedQuarter, weekdayIdx, lesson.order, lesson.subjectName, tid, lesson.timeLabel]
          );
        }
      }
    }

    console.log("");
    console.log("[seedSimple] ——— Отчёт по расписанию (4 четверть, недельный шаблон) ———");
    console.log("[seedSimple] Всего ячеек в шаблоне:", teacherForClassSlot.size);
    console.log("[seedSimple] Недельная сумма уроков по предметам (все классы):");
    for (const [name, c] of [...subjectWeeklyTotals.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${name}: ${c}`);
    }
    console.log("[seedSimple] Нагрузка по учителям (число ячеек расписания):");
    for (const [tid, c] of [...teacherSlotTotals.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  id=${tid} ${teacherIdToFio.get(tid) ?? "?"}: ${c}`);
    }
    console.log(
      "[seedSimple] Пересечений «один учитель в двух классах в одном слоте»:",
      teacherDoubleBookings
    );
    if (conflicts.length) {
      console.log(`[seedSimple] Предупреждения и узкие места (${conflicts.length}):`);
      for (const line of conflicts.slice(0, 80)) {
        console.log(`  ${line}`);
      }
      if (conflicts.length > 80) {
        console.log(`  ... ещё ${conflicts.length - 80} строк`);
      }
    } else {
      console.log("[seedSimple] Конфликтов «двойной занятости» по правилам назначения не зафиксировано.");
    }
    console.log("");

    for (const cl of classes) {
      const week = classLessonsByWeek.get(cl.id) ?? [];
      for (const day of schoolDays) {
        await pool.query(
          `INSERT INTO class_diary_days (class_id, date_iso, weekday, month_genitive, year)
           VALUES ($1, $2::date, $3, $4, 2026)`,
          [cl.id, day.iso, day.weekday, day.monthGenitive]
        );
        const lessons = week[day.weekdayIdx] ?? [];
        for (const lesson of lessons) {
          const slotTid = teacherForClassSlot.get(`${cl.id}|${day.weekdayIdx}|${lesson.order}`);
          const teacherDisplay =
            slotTid != null
              ? teacherIdToFio.get(slotTid) ?? homeroomTeacherNameByClass[cl.id]
              : homeroomTeacherNameByClass[cl.id];
          const baseGrade = 3 + ((hashStr(`${cl.id}-${day.iso}-${lesson.order}`) % 3) as 0 | 1 | 2);
          const absent = hashStr(`abs-${cl.id}-${day.iso}-${lesson.order}`) % 12 === 0;
          await pool.query(
            `INSERT INTO class_diary_lessons (
               class_id, date_iso, lesson_order, lesson_key, title, time_label, grade,
               teacher, topic, homework, control_work, place, homework_next, blocks_json
             ) VALUES (
               $1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, NULL
             )`,
            [
              cl.id,
              day.iso,
              lesson.order,
              `${lesson.subjectId}-${day.weekdayIdx + 1}-${lesson.order}`,
              lesson.subjectName,
              lesson.timeLabel,
              absent ? null : baseGrade,
              teacherDisplay,
              `${lesson.subjectName}. Тема урока ${day.dayNum}`,
              absent ? null : `Домашнее задание ${day.dayNum}-${lesson.order}`,
              absent ? "Н" : day.dayNum % 9 === 0 ? "Контрольная" : null,
              cl.homeroom,
            ]
          );
        }
      }
    }

    const demoChildren = students.filter((s) => s.isDemoChild);
    for (const child of demoChildren) {
      const cl = classes.find((c) => c.id === child.classId);
      if (!cl) continue;
      const week = classLessonsByWeek.get(cl.id) ?? [];
      const allLessons: Array<{
        subjectId: SubjectId;
        subjectName: string;
        dateIso: string;
        grade: number | null;
      }> = [];
      for (const day of schoolDays) {
        await pool.query(
          `INSERT INTO diary_days (child_id, date_iso, weekday, month_genitive, year)
           VALUES ($1, $2::date, $3, $4, 2026)`,
          [child.id, day.iso, day.weekday, day.monthGenitive]
        );
        const lessons = week[day.weekdayIdx] ?? [];
        for (const lesson of lessons) {
          const slotTid = teacherForClassSlot.get(`${cl.id}|${day.weekdayIdx}|${lesson.order}`);
          const teacherDisplay =
            slotTid != null
              ? teacherIdToFio.get(slotTid) ?? homeroomTeacherNameByClass[cl.id]
              : homeroomTeacherNameByClass[cl.id];
          const baseGrade = 3 + ((hashStr(`${child.id}-${day.iso}-${lesson.order}`) % 3) as 0 | 1 | 2);
          const adjusted = child.classId === "6Б" ? Math.max(2, baseGrade - 1) : baseGrade;
          const absent = hashStr(`child-abs-${child.id}-${day.iso}-${lesson.order}`) % 14 === 0;
          await pool.query(
            `INSERT INTO diary_lessons (
               child_id, date_iso, lesson_order, lesson_key, title, time_label, grade,
               teacher, topic, homework, control_work, place, homework_next, blocks_json
             ) VALUES (
               $1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, NULL
             )`,
            [
              child.id,
              day.iso,
              lesson.order,
              `${lesson.subjectId}-${day.weekdayIdx + 1}-${lesson.order}`,
              lesson.subjectName,
              lesson.timeLabel,
              absent ? null : adjusted,
              teacherDisplay,
              `${lesson.subjectName}. Индивидуальная тема`,
              absent ? null : `Повторить материал ${day.dayNum}`,
              absent ? "Н" : day.dayNum % 11 === 0 ? "Контрольная" : null,
              cl.homeroom,
            ]
          );
          allLessons.push({
            subjectId: lesson.subjectId,
            subjectName: lesson.subjectName,
            dateIso: day.iso,
            grade: absent ? null : adjusted,
          });
        }
      }

      const perf = buildPerformanceFromLessons(allLessons);
      await pool.query(
        `INSERT INTO performance_meta (child_id, quarter_label, date_label, day_num, weekday, month_genitive, year, finals_year_label)
         VALUES ($1, '4 четверть', '31 марта', 31, 'вторник', 'марта', 2026, '2025/2026')`,
        [child.id]
      );

      let sortOrder = 0;
      for (const row of perf.rows.sort((a, b) => a.subjectName.localeCompare(b.subjectName))) {
        const dated = allLessons
          .filter((l) => l.subjectId === row.subjectId && l.grade != null)
          .map((l) => ({ dateIso: l.dateIso, grade: l.grade as number }));
        const fin = computeQuarterFinalsFromDatedGrades(dated, child.id, row.subjectId);
        await pool.query(
          `INSERT INTO performance_rows (child_id, subject_id, subject_name, student_avg, class_avg, parallel_avg, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [child.id, row.subjectId, row.subjectName, row.avg, row.avg, row.avg, sortOrder]
        );
        await pool.query(
          `INSERT INTO finals (child_id, subject, t1, t2, t3, t4, year_grade, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [child.id, row.subjectName, fin.t1, fin.t2, fin.t3, fin.t4, fin.year, sortOrder]
        );
        sortOrder += 1;
      }

      for (const [iso, items] of perf.byDate.entries()) {
        const dateDisplay = dateDisplayRuFromIso(iso);
        await pool.query(
          `INSERT INTO grade_history_summary (child_id, date_iso, date_display, grades_json)
           VALUES ($1, $2::date, $3, $4::jsonb)`,
          [child.id, iso, dateDisplay, JSON.stringify(items.map((x) => x.grade))]
        );
        await pool.query(
          `INSERT INTO grade_history_detail (child_id, date_iso, items_json)
           VALUES ($1, $2::date, $3::jsonb)`,
          [
            child.id,
            iso,
            JSON.stringify(items.map((x) => ({ subject: x.subject, activity: "Урок", grade: x.grade }))),
          ]
        );
      }

      for (const [subjectId, byDate] of perf.bySubjectByDate.entries()) {
        for (const [iso, grades] of byDate.entries()) {
          await pool.query(
            `INSERT INTO grade_history_by_subject (child_id, subject_id, date_iso, date_display, grades_json)
             VALUES ($1, $2, $3::date, $4, $5::jsonb)`,
            [child.id, subjectId, iso, dateDisplayRuFromIso(iso), JSON.stringify(grades)]
          );
        }
      }
    }

    const fromClassStudents = students.filter((s) => !s.isDemoChild);
    let performanceFromClass = 0;
    for (const s of fromClassStudents) {
      const ok = await fillPerformanceFromClassDiary(pool, s.id, s.classId);
      if (ok) performanceFromClass += 1;
    }

    const tooSmall = Object.values(classStudentCounts).some((n) => n < 15);
    const tooBig = Object.values(classStudentCounts).some((n) => n > 25);
    if (tooSmall || tooBig) throw new Error("Class size validation failed (must be 15..25)");

    console.log(
      `[seedSimple] classes=${classes.length}, students=${students.length}, demoChildren=${demoChildren.length}, performanceFromClassDiary=${performanceFromClass}/${fromClassStudents.length}`
    );
    console.log("[seedSimple] Готово: база очищена и заполнена реалистичными демо-данными.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seedSimple] Ошибка", err);
  process.exit(1);
});

