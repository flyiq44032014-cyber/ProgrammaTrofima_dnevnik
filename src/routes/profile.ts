import { Router } from "express";
import { requireAuth, requireParent, requireTeacher } from "../middleware/auth";
import * as profile from "../profile/service";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("/", async (req, res) => {
  try {
    const uid = req.session!.uid!;
    const role = req.session!.role!;
    const email = req.session!.email ?? "";
    const data = await profile.getProfile(uid, role, email);
    if (!data) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

profileRouter.post("/children", requireParent, async (req, res) => {
  try {
    const lastName = String(req.body?.lastName ?? "").trim();
    const firstName = String(req.body?.firstName ?? "").trim();
    const patronymic = String(req.body?.patronymic ?? "").trim();
    const classLabel = String(req.body?.classLabel ?? "").trim();
    if (!lastName || !firstName || !classLabel) {
      res.status(400).json({ error: "Укажите фамилию, имя и класс" });
      return;
    }
    const row = await profile.addParentChild(req.session!.uid!, {
      lastName,
      firstName,
      patronymic,
      classLabel,
    });
    res.json({ child: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

profileRouter.post("/classes", requireTeacher, async (req, res) => {
  try {
    const label = String(req.body?.label ?? "").trim();
    if (!label) {
      res.status(400).json({ error: "Укажите название класса" });
      return;
    }
    let grade: number | null = null;
    const g = req.body?.grade;
    if (g !== undefined && g !== null && g !== "") {
      const n = Number(g);
      if (!Number.isFinite(n)) {
        res.status(400).json({ error: "Некорректный номер параллели" });
        return;
      }
      grade = Math.round(n);
    }
    const row = await profile.addTeacherClass(req.session!.uid!, { label, grade });
    res.json({ class: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});
