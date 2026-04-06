import "dotenv/config";
import app from "./app";
import { ensureProfileDbCompatibility } from "./db/ensureCompatibility";

const port = Number(process.env.PORT) || 3000;
/** 0.0.0.0 — надёжнее на Windows, чем только IPv6 (::), если localhost ведёт себя странно */
const host = process.env.HOST || "0.0.0.0";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "Задайте DATABASE_URL в .env — приложение запускается только с PostgreSQL."
    );
    process.exit(1);
  }
  try {
    await ensureProfileDbCompatibility();
    console.log("Схема БД (профиль родителя): проверка колонок выполнена.");
  } catch (e) {
    console.error(
      "Предупреждение: не удалось применить ensureProfileDbCompatibility (профиль может отдавать 500 до исправления БД):",
      e
    );
  }

  app.listen(port, host, () => {
    console.log(`Дневник:  http://127.0.0.1:${port}`);
    console.log(` (или)   http://localhost:${port}`);
  });
}

void main();
