import { Router } from "express";
import * as mem from "../data/teacherMemory";
import {
  getClassDiary,
  getClassDiaryDates,
  getClassRoster,
  listSchoolClasses,
  TEACHER_PROFILE,
  updateClassLesson,
} from "../db/teacherRepository";

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
    const day = await diaryDaySafe(classId, date);
    if (!day) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    const dates = await diaryDatesSafe(classId);
    res.json({ day, dates });
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
