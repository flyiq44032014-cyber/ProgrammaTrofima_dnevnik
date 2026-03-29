import { Router } from "express";
import * as store from "../data/store";

export const apiRouter = Router();

apiRouter.get("/version", async (_req, res) => {
  try {
    const children = store.childrenForParentPicker(await store.getChildren());
    res.json({
      app: "elektronnyj-dnevnik",
      pupils: children.map((c) => ({ id: c.id, name: c.name })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка БД" });
  }
});

apiRouter.get("/children", async (_req, res) => {
  try {
    const children = store.childrenForParentPicker(await store.getChildren());
    res.json({ children });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка БД" });
  }
});

apiRouter.get("/children/:childId/diary", async (req, res) => {
  const { childId } = req.params;
  const date = String(req.query.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Нужен параметр date YYYY-MM-DD" });
    return;
  }
  try {
    const day = await store.getDiary(childId, date);
    if (!day) {
      res.status(404).json({ error: "Нет расписания на этот день" });
      return;
    }
    const dates = await store.getDiaryDates(childId);
    res.json({ day, dates });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка БД" });
  }
});

apiRouter.get("/children/:childId/diary/meta", async (req, res) => {
  const { childId } = req.params;
  try {
    const dates = await store.getDiaryDates(childId);
    res.json({ dates });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка БД" });
  }
});

apiRouter.get("/children/:childId/performance", async (req, res) => {
  const { childId } = req.params;
  try {
    const payload = await store.getPerformance(childId);
    if (!payload) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    const subjectId = String(req.query.subject ?? "all");
    res.json({ ...payload, activeSubjectId: subjectId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка БД" });
  }
});

apiRouter.get("/children/:childId/grades", async (req, res) => {
  const { childId } = req.params;
  const subjectId = String(req.query.subject ?? "all");
  try {
    const rows = await store.getGradeHistoryForSubject(childId, subjectId);
    const perf = await store.getPerformance(childId);
    const subjectLabel =
      perf?.rows.find((r) => r.subjectId === subjectId)?.subjectName ??
      (subjectId === "all" ? "Все предметы" : subjectId);
    res.json({ subjectId, subjectLabel, rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка БД" });
  }
});

apiRouter.get("/children/:childId/grades/:isoDate", async (req, res) => {
  const { childId, isoDate } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    res.status(400).json({ error: "Неверная дата" });
    return;
  }
  const subjectId = String(req.query.subject ?? "all");
  try {
    let detail = await store.getGradeHistoryDetail(childId, isoDate);
    if (!detail) {
      res.status(404).json({ error: "Нет оценок за этот день" });
      return;
    }
    if (subjectId !== "all") {
      const perf = await store.getPerformance(childId);
      const subjName = perf?.rows.find((r) => r.subjectId === subjectId)?.subjectName;
      if (subjName) {
        const items = detail.items.filter((i) => i.subject === subjName);
        detail = { ...detail, items };
      }
    }
    res.json({ detail });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка БД" });
  }
});

apiRouter.get("/children/:childId/finals", async (req, res) => {
  const { childId } = req.params;
  try {
    const payload = await store.getFinals(childId);
    if (!payload) {
      res.status(404).json({ error: "Нет данных" });
      return;
    }
    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка БД" });
  }
});

apiRouter.get("/children/:childId/meeting", async (req, res) => {
  const { childId } = req.params;
  try {
    const meeting = await store.getMeetingForChild(childId);
    res.json({ meeting });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка БД" });
  }
});

apiRouter.use((_req, res) => {
  res.status(404).json({ error: "Не найдено" });
});
