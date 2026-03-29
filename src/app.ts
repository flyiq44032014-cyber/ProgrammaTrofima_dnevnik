import "dotenv/config";
import cookieSession from "cookie-session";
import express from "express";
import path from "path";
import { requireParent, requireTeacher } from "./middleware/auth";
import { apiRouter } from "./routes/api";
import { authRouter } from "./routes/auth";
import { profileRouter } from "./routes/profile";
import { teacherRouter } from "./routes/teacher";

const app = express();

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

app.use(express.json());
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/teacher", requireTeacher, teacherRouter);
app.use("/api", requireParent, apiRouter);

const publicDir = path.join(process.cwd(), "public");
app.use(
  express.static(publicDir, {
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders(res, filePath) {
      if (/\.(html|js|css)$/.test(filePath)) {
        res.set("Cache-Control", "no-store");
      }
    },
  })
);

app.get("*", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
