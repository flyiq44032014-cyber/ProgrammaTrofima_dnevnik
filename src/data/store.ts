import type { Child } from "../types";
import * as mem from "./mock";
import * as db from "../db/repository";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

/**
 * В режиме без БД — скрываем демо-строки «класс как ребёнок» (classScheduleId у фиктивных id demo*).
 * В режиме с БД — class_schedule_id у настоящих учеников — норма (общий дневник класса); всех показываем.
 */
export function childrenForParentPicker(list: Child[]): Child[] {
  if (DB_ENABLED) return list;
  return list.filter((c) => !c.classScheduleId);
}

export async function getChildren() {
  if (DB_ENABLED) return db.getChildren();
  return mem.getChildren();
}

export async function getChildrenForParent(parentUserId: number) {
  if (DB_ENABLED) return db.getChildrenForParent(parentUserId);
  return mem.getChildren();
}

export async function childBelongsToParent(parentUserId: number, studentId: string): Promise<boolean> {
  if (!DB_ENABLED) return true;
  return db.childBelongsToParent(parentUserId, studentId);
}

export async function getDiary(childId: string, isoDate: string) {
  if (DB_ENABLED) return db.getDiary(childId, isoDate);
  return mem.getDiary(childId, isoDate);
}

export async function getDiaryDates(childId: string) {
  if (DB_ENABLED) return db.getDiaryDates(childId);
  return mem.getDiaryDates(childId);
}

export async function getPerformance(childId: string) {
  if (DB_ENABLED) return db.getPerformance(childId);
  return mem.getPerformance(childId);
}

export async function getGradeHistorySummary(childId: string) {
  if (DB_ENABLED) return db.getGradeHistorySummary(childId);
  return mem.getGradeHistorySummary(childId);
}

export async function getGradeHistoryDetail(childId: string, isoDate: string) {
  if (DB_ENABLED) return db.getGradeHistoryDetail(childId, isoDate);
  return mem.getGradeHistoryDetail(childId, isoDate);
}

export async function getGradeHistoryForSubject(childId: string, subjectId: string) {
  if (DB_ENABLED) return db.getGradeHistoryForSubject(childId, subjectId);
  return mem.getGradeHistoryForSubject(childId, subjectId);
}

export async function getFinals(childId: string) {
  if (DB_ENABLED) return db.getFinals(childId);
  return mem.getFinals(childId);
}

export async function getMeetingForChild(childId: string) {
  if (DB_ENABLED) {
    const fromDb = await db.getMeetingForChild(childId);
    if (fromDb) return fromDb;
    return mem.getMeetingForChild(childId);
  }
  return mem.getMeetingForChild(childId);
}
