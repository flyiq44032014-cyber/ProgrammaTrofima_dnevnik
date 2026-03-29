import { Router } from "express";
import {
  authCreateUser,
  authFindByEmail,
  authVerifyPassword,
} from "../auth/authService";

export const authRouter = Router();

function setSession(
  req: import("express").Request,
  row: { id: number; email: string; role: "parent" | "teacher" }
): void {
  if (!req.session) {
    req.session = {};
  }
  req.session.uid = row.id;
  req.session.email = row.email;
  req.session.role = row.role;
}

authRouter.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim();
    const password = String(req.body?.password ?? "");
    if (!email || !password) {
      res.status(400).json({ error: "Укажите почту и пароль" });
      return;
    }
    const row = await authFindByEmail(email);
    if (!row) {
      res.status(401).json({ error: "Неверная почта или пароль" });
      return;
    }
    const ok = await authVerifyPassword(password, row.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Неверная почта или пароль" });
      return;
    }
    setSession(req, {
      id: row.id,
      email: row.email,
      role: row.role,
    });
    res.json({
      ok: true,
      user: { id: row.id, email: row.email, role: row.role },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

authRouter.post("/register", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim();
    const password = String(req.body?.password ?? "");
    const roleRaw = String(req.body?.role ?? "parent");
    const role = roleRaw === "teacher" ? "teacher" : "parent";
    if (!email || !password) {
      res.status(400).json({ error: "Укажите почту и пароль" });
      return;
    }
    const row = await authCreateUser(email, password, role);
    setSession(req, {
      id: row.id,
      email: row.email,
      role: row.role,
    });
    res.json({
      ok: true,
      user: { id: row.id, email: row.email, role: row.role },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "EMAIL_TAKEN") {
      res.status(409).json({ error: "Эта почта уже зарегистрирована" });
      return;
    }
    if (msg === "INVALID_EMAIL") {
      res.status(400).json({ error: "Некорректный адрес почты" });
      return;
    }
    if (msg === "WEAK_PASSWORD") {
      res.status(400).json({ error: "Пароль не короче 4 символов" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

authRouter.post("/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  if (!req.session?.uid || !req.session.role) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  res.json({
    user: {
      id: req.session.uid,
      email: req.session.email ?? "",
      role: req.session.role,
    },
  });
});
