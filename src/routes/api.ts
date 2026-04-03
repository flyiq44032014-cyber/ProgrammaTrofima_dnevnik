import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import * as store from "../data/store";
import { catchAsync } from "../middleware/catchAsync";
import type { FinalsPayload, PerformancePayload } from "../types";

function emptyPerformancePayload(): PerformancePayload {
  const now = new Date();
  return {
    quarterLabel: "—",
    dateLabel: "—",
    dayNum: 0,
    weekday: "—",
    monthGenitive: "—",
    year: now.getFullYear(),
    rows: [],
  };
}

function emptyFinalsPayload(): FinalsPayload {
  return { yearLabel: "—", rows: [] };
}

export const apiRouter = Router();

async function ensureParentOwnsChild(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uid = Number(req.session?.uid);
    const childId = String(req.params.childId ?? "");
    if (!Number.isFinite(uid) || !childId) {
      res.status(400).json({ error: "Некорректный запрос" });
      return;
    }
    const ok = await store.childBelongsToParent(uid, childId);
    if (!ok) {
      res.status(403).json({ error: "Нет доступа к этому ученику" });
      return;
    }
    next();
  } catch (e) {
    next(e);
  }
}

apiRouter.get(
  "/version",
  catchAsync(async (req, res) => {
    const uid = req.session?.uid;
    if (!uid) {
      res.status(401).json({ error: "Требуется вход" });
      return;
    }
    const children = store.childrenForParentPicker(await store.getChildrenForParent(uid));
    res.json({
      app: "elektronnyj-dnevnik",
      pupils: children.map((c) => ({ id: c.id, name: c.name })),
    });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children",
  catchAsync(async (req, res) => {
    const uid = Number(req.session?.uid);
    if (!Number.isFinite(uid)) {
      res.status(401).json({ error: "Требуется вход" });
      return;
    }
    const raw = await store.getChildrenForParent(uid);
    const children = store.childrenForParentPicker(raw);
    res.json({ children });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/diary",
  ensureParentOwnsChild,
  catchAsync(async (req, res) => {
    const { childId } = req.params;
    const date = String(req.query.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "Нужен параметр date YYYY-MM-DD" });
      return;
    }
    const day = await store.getDiary(childId, date);
    if (!day) {
      res.status(404).json({ error: "Нет расписания на этот день" });
      return;
    }
    const dates = await store.getDiaryDates(childId);
    res.json({ day, dates });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/diary/meta",
  ensureParentOwnsChild,
  catchAsync(async (req, res) => {
    const { childId } = req.params;
    const dates = await store.getDiaryDates(childId);
    res.json({ dates });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/performance",
  ensureParentOwnsChild,
  catchAsync(async (req, res) => {
    const { childId } = req.params;
    const payload = (await store.getPerformance(childId)) ?? emptyPerformancePayload();
    const subjectId = String(req.query.subject ?? "all");
    res.json({ ...payload, activeSubjectId: subjectId });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/grades",
  ensureParentOwnsChild,
  catchAsync(async (req, res) => {
    const { childId } = req.params;
    const subjectId = String(req.query.subject ?? "all");
    const rows = await store.getGradeHistoryForSubject(childId, subjectId);
    const perf = await store.getPerformance(childId);
    const subjectLabel =
      perf?.rows.find((r) => r.subjectId === subjectId)?.subjectName ??
      (subjectId === "all" ? "Все предметы" : subjectId);
    res.json({ subjectId, subjectLabel, rows });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/grades/:isoDate",
  ensureParentOwnsChild,
  catchAsync(async (req, res) => {
    const { childId, isoDate } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      res.status(400).json({ error: "Неверная дата" });
      return;
    }
    const subjectId = String(req.query.subject ?? "all");
    let detail = await store.getGradeHistoryDetail(childId, isoDate);
    if (!detail) {
      res.status(404).json({ error: "Нет оценок за этот день" });
      return;
    }
    if (subjectId !== "all") {
      const perf = await store.getPerformance(childId);
      const subjName = perf?.rows.find((r) => r.subjectId === subjectId)
        ?.subjectName;
      if (subjName) {
        const items = detail.items.filter((i) => i.subject === subjName);
        detail = { ...detail, items };
      }
    }
    res.json({ detail });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/finals",
  ensureParentOwnsChild,
  catchAsync(async (req, res) => {
    const { childId } = req.params;
    const payload = (await store.getFinals(childId)) ?? emptyFinalsPayload();
    res.json(payload);
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/meeting",
  ensureParentOwnsChild,
  catchAsync(async (req, res) => {
    const { childId } = req.params;
    const meeting = await store.getMeetingForChild(childId);
    res.json({ meeting });
  }, { error: "Ошибка БД" })
);

apiRouter.use((_req, res) => {
  res.status(404).json({ error: "Не найдено" });
});
