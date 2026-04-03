import { memUserDisplayById } from "../auth/memDisplay";
import * as repo from "../db/profileRepository";
import type { ParentChildRow, TeacherClassRow } from "../db/profileRepository";
import { syncParentChildStudentIds } from "../db/repository";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

type MemChild = ParentChildRow;
type MemClass = TeacherClassRow;

const memChildren = new Map<number, MemChild[]>();
const memClasses = new Map<number, MemClass[]>();
const memParentPhone = new Map<number, string>();
let memChildRowId = 1;
let memClassRowId = 1;

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
  if (DB_ENABLED) {
    const acc = await repo.dbGetParentAccount(userId);
    if (!acc || acc.role !== "parent") return null;
    const base = await getProfile(userId, "parent", acc.email);
    if (!base) return null;
    return { ...base, userId };
  }
  const base = await getProfile(userId, "parent", "");
  if (!base || base.role !== "parent") return null;
  return { ...base, userId };
}

export async function updateParentPhone(userId: number, raw: string): Promise<ProfilePayload> {
  const phone = normalizeParentPhone(raw);
  if (DB_ENABLED) {
    await repo.dbUpdateParentPhone(userId, phone);
  } else {
    memParentPhone.set(userId, phone);
  }
  const data = await getProfile(userId, "parent", "");
  if (!data) throw new Error("Пользователь не найден");
  return data;
}

export async function getProfile(
  userId: number,
  role: "parent" | "teacher" | "director",
  sessionEmail: string
): Promise<ProfilePayload | null> {
  if (DB_ENABLED) {
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
  const names = memUserDisplayById(userId);
  const email = names?.email ?? sessionEmail;
  const base: ProfilePayload = {
    email,
    lastName: names?.lastName ?? "",
    firstName: names?.firstName ?? "",
    patronymic: names?.patronymic ?? "",
    role,
    phone: role === "parent" ? (memParentPhone.get(userId) ?? "").trim() : "",
    avatarUrl: "",
    children: role === "parent" ? [...(memChildren.get(userId) ?? [])] : [],
    teacherClasses: role === "teacher" ? [...(memClasses.get(userId) ?? [])] : [],
  };
  return base;
}

export async function addParentChild(
  userId: number,
  body: { lastName: string; firstName: string; patronymic: string; classLabel: string }
): Promise<ParentChildRow> {
  if (DB_ENABLED) {
    return repo.dbAddParentChild(userId, body);
  }
  const row: MemChild = {
    id: memChildRowId++,
    lastName: body.lastName.trim(),
    firstName: body.firstName.trim(),
    patronymic: body.patronymic.trim(),
    classLabel: body.classLabel.trim(),
    linkedStudentId: null,
  };
  const list = memChildren.get(userId) ?? [];
  list.push(row);
  memChildren.set(userId, list);
  return row;
}

export async function addTeacherClass(
  userId: number,
  body: { label: string; grade: number | null }
): Promise<TeacherClassRow> {
  if (DB_ENABLED) {
    return repo.dbAddTeacherProfileClass(userId, body);
  }
  const row: MemClass = {
    id: memClassRowId++,
    label: body.label.trim(),
    grade: body.grade,
  };
  const list = memClasses.get(userId) ?? [];
  list.push(row);
  memClasses.set(userId, list);
  return row;
}
