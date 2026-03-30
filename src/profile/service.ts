import { memUserDisplayById } from "../auth/memDisplay";
import * as repo from "../db/profileRepository";
import type { ParentChildRow, TeacherClassRow } from "../db/profileRepository";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

type MemChild = ParentChildRow;
type MemClass = TeacherClassRow;

const memChildren = new Map<number, MemChild[]>();
const memClasses = new Map<number, MemClass[]>();
let memChildRowId = 1;
let memClassRowId = 1;

export interface ProfilePayload {
  email: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  role: "parent" | "teacher";
  children: ParentChildRow[];
  teacherClasses: TeacherClassRow[];
}

export async function getProfile(
  userId: number,
  role: "parent" | "teacher",
  sessionEmail: string
): Promise<ProfilePayload | null> {
  if (DB_ENABLED) {
    const u = await repo.dbGetUserNames(userId);
    if (!u) return null;
    const base = {
      email: u.email,
      lastName: u.last_name ?? "",
      firstName: u.first_name ?? "",
      patronymic: u.patronymic ?? "",
      role,
      children: [] as ParentChildRow[],
      teacherClasses: [] as TeacherClassRow[],
    };
    if (role === "parent") {
      base.children = await repo.dbListParentChildren(userId);
    } else {
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
