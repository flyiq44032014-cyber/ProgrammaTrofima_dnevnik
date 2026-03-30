import { Router } from "express";
import * as store from "../data/store";
import { catchAsync } from "../middleware/catchAsync";

export const apiRouter = Router();

apiRouter.get(
  "/version",
  catchAsync(async (_req, res) => {
    const children = store.childrenForParentPicker(await store.getChildren());
    res.json({
      app: "elektronnyj-dnevnik",
      pupils: children.map((c) => ({ id: c.id, name: c.name })),
    });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children",
  catchAsync(async (_req, res) => {
    const children = store.childrenForParentPicker(await store.getChildren());
    res.json({ children });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/diary",
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
  catchAsync(async (req, res) => {
    const { childId } = req.params;
    const dates = await store.getDiaryDates(childId);
    res.json({ dates });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/performance",
  catchAsync(async (req, res) => {
    const { childId } = req.params;
    const payload = await store.getPerformance(childId);
    if (!payload) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    const subjectId = String(req.query.subject ?? "all");
    res.json({ ...payload, activeSubjectId: subjectId });
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/grades",
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
  catchAsync(async (req, res) => {
    const { childId } = req.params;
    const payload = await store.getFinals(childId);
    if (!payload) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    res.json(payload);
  }, { error: "Ошибка БД" })
);

apiRouter.get(
  "/children/:childId/meeting",
  catchAsync(async (req, res) => {
    const { childId } = req.params;
    const meeting = await store.getMeetingForChild(childId);
    res.json({ meeting });
  }, { error: "Ошибка БД" })
);

apiRouter.use((_req, res) => {
  res.status(404).json({ error: "Не найдено" });
});
