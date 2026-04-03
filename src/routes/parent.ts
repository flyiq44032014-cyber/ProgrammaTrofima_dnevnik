import { Router } from "express";
import { requireParent } from "../middleware/auth";
import * as repo from "../db/directorRepository";

export const parentRouter = Router();

parentRouter.use(requireParent);

parentRouter.post("/link-keys/redeem", async (req, res) => {
  try {
    const linkKey = String(req.body?.linkKey ?? "").trim();
    if (!linkKey) {
      res.status(400).json({ error: "Введите ключ привязки" });
      return;
    }
    const result = await repo.redeemParentLinkKey(Number(req.session?.uid ?? 0), linkKey);
    res.json({ ok: true, ...result });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "LINK_KEY_NOT_FOUND") {
      res.status(404).json({ error: "Ключ не найден" });
      return;
    }
    if (e instanceof Error && e.message === "LINK_KEY_INACTIVE") {
      res.status(400).json({ error: "Ключ неактивен" });
      return;
    }
    if (e instanceof Error && e.message === "LINK_KEY_EXPIRED") {
      res.status(400).json({ error: "Срок действия ключа истек" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});
