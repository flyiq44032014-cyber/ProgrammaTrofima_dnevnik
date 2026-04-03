import { Router } from "express";
import * as fs from "fs";
import * as path from "path";
import type { RegisterProfile } from "../db/authRepository";
import {
  authCreateUser,
  authFindByEmail,
  authVerifyPassword,
} from "../auth/authService";

export const authRouter = Router();
const DEBUG_LOG_PATH = path.join(process.cwd(), "debug-00b601.log");

function setSession(
  req: import("express").Request,
  row: { id: number; email: string; role: "parent" | "teacher" | "director" }
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
    // #region agent log
    try {
      fs.appendFileSync(
        DEBUG_LOG_PATH,
        JSON.stringify({
          sessionId: "00b601",
          runId: "auth-login",
          hypothesisId: "H1",
          location: "auth.ts:/login:enter",
          message: "login request entered",
          data: { email },
          timestamp: Date.now(),
        }) + "\n"
      );
    } catch {}
    // #endregion
    if (!email || !password) {
      res.status(400).json({ error: "Укажите почту и пароль" });
      return;
    }
    const row = await authFindByEmail(email);
    // #region agent log
    try {
      fs.appendFileSync(
        DEBUG_LOG_PATH,
        JSON.stringify({
          sessionId: "00b601",
          runId: "auth-login",
          hypothesisId: "H1",
          location: "auth.ts:/login:row",
          message: "authFindByEmail result",
          data: { email, found: Boolean(row), role: row?.role ?? null },
          timestamp: Date.now(),
        }) + "\n"
      );
    } catch {}
    // #endregion
    if (!row) {
      res.status(401).json({ error: "Неверная почта или пароль" });
      return;
    }
    const ok = await authVerifyPassword(password, row.password_hash);
    // #region agent log
    try {
      fs.appendFileSync(
        DEBUG_LOG_PATH,
        JSON.stringify({
          sessionId: "00b601",
          runId: "auth-login",
          hypothesisId: "H2",
          location: "auth.ts:/login:verify",
          message: "password verification result",
          data: { email, ok },
          timestamp: Date.now(),
        }) + "\n"
      );
    } catch {}
    // #endregion
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
    const errMsg = e instanceof Error ? e.message : String(e);
    const errName = e instanceof Error ? e.name : "unknown";
    // #region agent log
    try {
      fs.appendFileSync(
        DEBUG_LOG_PATH,
        JSON.stringify({
          sessionId: "00b601",
          runId: "auth-login",
          hypothesisId: "H500",
          location: "auth.ts:/login:catch",
          message: "login threw before success response",
          data: {
            errName,
            errMsg,
            hasDbUrl: Boolean(process.env.DATABASE_URL?.trim()),
          },
          timestamp: Date.now(),
        }) + "\n"
      );
    } catch {
      /* ignore */
    }
    // #endregion
    console.error("[DEBUG-00b601]", JSON.stringify({ errName, errMsg, hasDbUrl: Boolean(process.env.DATABASE_URL?.trim()) }));
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

authRouter.post("/register", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim();
    const password = String(req.body?.password ?? "");
    const roleRaw = String(req.body?.role ?? "parent");
    const role = roleRaw === "teacher" || roleRaw === "director" ? roleRaw : "parent";
    const profile: RegisterProfile = {
      lastName: String(req.body?.lastName ?? ""),
      firstName: String(req.body?.firstName ?? ""),
      patronymic: String(req.body?.patronymic ?? ""),
    };
    if (!email || !password) {
      res.status(400).json({ error: "Укажите почту и пароль" });
      return;
    }
    const row = await authCreateUser(email, password, role, profile);
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
    if (msg === "INVALID_NAME") {
      res.status(400).json({ error: "Укажите фамилию, имя и отчество" });
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
  const hasUid = Boolean(req.session?.uid && req.session.role);
  const hasCookieHeader = Boolean(req.headers.cookie && req.headers.cookie.length > 0);
  // #region agent log
  try {
    fs.appendFileSync(
      DEBUG_LOG_PATH,
      JSON.stringify({
        sessionId: "00b601",
        runId: "pre-fix",
        hypothesisId: "H401-H-host",
        location: "auth.ts:/me",
        message: "GET /me",
        data: {
          host: String(req.headers.host ?? ""),
          hasCookieHeader,
          hasUid,
          nodeEnv: process.env.NODE_ENV ?? "",
        },
        timestamp: Date.now(),
      }) + "\n"
    );
  } catch {
    /* ignore */
  }
  // #endregion
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
