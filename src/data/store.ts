import type { Child } from "../types";
import * as db from "../db/repository";

/**
 * С `class_schedule_id` у настоящих учеников — норма (общий дневник класса); всех показываем.
 */
export function childrenForParentPicker(list: Child[]): Child[] {
  return list;
}

export async function getChildren() {
  return db.getChildren();
}

export async function getChildrenForParent(parentUserId: number) {
  return db.getChildrenForParent(parentUserId);
}

export async function childBelongsToParent(parentUserId: number, studentId: string): Promise<boolean> {
  return db.childBelongsToParent(parentUserId, studentId);
}

export async function getDiary(childId: string, isoDate: string) {
  return db.getDiary(childId, isoDate);
}

export async function getDiaryDates(childId: string) {
  return db.getDiaryDates(childId);
}

export async function getPerformance(childId: string) {
  return db.getPerformance(childId);
}

export async function getGradeHistorySummary(childId: string) {
  return db.getGradeHistorySummary(childId);
}

export async function getGradeHistoryDetail(childId: string, isoDate: string) {
  return db.getGradeHistoryDetail(childId, isoDate);
}

export async function getGradeHistoryForSubject(childId: string, subjectId: string) {
  return db.getGradeHistoryForSubject(childId, subjectId);
}

export async function getFinals(childId: string) {
  return db.getFinals(childId);
}

export async function getMeetingForChild(childId: string) {
  return db.getMeetingForChild(childId);
}
