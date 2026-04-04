import { Router } from "express";
import { requireAuth, requireParent } from "../middleware/auth";
import * as profile from "../profile/service";
import { catchAsync } from "../middleware/catchAsync";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get(
  "/",
  catchAsync(async (req, res) => {
    const uid = req.session!.uid!;
    const role = req.session!.role!;
    const email = req.session!.email ?? "";
    const data = await profile.getProfile(uid, role, email);
    if (!data) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json(data);
  }, { error: "Ошибка сервера" })
);

profileRouter.patch("/phone", requireParent, async (req, res) => {
  try {
    const data = await profile.updateParentPhone(req.session!.uid!, String(req.body?.phone ?? ""));
    res.json(data);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "Пользователь не найден") {
        res.status(404).json({ error: e.message });
        return;
      }
      if (
        e.message.startsWith("Номер") ||
        e.message.startsWith("Допустимы") ||
        e.message === "PARENT_PHONE_UPDATE_FAILED"
      ) {
        res.status(400).json({
          error:
            e.message === "PARENT_PHONE_UPDATE_FAILED"
              ? "Не удалось сохранить телефон"
              : e.message,
        });
        return;
      }
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});
