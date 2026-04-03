import { Router } from "express";
import bcrypt from "bcrypt";
import * as repo from "../db/directorRepository";
import * as profile from "../profile/service";

export const directorRouter = Router();

function classIdToLabel(classId: string): string {
  return classId.trim().toUpperCase();
}

function normalizeNamePart(part: unknown): string {
  return String(part ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

directorRouter.get("/classes", async (_req, res) => {
  try {
    const classes = await repo.listClasses();
    res.json({ classes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/classes", async (req, res) => {
  try {
    const classId = String(req.body?.classId ?? "").trim().toUpperCase();
    const grade = Number(req.body?.grade ?? 0);
    if (!classId || !Number.isFinite(grade) || grade < 1 || grade > 11) {
      res.status(400).json({ error: "Неверные параметры класса" });
      return;
    }
    await repo.createClass(classId, classIdToLabel(classId), Math.round(grade), req.session?.uid ?? null);
    res.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "CLASS_ALREADY_EXISTS") {
      res.status(409).json({ error: "Класс с таким названием уже существует" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.delete("/classes/:classId", async (req, res) => {
  try {
    const classId = String(req.params.classId).trim().toUpperCase();
    const modeRaw = String(req.query.mode ?? req.body?.mode ?? "").trim().toLowerCase();
    const mode = modeRaw === "move" || modeRaw === "delete" ? modeRaw : "";
    const targetClassId = String(req.query.targetClassId ?? req.body?.targetClassId ?? "")
      .trim()
      .toUpperCase();
    if (!mode) {
      res.status(400).json({ error: "Нужно выбрать режим удаления: move или delete" });
      return;
    }
    if (mode === "move" && !targetClassId) {
      res.status(400).json({ error: "Для переноса укажите целевой класс" });
      return;
    }
    const result = await repo.deleteClass(classId, mode, targetClassId || undefined, req.session?.uid ?? null);
    res.json({ ok: true, ...result });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "CLASS_NOT_FOUND") {
      res.status(404).json({ error: "Класс не найден" });
      return;
    }
    if (e instanceof Error && e.message === "INVALID_TARGET_CLASS") {
      res.status(400).json({ error: "Некорректный целевой класс" });
      return;
    }
    if (e instanceof Error && e.message === "TARGET_CLASS_NOT_FOUND") {
      res.status(404).json({ error: "Целевой класс не найден" });
      return;
    }
    if (e instanceof Error && e.message === "TARGET_CLASS_GRADE_MISMATCH") {
      res.status(400).json({
        error: "Перенос возможен только в класс той же параллели (тот же номер: 1–11)",
      });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.get("/classes/:classId/students", async (req, res) => {
  try {
    const classLabel = classIdToLabel(String(req.params.classId));
    const students = await repo.listStudentsByClass(classLabel);
    res.json({ students });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/classes/:classId/students", async (req, res) => {
  try {
    const classId = classIdToLabel(String(req.params.classId));
    const fullName = String(req.body?.fullName ?? "").trim();
    if (!fullName) {
      res.status(400).json({ error: "Укажите ФИО ученика" });
      return;
    }
    const studentId = `stu-${classId.toLowerCase()}-${Date.now().toString(36)}`;
    const parentLinkCode = await repo.addStudent(studentId, fullName, classId, classId, req.session?.uid ?? null);
    res.json({ ok: true, studentId, parentLinkCode });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "STUDENT_DUPLICATE_IN_CLASS") {
      res.status(409).json({ error: "Ученик с таким ФИО уже есть в этом классе" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.get("/students", async (_req, res) => {
  try {
    const students = await repo.listAllStudents();
    res.json({ students });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/classes/:classId/students/assign", async (req, res) => {
  try {
    const classId = classIdToLabel(String(req.params.classId));
    const studentId = String(req.body?.studentId ?? "").trim();
    if (!studentId) {
      res.status(400).json({ error: "Нужно выбрать ученика" });
      return;
    }
    await repo.assignStudentToClass(studentId, classId);
    res.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "STUDENT_NOT_FOUND") {
      res.status(404).json({ error: "Ученик не найден" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.delete("/classes/:classId/students/:studentId", async (req, res) => {
  try {
    await repo.removeStudent(
      String(req.params.studentId),
      classIdToLabel(String(req.params.classId)),
      req.session?.uid ?? null
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/classes/:classId/students/bulk", async (req, res) => {
  try {
    const classId = classIdToLabel(String(req.params.classId));
    const rows = Array.isArray(req.body?.students) ? req.body.students : [];
    const students = rows.map((s: Record<string, unknown>, idx: number) => ({
      line: Number(s.line ?? idx + 1),
      lastName: normalizeNamePart(s.lastName),
      firstName: normalizeNamePart(s.firstName),
      patronymic: normalizeNamePart(s.patronymic),
    }));
    const result = await repo.bulkAddStudentsToClass(classId, students, req.session?.uid ?? null);
    res.json(result);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "CLASS_NOT_FOUND") {
      res.status(404).json({ error: "Класс не найден" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.get("/audit-log", async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 20);
    const items = await repo.listAuditLog(Number.isFinite(limit) ? limit : 20);
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.get("/parents", async (_req, res) => {
  try {
    const limitRaw = Number(_req.query.limit ?? 15);
    const offsetRaw = Number(_req.query.offset ?? 0);
    const search = String(_req.query.search ?? "").trim();
    const filterRaw = String(_req.query.filter ?? "all").trim().toLowerCase();
    const sortByRaw = String(_req.query.sortBy ?? "name").trim().toLowerCase();
    const sortDirRaw = String(_req.query.sortDir ?? "asc").trim().toLowerCase();
    const filter =
      filterRaw === "confirmed" || filterRaw === "pending" || filterRaw === "empty"
        ? filterRaw
        : "all";
    const sortBy = sortByRaw === "children" ? "children" : "name";
    const sortDir = sortDirRaw === "desc" ? "desc" : "asc";
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.trunc(limitRaw))) : 15;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.trunc(offsetRaw)) : 0;
    const page = await repo.listParentsPaged({ limit, offset, search, filter, sortBy, sortDir });
    res.json({
      parents: page.parents,
      page: {
        limit,
        offset,
        total: page.total,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.get("/parents/:parentUserId/profile", async (req, res) => {
  try {
    const parentUserId = Number(req.params.parentUserId);
    if (!Number.isFinite(parentUserId)) {
      res.status(400).json({ error: "Некорректный id родителя" });
      return;
    }
    const payload = await profile.getProfileForParentUserId(Math.round(parentUserId));
    if (!payload) {
      res.status(404).json({ error: "Родитель не найден" });
      return;
    }
    res.json({ profile: payload });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/parent-links", async (req, res) => {
  try {
    const parentUserId = Number(req.body?.parentUserId);
    const studentId = String(req.body?.studentId ?? "").trim();
    if (!Number.isFinite(parentUserId) || !studentId) {
      res.status(400).json({ error: "Неверные параметры привязки" });
      return;
    }
    await repo.linkChildToParent(Math.round(parentUserId), studentId);
    res.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "STUDENT_NOT_FOUND") {
      res.status(404).json({ error: "Ученик не найден" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/classes/:classId/students/:studentId/link-key", async (req, res) => {
  try {
    const classId = String(req.params.classId || "").trim().toUpperCase();
    const studentId = String(req.params.studentId || "").trim();
    const ttlDaysRaw = Number(req.body?.ttlDays ?? 7);
    if (!classId || !studentId) {
      res.status(400).json({ error: "Некорректные параметры" });
      return;
    }
    const ttlDays = Number.isFinite(ttlDaysRaw) ? Math.max(1, Math.min(30, Math.round(ttlDaysRaw))) : 7;
    const out = await repo.createOrRotateParentLinkKey(studentId, classId, Number(req.session?.uid ?? 0), ttlDays);
    res.json({ ok: true, key: out.key, keyId: out.id, expiresAt: out.expiresAt });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "STUDENT_NOT_FOUND") {
      res.status(404).json({ error: "Ученик не найден" });
      return;
    }
    if (e instanceof Error && e.message === "STUDENT_CLASS_MISMATCH") {
      res.status(400).json({ error: "Ученик не относится к выбранному классу" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/link-keys/:keyId/revoke", async (req, res) => {
  try {
    const keyId = Number(req.params.keyId);
    if (!Number.isFinite(keyId)) {
      res.status(400).json({ error: "Некорректный id ключа" });
      return;
    }
    await repo.revokeParentLinkKey(Math.round(keyId));
    res.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "LINK_KEY_NOT_FOUND_OR_INACTIVE") {
      res.status(404).json({ error: "Ключ не найден или уже неактивен" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.get("/link-keys", async (req, res) => {
  try {
    const classId = String(req.query.classId ?? "").trim().toUpperCase();
    const statusRaw = String(req.query.status ?? "all").trim().toLowerCase();
    const status =
      statusRaw === "active" || statusRaw === "revoked" || statusRaw === "expired" ? statusRaw : "all";
    const items = await repo.listParentLinkKeys({
      classId: classId || undefined,
      status,
      limit: Number(req.query.limit ?? 100),
    });
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.get("/teachers", async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit ?? 15);
    const offsetRaw = Number(req.query.offset ?? 0);
    const search = String(req.query.search ?? "").trim();
    const sortByRaw = String(req.query.sortBy ?? "name").trim().toLowerCase();
    const sortDirRaw = String(req.query.sortDir ?? "asc").trim().toLowerCase();
    const sortBy = sortByRaw === "name" ? "name" : "name";
    const sortDir = sortDirRaw === "desc" ? "desc" : "asc";
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.trunc(limitRaw))) : 15;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.trunc(offsetRaw)) : 0;
    const page = await repo.listTeachersWithSubjectsPaged({ limit, offset, search, sortBy, sortDir });
    res.json({
      teachers: page.teachers,
      page: {
        limit,
        offset,
        total: page.total,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/teachers", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const lastName = String(req.body?.lastName ?? "").trim();
    const firstName = String(req.body?.firstName ?? "").trim();
    const patronymic = String(req.body?.patronymic ?? "").trim();
    if (!email || !password || !lastName || !firstName) {
      res.status(400).json({ error: "Укажите почту, пароль и ФИО" });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const teacherId = await repo.createTeacher(email, hash, lastName, firstName, patronymic);
    res.json({ ok: true, teacherId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.delete("/teachers/:teacherUserId", async (req, res) => {
  try {
    const teacherUserId = Number(req.params.teacherUserId);
    if (!Number.isFinite(teacherUserId)) {
      res.status(400).json({ error: "Некорректный id" });
      return;
    }
    await repo.deleteTeacher(Math.round(teacherUserId));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.put("/teachers/:teacherUserId/subjects", async (req, res) => {
  try {
    const teacherUserId = Number(req.params.teacherUserId);
    const subjectsRaw = Array.isArray(req.body?.subjects) ? req.body.subjects : [];
    const subjects = subjectsRaw
      .map((s: unknown) => String(s).trim())
      .filter((s: string) => s.length > 0);
    if (!Number.isFinite(teacherUserId)) {
      res.status(400).json({ error: "Некорректный id учителя" });
      return;
    }
    await repo.setTeacherSubjects(Math.round(teacherUserId), subjects);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.get("/schedule", async (req, res) => {
  try {
    const classId = String(req.query.classId ?? "").trim().toUpperCase();
    const quarter = Number(req.query.quarter ?? 4);
    if (!classId || !Number.isFinite(quarter) || quarter < 1 || quarter > 4) {
      res.status(400).json({ error: "Неверные параметры" });
      return;
    }
    const items = await repo.getQuarterSchedule(classId, Math.round(quarter));
    res.json({ classId, quarter, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.put("/schedule/:classId/:quarter", async (req, res) => {
  try {
    const classId = String(req.params.classId).trim().toUpperCase();
    const quarter = Number(req.params.quarter);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!classId || !Number.isFinite(quarter) || quarter < 1 || quarter > 4) {
      res.status(400).json({ error: "Неверные параметры" });
      return;
    }
    await repo.saveQuarterSchedule(
      classId,
      Math.round(quarter),
      items.map((x: Record<string, unknown>) => ({
        weekdayIdx: Number(x.weekdayIdx),
        lessonOrder: Number(x.lessonOrder),
        subjectName: String(x.subjectName ?? "").trim(),
        teacherUserId:
          x.teacherUserId === null || x.teacherUserId === undefined
            ? null
            : Number(x.teacherUserId),
        timeLabel: String(x.timeLabel ?? "").trim(),
      }))
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/schedule/validate", async (req, res) => {
  try {
    const quarter = Number(req.body?.quarter ?? 4);
    if (!Number.isFinite(quarter) || quarter < 1 || quarter > 4) {
      res.status(400).json({ error: "Неверный номер четверти" });
      return;
    }
    const conflicts = await repo.validateQuarterConflicts(Math.round(quarter));
    res.json({ quarter, conflicts, ok: conflicts.length === 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/schedule/resources/estimate", async (req, res) => {
  try {
    const quarter = Number(req.body?.quarter ?? 4);
    const dayLimit = Number(req.body?.dayLimit ?? 5);
    if (!Number.isFinite(quarter) || quarter < 1 || quarter > 4) {
      res.status(400).json({ error: "Неверный номер четверти" });
      return;
    }
    if (!Number.isFinite(dayLimit) || dayLimit < 1 || dayLimit > 8) {
      res.status(400).json({ error: "Некорректный лимит уроков в день" });
      return;
    }
    const rawMap = req.body?.subjectRoomTypeMap;
    const subjectRoomTypeMap: Record<string, string> = {};
    if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
      Object.entries(rawMap as Record<string, unknown>).forEach(([k, v]) => {
        const key = String(k || "").trim();
        const val = String(v ?? "").trim();
        if (key) subjectRoomTypeMap[key] = val || "regular";
      });
    }
    const result = await repo.estimateResourcesFromQuarter(
      Math.round(quarter),
      Math.round(dayLimit),
      subjectRoomTypeMap
    );
    res.json({ quarter: Math.round(quarter), dayLimit: Math.round(dayLimit), ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

directorRouter.post("/teachers/generate-from-schedule", async (req, res) => {
  try {
    const quarter = Number(req.body?.quarter ?? 4);
    const dayLimit = Number(req.body?.dayLimit ?? 5);
    if (!Number.isFinite(quarter) || quarter < 1 || quarter > 4) {
      res.status(400).json({ error: "Неверный номер четверти" });
      return;
    }
    const estimate = await repo.estimateResourcesFromQuarter(Math.round(quarter), Math.round(dayLimit), {});
    const shortages = estimate.teachersRequiredBySubject.filter((x) => x.shortage > 0);
    if (!shortages.length) {
      res.json({ ok: true, createdCount: 0, created: [] });
      return;
    }
    const passwordHash = await bcrypt.hash("TeacherAuto2026", 10);
    const created: Array<{ teacherId: number; email: string; subjectName: string }> = [];
    for (const s of shortages) {
      for (let i = 0; i < s.shortage; i += 1) {
        const base = `${slugify(s.subjectName)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const email = `auto.${base}@school.local`;
        const teacherId = await repo.createTeacher(
          email,
          passwordHash,
          "Авто",
          `Преподаватель ${i + 1}`,
          s.subjectName
        );
        await repo.setTeacherSubjects(teacherId, [s.subjectName]);
        created.push({ teacherId, email, subjectName: s.subjectName });
      }
    }
    res.json({ ok: true, createdCount: created.length, created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});
