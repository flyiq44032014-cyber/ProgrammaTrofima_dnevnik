import * as mem from "./mock";
import * as db from "../db/repository";

function useDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function getChildren() {
  if (useDb()) return db.getChildren();
  return mem.getChildren();
}

export async function getDiary(childId: string, isoDate: string) {
  if (useDb()) return db.getDiary(childId, isoDate);
  return mem.getDiary(childId, isoDate);
}

export async function getDiaryDates(childId: string) {
  if (useDb()) return db.getDiaryDates(childId);
  return mem.getDiaryDates(childId);
}

export async function getPerformance(childId: string) {
  if (useDb()) return db.getPerformance(childId);
  return mem.getPerformance(childId);
}

export async function getGradeHistorySummary(childId: string) {
  if (useDb()) return db.getGradeHistorySummary(childId);
  return mem.getGradeHistorySummary(childId);
}

export async function getGradeHistoryDetail(childId: string, isoDate: string) {
  if (useDb()) return db.getGradeHistoryDetail(childId, isoDate);
  return mem.getGradeHistoryDetail(childId, isoDate);
}

export async function getGradeHistoryForSubject(childId: string, subjectId: string) {
  if (useDb()) return db.getGradeHistoryForSubject(childId, subjectId);
  return mem.getGradeHistoryForSubject(childId, subjectId);
}

export async function getFinals(childId: string) {
  if (useDb()) return db.getFinals(childId);
  return mem.getFinals(childId);
}

export async function getMeetingForChild(childId: string) {
  if (useDb()) {
    const fromDb = await db.getMeetingForChild(childId);
    if (fromDb) return fromDb;
    return mem.getMeetingForChild(childId);
  }
  return mem.getMeetingForChild(childId);
}
