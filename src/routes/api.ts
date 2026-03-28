import { Router } from "express";
import {
  getChildren,
  getDiary,
  getDiaryDates,
  getFinals,
  getGradeHistoryDetail,
  getGradeHistoryForSubject,
  getPerformance,
} from "../data/mock";

export const apiRouter = Router();

/** Проверка: откройте в браузере /api/version — должны быть актуальные имена из mock.ts */
apiRouter.get("/version", (_req, res) => {
  res.json({
    app: "elektronnyj-dnevnik",
    pupils: getChildren().map((c) => ({ id: c.id, name: c.name })),
  });
});

apiRouter.get("/children", (_req, res) => {
  res.json({ children: getChildren() });
});

apiRouter.get("/children/:childId/diary", (req, res) => {
  const { childId } = req.params;
  const date = String(req.query.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Нужен параметр date YYYY-MM-DD" });
    return;
  }
  const day = getDiary(childId, date);
  if (!day) {
    res.status(404).json({ error: "Нет расписания на этот день" });
    return;
  }
  res.json({ day, dates: getDiaryDates(childId) });
});

apiRouter.get("/children/:childId/diary/meta", (req, res) => {
  const { childId } = req.params;
  res.json({ dates: getDiaryDates(childId) });
});

apiRouter.get("/children/:childId/performance", (req, res) => {
  const { childId } = req.params;
  const payload = getPerformance(childId);
  if (!payload) {
    res.status(404).json({ error: "Нет данных" });
    return;
  }
  const subjectId = String(req.query.subject ?? "all");
  res.json({ ...payload, activeSubjectId: subjectId });
});

apiRouter.get("/children/:childId/grades", (req, res) => {
  const { childId } = req.params;
  const subjectId = String(req.query.subject ?? "all");
  const rows = getGradeHistoryForSubject(childId, subjectId);
  const perf = getPerformance(childId);
  const subjectLabel =
    perf?.rows.find((r) => r.subjectId === subjectId)?.subjectName ??
    (subjectId === "all" ? "Все предметы" : subjectId);
  res.json({ subjectId, subjectLabel, rows });
});

apiRouter.get("/children/:childId/grades/:isoDate", (req, res) => {
  const { childId, isoDate } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    res.status(400).json({ error: "Неверная дата" });
    return;
  }
  const subjectId = String(req.query.subject ?? "all");
  let detail = getGradeHistoryDetail(childId, isoDate);
  if (!detail) {
    res.status(404).json({ error: "Нет оценок за этот день" });
    return;
  }
  if (subjectId !== "all") {
    const perf = getPerformance(childId);
    const subjName = perf?.rows.find((r) => r.subjectId === subjectId)?.subjectName;
    if (subjName) {
      const items = detail.items.filter((i) => i.subject === subjName);
      detail = { ...detail, items };
    }
  }
  res.json({ detail });
});

apiRouter.get("/children/:childId/finals", (req, res) => {
  const { childId } = req.params;
  const payload = getFinals(childId);
  if (!payload) {
    res.status(404).json({ error: "Нет данных" });
    return;
  }
  res.json(payload);
});

apiRouter.use((_req, res) => {
  res.status(404).json({ error: "Не найдено" });
});
