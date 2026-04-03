import { Router } from "express";
import fs from "fs";
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

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

// #region agent log
function teacherDebugLog(
  runId: string,
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
): void {
  try {
    const payload = {
      sessionId: "00b601",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    };
    fs.appendFileSync("debug-00b601.log", `${JSON.stringify(payload)}\n`, "utf8");
  } catch {
    // ignore logging errors
  }
}
// #endregion agent log

async function listClassesSafe(req: import("express").Request) {
  if (!DB_ENABLED) return mem.memListClasses();
  try {
    const uid = req.session && typeof req.session.uid === "number" ? req.session.uid : null;
    if (uid) {
      const classes = await listSchoolClassesForTeacher(uid, SEED_SIMPLE_QUARTER);
      teacherDebugLog(
        "teacher-classes",
        "H-teacher-classes-from-schedule",
        "routes/teacher.ts:listClassesSafe",
        "listSchoolClassesForTeacher result",
        { uid, quarter: SEED_SIMPLE_QUARTER, count: classes.length }
      );
      return classes;
    }
    const all = await listSchoolClasses();
    teacherDebugLog(
      "teacher-classes",
      "H-teacher-classes-fallback-all",
      "routes/teacher.ts:listClassesSafe",
      "listSchoolClasses fallback (no uid)",
      { hasSession: Boolean(req.session), count: all.length }
    );
    return all;
  } catch (e) {
    console.warn("teacher: классы из памяти (БД недоступна)", e);
    return mem.memListClasses();
  }
}

async function rosterSafe(classId: string) {
  if (!DB_ENABLED) return mem.memGetRoster(classId);
  try {
    const names = await getClassRoster(classId);
    teacherDebugLog(
      "teacher-roster",
      "H-roster-from-db",
      "routes/teacher.ts:rosterSafe",
      "getClassRoster result",
      { classId, count: names.length }
    );
    return names;
  } catch (e) {
    console.warn("teacher: список класса из памяти (БД недоступна)", e);
    return mem.memGetRoster(classId);
  }
}

async function diaryDaySafe(classId: string, isoDate: string) {
  if (!DB_ENABLED) return mem.memGetClassDiary(classId, isoDate);
  try {
    const day = await getClassDiary(classId, isoDate);
    teacherDebugLog(
      "teacher-diary",
      "H-diary-empty-or-not",
      "routes/teacher.ts:diaryDaySafe",
      "getClassDiary result",
      { classId, isoDate, hasDay: Boolean(day), lessons: day ? day.lessons.length : 0 }
    );
    return day;
  } catch (e) {
    console.warn("teacher: день из памяти (БД недоступна)", e);
    return mem.memGetClassDiary(classId, isoDate);
  }
}

async function diaryDatesSafe(classId: string) {
  if (!DB_ENABLED) return mem.memGetClassDiaryDates(classId);
  try {
    return await getClassDiaryDates(classId);
  } catch (e) {
    console.warn("teacher: даты из памяти (БД недоступна)", e);
    return mem.memGetClassDiaryDates(classId);
  }
}

async function subjectsForTeacherUserId(uid: number): Promise<string[]> {
  if (!DB_ENABLED) {
    const p = mem.memTeacherProfile();
    return Array.isArray((p as { subjects?: string[] }).subjects)
      ? (p as { subjects: string[] }).subjects
      : [TEACHER_PRIMARY_LESSON_TITLE];
  }
  let list = await directorRepo.listTeacherSubjectNames(uid);
  if (!list.length) {
    list = [TEACHER_PRIMARY_LESSON_TITLE];
  }
  return list;
}

teacherRouter.get("/profile", async (req, res) => {
  const uid = req.session!.uid!;
  if (!DB_ENABLED) {
    const p = mem.memTeacherProfile();
    const subjects =
      (p as { subjects?: string[] }).subjects?.length
        ? (p as { subjects: string[] }).subjects
        : [p.subject];
    const subject = ensureTeacherActiveSubject(getTeacherSession(req), subjects);
    res.json({
      name: p.name,
      subject,
      subjects,
    });
    return;
  }
  try {
    const card = await directorRepo.getTeacherCardByUserId(uid);
    if (!card) {
      res.status(404).json({ error: "Учитель не найден" });
      return;
    }
    const subjects = card.subjects.length ? card.subjects : [TEACHER_PRIMARY_LESSON_TITLE];
    const subject = ensureTeacherActiveSubject(getTeacherSession(req), subjects);
    teacherDebugLog(
      "teacher-profile",
      "H-profile-subjects",
      "routes/teacher.ts:GET /profile",
      "teacher profile subjects",
      { uid, fullName: card.fullName, subjects, active: subject }
    );
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
    teacherDebugLog(
      "teacher-classes",
      "H-teacher-classes-response",
      "routes/teacher.ts:GET /classes",
      "teacher classes response",
      {
        uid: req.session && typeof req.session.uid === "number" ? req.session.uid : null,
        count: classes.length,
        ids: classes.map((c) => c.id),
      }
    );
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
    const hashStrLocal = (s: string): number => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i += 1) {
        h ^= s.charCodeAt(i);
        h +=
          (h << 1) +
          (h << 4) +
          (h << 7) +
          (h << 8) +
          (h << 24);
      }
      return Math.abs(h >>> 0);
    };
    const students = roster.map((fullName) => {
      const key = `${classId}|${isoDate}|${lesson.id || lesson.order}|${fullName}`;
      const h = hashStrLocal(key);
      const absent = h % 10 === 0;
      let lessonGrade: number | null = null;
      if (!absent) {
        const delta = (h % 3) - 1; // -1,0,+1
        const g = Math.max(2, Math.min(5, baseGrade + delta));
        lessonGrade = g;
      }
      return {
        studentKey: fullName,
        name: fullName,
        lessonGrade,
        absent,
      };
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
      let ok = false;
      if (DB_ENABLED) {
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
