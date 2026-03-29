import "dotenv/config";
import app from "./app";

const port = Number(process.env.PORT) || 3000;
/** 0.0.0.0 — надёжнее на Windows, чем только IPv6 (::), если localhost ведёт себя странно */
const host = process.env.HOST || "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Дневник:  http://127.0.0.1:${port}`);
  console.log(` (или)   http://localhost:${port}`);
});
