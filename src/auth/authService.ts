import bcrypt from "bcrypt";
import {
  dbCreateUser,
  dbFindUserByEmail,
  type AuthUserRow,
  type RegisterProfile,
  type UserRole,
} from "../db/authRepository";

function useDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

type MemUser = { id: number; email: string; passwordHash: string; role: UserRole };

const memStore = new Map<string, MemUser>();
let memNextId = 100;

function seedMemoryUsers(): void {
  if (memStore.size > 0) return;
  memStore.set("roditel@yandex.ru", {
    id: 1,
    email: "roditel@yandex.ru",
    passwordHash: bcrypt.hashSync("1234", 10),
    role: "parent",
  });
  memStore.set("uchitel@yandex.ru", {
    id: 2,
    email: "uchitel@yandex.ru",
    passwordHash: bcrypt.hashSync("0987", 10),
    role: "teacher",
  });
}

function rowFromMem(m: MemUser): AuthUserRow {
  return {
    id: m.id,
    email: m.email,
    password_hash: m.passwordHash,
    role: m.role,
  };
}

export async function authFindByEmail(email: string): Promise<AuthUserRow | null> {
  const norm = email.trim().toLowerCase();
  if (useDb()) return dbFindUserByEmail(norm);
  seedMemoryUsers();
  const m = memStore.get(norm);
  return m ? rowFromMem(m) : null;
}

export async function authVerifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function validateProfile(p: RegisterProfile): void {
  if (
    !p.lastName.trim() ||
    !p.firstName.trim() ||
    !p.patronymic.trim()
  ) {
    throw new Error("INVALID_NAME");
  }
}

export async function authCreateUser(
  email: string,
  passwordPlain: string,
  role: UserRole,
  profile: RegisterProfile
): Promise<AuthUserRow> {
  const norm = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
    throw new Error("INVALID_EMAIL");
  }
  if (passwordPlain.length < 4) {
    throw new Error("WEAK_PASSWORD");
  }
  validateProfile(profile);
  const hash = await bcrypt.hash(passwordPlain, 10);
  if (useDb()) {
    const existing = await dbFindUserByEmail(norm);
    if (existing) throw new Error("EMAIL_TAKEN");
    return dbCreateUser(norm, hash, role, profile);
  }
  seedMemoryUsers();
  if (memStore.has(norm)) throw new Error("EMAIL_TAKEN");
  const u: MemUser = { id: memNextId++, email: norm, passwordHash: hash, role };
  memStore.set(norm, u);
  return rowFromMem(u);
}
