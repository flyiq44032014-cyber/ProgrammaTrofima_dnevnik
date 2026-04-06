import * as repo from "../db/profileRepository";
import type { ParentChildRow, TeacherClassRow } from "../db/profileRepository";
import { syncParentChildStudentIds } from "../db/repository";

export interface ProfilePayload {
  email: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  role: "parent" | "teacher" | "director";
  /** Телефон родителя; для других ролей пустая строка */
  phone: string;
  /** URL аватара из users.avatar_url */
  avatarUrl: string;
  children: ParentChildRow[];
  teacherClasses: TeacherClassRow[];
  /** Заполняется при просмотре профиля родителя директором */
  userId?: number;
}

/** Нормализация и проверка; пустая строка — очистить номер. */
export function normalizeParentPhone(raw: string): string {
  const s = String(raw ?? "").trim();
  if (s.length > 40) {
    throw new Error("Номер слишком длинный (максимум 40 символов).");
  }
  if (s.length === 0) return "";
  if (!/^[\d\s+().-]+$/.test(s)) {
    throw new Error("Допустимы только цифры, +, пробелы, скобки, точка и дефис.");
  }
  return s;
}

export async function getProfileForParentUserId(userId: number): Promise<ProfilePayload | null> {
  const acc = await repo.dbGetParentAccount(userId);
  if (!acc || acc.role !== "parent") return null;
  const base = await getProfile(userId, "parent", acc.email);
  if (!base) return null;
  return { ...base, userId };
}

export async function updateParentPhone(userId: number, raw: string): Promise<ProfilePayload> {
  const phone = normalizeParentPhone(raw);
  await repo.dbUpdateParentPhone(userId, phone);
  const data = await getProfile(userId, "parent", "");
  if (!data) throw new Error("Пользователь не найден");
  return data;
}

export async function getProfile(
  userId: number,
  role: "parent" | "teacher" | "director",
  _sessionEmail: string
): Promise<ProfilePayload | null> {
  const u = await repo.dbGetUserNames(userId);
  if (!u) return null;
  const base: ProfilePayload = {
    email: u.email,
    lastName: u.last_name ?? "",
    firstName: u.first_name ?? "",
    patronymic: u.patronymic ?? "",
    role,
    phone: role === "parent" ? (u.phone ?? "").trim() : "",
    avatarUrl: (u.avatar_url ?? "").trim(),
    children: [] as ParentChildRow[],
    teacherClasses: [] as TeacherClassRow[],
  };
  if (role === "parent") {
    await syncParentChildStudentIds(userId);
    base.children = await repo.dbListParentChildren(userId);
  } else if (role === "teacher") {
    base.teacherClasses = await repo.dbListTeacherProfileClasses(userId);
  }
  return base;
}
