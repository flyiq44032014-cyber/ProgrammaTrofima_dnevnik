import bcrypt from "bcrypt";
import type { AuthUserRow, RegisterProfile, UserRole } from "../db/authRepository";

export type MemUser = {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  lastName?: string;
  firstName?: string;
  patronymic?: string;
};

const memStore = new Map<string, MemUser>();
let memNextId = 100;

export function seedMemoryUsers(): void {
  if (memStore.size > 0) return;
  memStore.set("roditel@yandex.ru", {
    id: 1,
    email: "roditel@yandex.ru",
    passwordHash: bcrypt.hashSync("1234", 10),
    role: "parent",
    lastName: "Демо",
    firstName: "Родитель",
    patronymic: "",
  });
  memStore.set("uchitel@yandex.ru", {
    id: 2,
    email: "uchitel@yandex.ru",
    passwordHash: bcrypt.hashSync("0987", 10),
    role: "teacher",
    lastName: "Демо",
    firstName: "Учитель",
    patronymic: "",
  });
}

export function getMemUserByEmail(norm: string): MemUser | undefined {
  seedMemoryUsers();
  return memStore.get(norm);
}

export function memUserToAuthRow(m: MemUser): AuthUserRow {
  return {
    id: m.id,
    email: m.email,
    password_hash: m.passwordHash,
    role: m.role,
  };
}

export function memUserDisplayById(uid: number): {
  email: string;
  lastName: string;
  firstName: string;
  patronymic: string;
} | null {
  seedMemoryUsers();
  for (const m of memStore.values()) {
    if (m.id === uid) {
      return {
        email: m.email,
        lastName: m.lastName ?? "",
        firstName: m.firstName ?? "",
        patronymic: m.patronymic ?? "",
      };
    }
  }
  return null;
}

export function memRegisterUser(
  normEmail: string,
  passwordHash: string,
  role: UserRole,
  profile: RegisterProfile
): MemUser {
  seedMemoryUsers();
  const u: MemUser = {
    id: memNextId++,
    email: normEmail,
    passwordHash,
    role,
    lastName: profile.lastName.trim(),
    firstName: profile.firstName.trim(),
    patronymic: profile.patronymic.trim(),
  };
  memStore.set(normEmail, u);
  return u;
}
