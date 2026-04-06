import { Router } from "express";
import type { DiaryDay } from "../types";
import { TEACHER_PRIMARY_LESSON_TITLE } from "../data/teacherSeedData";
import * as mem from "../data/teacherMemory";
import {
  SEED_SIMPLE_QUARTER,
  getClassDiary,
  getClassDiaryDates,
  getClassRoster,
  listSchoolClasses,
  listSchoolClassesForTeacher,
  updateClassLesson,
} from "../db/teacherRepository";
import * as directorRepo from "../db/directorRepository";
import { buildChemistryDayStudentRows } from "../lib/chemistryDayStudents";

type SessionWithTeacherSubject = {
  teacherActiveSubject?: string;
};

function getTeacherSession(req: import("express").Request): SessionWithTeacherSubject {
  return req.session as SessionWithTeacherSubject;
}

function ensureTeacherActiveSubject(
  sess: SessionWithTeacherSubject,
  subjects: string[]
): string {
  if (!subjects.length) {
    const fb = TEACHER_PRIMARY_LESSON_TITLE;
    sess.teacherActiveSubject = fb;
    return fb;
  }
  const cur = String(sess.teacherActiveSubject ?? "").trim();
  if (cur && subjects.includes(cur)) return cur;
  if (subjects.includes("Математика")) {
    sess.teacherActiveSubject = "Математика";
    return "Математика";
  }
  sess.teacherActiveSubject = subjects[0];
  return subjects[0];
}

function diaryLessonsForSubject(day: DiaryDay, subjectTitle: string): DiaryDay {
  return {
    ...day,
    lessons: day.lessons.filter((l) => l.title === subjectTitle),
  };
}

function gradesSheetAllowed(_activeSubject: string): boolean {
  // Сводная таблица оценок/пропусков теперь доступна для любого активного предмета учителя.
  return true;
}

export const teacherRouter = Router();

async function listClassesSafe(req: import("express").Request) {
  const uid = req.session && typeof req.session.uid === "number" ? req.session.uid : null;
  if (uid) {
    return listSchoolClassesForTeacher(uid, SEED_SIMPLE_QUARTER);
  }
  return listSchoolClasses();
}

async function rosterSafe(classId: string) {
  return getClassRoster(classId);
}

async function diaryDaySafe(classId: string, isoDate: string) {
  return getClassDiary(classId, isoDate);
}

async function diaryDatesSafe(classId: string) {
  return getClassDiaryDates(classId);
}

async function subjectsForTeacherUserId(uid: number): Promise<string[]> {
  let list = await directorRepo.listTeacherSubjectNames(uid);
  if (!list.length) {
    list = [TEACHER_PRIMARY_LESSON_TITLE];
  }
  return list;
}

teacherRouter.get("/profile", async (req, res) => {
  const uid = req.session!.uid!;
  try {
    const card = await directorRepo.getTeacherCardByUserId(uid);
    if (!card) {
      res.status(404).json({ error: "Учитель не найден" });
      return;
    }
    const subjects = card.subjects.length ? card.subjects : [TEACHER_PRIMARY_LESSON_TITLE];
    const subject = ensureTeacherActiveSubject(getTeacherSession(req), subjects);
    res.json({
      name: card.fullName || "Учитель",
      subject,
      subjects,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка" });
  }
});

teacherRouter.patch("/active-subject", async (req, res) => {
  const uid = req.session!.uid!;
  const subjectName = String(req.body?.subjectName ?? "").trim();
  if (!subjectName) {
    res.status(400).json({ error: "Укажите предмет" });
    return;
  }
  try {
    const subjects = await subjectsForTeacherUserId(uid);
    if (!subjects.includes(subjectName)) {
      res.status(400).json({ error: "Этот предмет не назначен учителю" });
      return;
    }
    getTeacherSession(req).teacherActiveSubject = subjectName;
    res.json({ ok: true, subject: subjectName, subjects });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка" });
  }
});

teacherRouter.get("/classes", async (req, res) => {
  try {
    const classes = await listClassesSafe(req);
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
  const uid = req.session!.uid!;
  try {
    const dayRaw = await diaryDaySafe(classId, date);
    if (!dayRaw) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    const dates = await diaryDatesSafe(classId);
    const subjects = await subjectsForTeacherUserId(uid);
    const subject = ensureTeacherActiveSubject(getTeacherSession(req), subjects);
    const day = diaryLessonsForSubject(dayRaw, subject);
    res.json({ day, dates });
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
  const uid = req.session!.uid!;
  try {
    const subjects = await subjectsForTeacherUserId(uid);
    const active = ensureTeacherActiveSubject(getTeacherSession(req), subjects);
    if (!gradesSheetAllowed(active)) {
      res.status(404).json({
        error: "Оценки и посещаемость за день недоступны для выбранного предмета",
      });
      return;
    }
    const roster = await rosterSafe(classId);
    const day = await diaryDaySafe(classId, isoDate);
    if (!day) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    const lesson = day.lessons.find((l) => l.title === active);
    if (!lesson) {
      res.status(404).json({ error: "Нет урока по этому предмету в выбранный день" });
      return;
    }
    const baseGradeRaw = typeof lesson.grade === "number" ? Number(lesson.grade) : 4;
    const baseGrade = Number.isFinite(baseGradeRaw) ? baseGradeRaw : 4;
    const lessonSlotKey = String(lesson.id || lesson.order);
    const students = buildChemistryDayStudentRows({
      classId,
      isoDate,
      lessonSlotKey,
      subjectTitle: active,
      baseGrade,
      roster,
    });
    res.json({
      classId,
      date: isoDate,
      subject: active,
      lessonOrder: lesson.order,
      timeLabel: lesson.timeLabel,
      students,
    });
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
    const uid = req.session!.uid!;
    const subjectsPut = await subjectsForTeacherUserId(uid);
    const activePut = ensureTeacherActiveSubject(getTeacherSession(req), subjectsPut);
    if (!gradesSheetAllowed(activePut)) {
      res.status(400).json({
        error: "Редактирование оценок доступно только при активном предмете «Математика»",
      });
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

teacherRouter.get("/classes/:classId/meeting", async (req, res) => {
  const { classId } = req.params;
  try {
    const meeting = mem.memGetMeeting(classId);
    res.json({ meeting });
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
      const ok = await updateClassLesson(classId, isoDate, keyDecoded, patch);
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
