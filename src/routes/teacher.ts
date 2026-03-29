import { Router } from "express";
import type { DiaryDay } from "../types";
import { CHEMISTRY_LESSON_TITLE } from "../data/teacherSeedData";
import * as mem from "../data/teacherMemory";
import {
  getClassDiary,
  getClassDiaryDates,
  getClassRoster,
  listSchoolClasses,
  TEACHER_PROFILE,
  updateClassLesson,
} from "../db/teacherRepository";

/** Для режима учителя химии в API отдаём только урок химии (родители по-прежнему видят полный день). */
function diaryChemLessonsOnly(day: DiaryDay): DiaryDay {
  return {
    ...day,
    lessons: day.lessons.filter((l) => l.title === CHEMISTRY_LESSON_TITLE),
  };
}

export const teacherRouter = Router();

function useDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function listClassesSafe() {
  if (!useDb()) return mem.memListClasses();
  try {
    return await listSchoolClasses();
  } catch (e) {
    console.warn("teacher: классы из памяти (БД недоступна)", e);
    return mem.memListClasses();
  }
}

async function rosterSafe(classId: string) {
  if (!useDb()) return mem.memGetRoster(classId);
  try {
    return await getClassRoster(classId);
  } catch (e) {
    console.warn("teacher: список класса из памяти (БД недоступна)", e);
    return mem.memGetRoster(classId);
  }
}

async function diaryDaySafe(classId: string, isoDate: string) {
  if (!useDb()) return mem.memGetClassDiary(classId, isoDate);
  try {
    return await getClassDiary(classId, isoDate);
  } catch (e) {
    console.warn("teacher: день из памяти (БД недоступна)", e);
    return mem.memGetClassDiary(classId, isoDate);
  }
}

async function diaryDatesSafe(classId: string) {
  if (!useDb()) return mem.memGetClassDiaryDates(classId);
  try {
    return await getClassDiaryDates(classId);
  } catch (e) {
    console.warn("teacher: даты из памяти (БД недоступна)", e);
    return mem.memGetClassDiaryDates(classId);
  }
}

teacherRouter.get("/profile", (_req, res) => {
  res.json(useDb() ? TEACHER_PROFILE : mem.memTeacherProfile());
});

teacherRouter.get("/classes", async (_req, res) => {
  try {
    const classes = await listClassesSafe();
    res.json({ classes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка" });
  }
});

teacherRouter.get("/classes/:classId/roster", async (req, res) => {
  try {
    const { classId } = req.params;
    const names = await rosterSafe(classId);
    res.json({ names });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка" });
  }
});

teacherRouter.get("/classes/:classId/diary", async (req, res) => {
  const { classId } = req.params;
  const date = String(req.query.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Нужен date YYYY-MM-DD" });
    return;
  }
  try {
    const dayRaw = await diaryDaySafe(classId, date);
    if (!dayRaw) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    const dates = await diaryDatesSafe(classId);
    res.json({ day: diaryChemLessonsOnly(dayRaw), dates });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка" });
  }
});

teacherRouter.get("/classes/:classId/chemistry-day/:isoDate", async (req, res) => {
  const { classId, isoDate } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    res.status(400).json({ error: "Нужна дата YYYY-MM-DD" });
    return;
  }
  try {
    const roster = await rosterSafe(classId);
    const day = await diaryDaySafe(classId, isoDate);
    if (!day) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    const sheet = mem.memGetChemistryDay(classId, isoDate, roster);
    if (!sheet) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    res.json(sheet);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка" });
  }
});

teacherRouter.put(
  "/classes/:classId/chemistry-day/:isoDate/students/:studentKey",
  async (req, res) => {
    const { classId, isoDate, studentKey } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      res.status(400).json({ error: "Неверная дата" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const patch: { lessonGrade?: 2 | 3 | 4 | 5 | null; absent?: boolean } = {};
    if (body.lessonGrade === null || body.lessonGrade === "")
      patch.lessonGrade = null;
    else if (typeof body.lessonGrade === "number") {
      const g = body.lessonGrade;
      if (![2, 3, 4, 5].includes(g)) {
        res.status(400).json({ error: "Оценка 2–5 или пусто" });
        return;
      }
      patch.lessonGrade = g as 2 | 3 | 4 | 5;
    }
    if (typeof body.absent === "boolean") patch.absent = body.absent;
    const wantsGrade =
      patch.lessonGrade !== undefined && patch.lessonGrade !== null;
    if (patch.absent === true && wantsGrade) {
      res.status(400).json({
        error: "При отметке пропуска оценку за урок поставить нельзя",
      });
      return;
    }
    try {
      const roster = await rosterSafe(classId);
      const ok = mem.memPatchChemStudent(
        classId,
        isoDate,
        decodeURIComponent(studentKey),
        roster.length,
        patch
      );
      if (!ok) {
        res.status(404).json({ error: "Ученик не найден" });
        return;
      }
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Ошибка сохранения" });
    }
  }
);

teacherRouter.get("/classes/:classId/students/:studentKey/stats", async (req, res) => {
  const { classId, studentKey } = req.params;
  try {
    const roster = await rosterSafe(classId);
    const stats = mem.memGetStudentStats(classId, decodeURIComponent(studentKey), roster);
    if (!stats) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    res.json(stats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка" });
  }
});

teacherRouter.get("/classes/:classId/quarter-stats", async (req, res) => {
  const { classId } = req.params;
  try {
    const roster = await rosterSafe(classId);
    res.json(mem.memGetQuarterTable(classId, roster));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка" });
  }
});

teacherRouter.post("/classes/:classId/meeting", async (req, res) => {
  const { classId } = req.params;
  const body = req.body as Record<string, unknown>;
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  const topic = typeof body.topic === "string" ? body.topic : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Нужна дата YYYY-MM-DD" });
    return;
  }
  if (!time.trim()) {
    res.status(400).json({ error: "Укажите время" });
    return;
  }
  if (!topic.trim()) {
    res.status(400).json({ error: "Укажите тему" });
    return;
  }
  try {
    mem.memSetMeeting(classId, { date, time: time.trim(), topic: topic.trim() });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка" });
  }
});

teacherRouter.put(
  "/classes/:classId/diary/:isoDate/lessons/:lessonKey",
  async (req, res) => {
    const { classId, isoDate, lessonKey } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      res.status(400).json({ error: "Неверная дата" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const patch: Parameters<typeof updateClassLesson>[3] = {};
    if (typeof body.title === "string") patch.title = body.title;
    if (typeof body.timeLabel === "string") patch.timeLabel = body.timeLabel;
    if (body.teacher !== undefined) patch.teacher = body.teacher as string | null;
    if (body.topic !== undefined) patch.topic = body.topic as string | null;
    if (body.homework !== undefined) patch.homework = body.homework as string | null;
    if (body.controlWork !== undefined) patch.controlWork = body.controlWork as string | null;
    if (body.place !== undefined) patch.place = body.place as string | null;
    if (body.homeworkNext !== undefined)
      patch.homeworkNext = body.homeworkNext as string | null;
    if (body.grade !== undefined)
      patch.grade = body.grade === null ? null : Number(body.grade);

    const keyDecoded = decodeURIComponent(lessonKey);
    try {
      let ok = false;
      if (useDb()) {
        try {
          ok = await updateClassLesson(classId, isoDate, keyDecoded, patch);
        } catch (e) {
          console.warn("teacher: сохранение в память (БД недоступна)", e);
          ok = mem.memUpdateLesson(classId, isoDate, keyDecoded, patch);
        }
      } else {
        ok = mem.memUpdateLesson(classId, isoDate, keyDecoded, patch);
      }
      if (!ok) {
        res.status(404).json({ error: "Урок не найден" });
        return;
      }
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Ошибка сохранения" });
    }
  }
);
