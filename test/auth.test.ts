import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";

// Важно: dotenv в `src/app.ts` загружает `.env` и может включить БД.
// Для стабильных интеграционных тестов мы принудительно выключаем DATABASE_URL
// ДО импорта приложения.
process.env.DATABASE_URL = "";
process.env.SESSION_SECRET = "test-session-secret";

let app: any;

beforeAll(async () => {
  const mod = await import("../src/app");
  app = mod.default;
});

describe("API auth", () => {
  it("login: возвращает 400 при пустых полях", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("login: отклоняет неверный пароль (401)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "Roditel@yandex.ru", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("register: создаёт пользователя и даёт доступ к /api/profile", async () => {
    const agent = request.agent(app);

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

