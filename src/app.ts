import "dotenv/config";
import cookieSession from "cookie-session";
import express from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { requireParent, requireTeacher } from "./middleware/auth";
import { apiRouter } from "./routes/api";
import { authRouter } from "./routes/auth";
import { profileRouter } from "./routes/profile";
import { teacherRouter } from "./routes/teacher";

const app = express();

app.disable("x-powered-by");
app.use(helmet());

app.set("trust proxy", 1);

const sessionSecret =
  process.env.SESSION_SECRET || "dev-insecure-set-SESSION_SECRET-in-production";

app.use(
  cookieSession({
    name: "dnevnik_session",
    keys: [sessionSecret],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
);

// Лимит на размер JSON тела защищает сервер и предотвращает случайно огромные payload.
app.use(express.json({ limit: "200kb" }));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  next();
});

// Basic protection against brute-force / abuse on auth + writes.
// Note: for full CSRF protection we'd add tokens on the frontend; cookie `sameSite=lax`
// already mitigates the most common CSRF vectors.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const teacherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api/teacher", teacherLimiter);
app.use("/api/profile", profileLimiter);

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/teacher", requireTeacher, teacherRouter);
app.use("/api", requireParent, apiRouter);

const publicDir = path.join(process.cwd(), "public");
app.use(
  express.static(publicDir, {
    etag: false,
    lastModified: false,
    setHeaders(res, filePath) {
      if (/\.html$/.test(filePath)) {
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
        return;
      }
      if (/\.js$/.test(filePath) || /\.css$/.test(filePath)) {
        // index.html references app.js/app.css with `?v=...` so immutable caching is safe.
        res.set("Cache-Control", "public, max-age=31536000, immutable");
        return;
      }
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    },
  })
);

app.get("*", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
