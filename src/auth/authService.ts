import bcrypt from "bcrypt";
import {
  dbCreateUser,
  dbFindUserByEmail,
  type AuthUserRow,
  type RegisterProfile,
  type UserRole,
} from "../db/authRepository";

export async function authFindByEmail(email: string): Promise<AuthUserRow | null> {
  const norm = email.trim().toLowerCase();
  return dbFindUserByEmail(norm);
}

export async function authVerifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function validateProfile(p: RegisterProfile): void {
  if (!p.lastName.trim() || !p.firstName.trim() || !p.patronymic.trim()) {
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
  const existing = await dbFindUserByEmail(norm);
  if (existing) throw new Error("EMAIL_TAKEN");
  return dbCreateUser(norm, hash, role, profile);
}
