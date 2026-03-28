import express from "express";
import path from "path";
import { apiRouter } from "./routes/api";

const app = express();

app.use(express.json());
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  next();
});
app.use("/api", apiRouter);

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
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
