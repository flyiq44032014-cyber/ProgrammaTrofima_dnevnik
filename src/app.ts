import express from "express";
import path from "path";
import { apiRouter } from "./routes/api";

const app = express();

app.use(express.json());
app.use("/api", apiRouter);

const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
