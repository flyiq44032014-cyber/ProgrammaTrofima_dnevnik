import type { Express } from "express";
import { describe, expect, it, beforeAll } from "vitest";
import supertest from "supertest";

/** Обход конфликта имён типов Vitest и supertest в выводе типов. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function http(app: Express): any {
  return supertest(app);
}

// Приложение использует только PostgreSQL. Интеграционные тесты требуют DATABASE_URL и схему БД.
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-session-secret";

const hasDb = Boolean(process.env.DATABASE_URL?.trim());

let app: Express | null = null;

beforeAll(async () => {
  if (!hasDb) return;
  const mod = await import("../src/app");
  app = mod.default;
});

describe("API auth", () => {
  it.skipIf(!hasDb)("login: возвращает 400 при пустых полях", async () => {
    const res = await http(app!).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it.skipIf(!hasDb)("login: отклоняет неверный пароль (401)", async () => {
    const res = await http(app!)
      .post("/api/auth/login")
      .send({ email: "Roditel@yandex.ru", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it.skipIf(!hasDb)("register: создаёт пользователя и даёт доступ к /api/profile", async () => {
    const agent = supertest.agent(app!) as any;

    const registerRes = await agent.post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "pass123",
      role: "parent",
      lastName: "Иванов",
      firstName: "Иван",
      patronymic: "Иванович",
    });
    expect(registerRes.status).toBe(200);
    expect(registerRes.body).toHaveProperty("ok", true);

    const meRes = await agent.get("/api/profile");
    expect(meRes.status).toBe(200);
    expect(meRes.body).toHaveProperty("role", "parent");
  });
});
