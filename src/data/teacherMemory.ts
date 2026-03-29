import type { DiaryDay } from "../types";
import type { LessonPatch } from "../db/teacherRepository";
import {
  TEACHER_PROFILE,
  buildClassDiaries,
  buildRosters,
  schoolClassesMeta,
} from "./teacherSeedData";

const rosters: Record<string, string[]> = buildRosters();
let diaries: Record<string, Record<string, DiaryDay>> = buildClassDiaries();

export function resetTeacherMemory(): void {
  diaries = buildClassDiaries();
}

export function memTeacherProfile() {
  return TEACHER_PROFILE;
}

export function memListClasses() {
  return schoolClassesMeta;
}

export function memGetRoster(classId: string): string[] {
  return rosters[classId] ?? [];
}

export function memGetClassDiary(classId: string, isoDate: string): DiaryDay | null {
  return diaries[classId]?.[isoDate] ?? null;
}

export function memGetClassDiaryDates(classId: string): string[] {
  const d = diaries[classId];
  if (!d) return [];
  return Object.keys(d).sort();
}

function deepClone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

export function memUpdateLesson(
  classId: string,
  isoDate: string,
  lessonKey: string,
  patch: LessonPatch
): boolean {
  const day = diaries[classId]?.[isoDate];
  if (!day) return false;
  const les = day.lessons.find((l) => l.id === lessonKey);
  if (!les) return false;
  if (patch.title !== undefined) les.title = patch.title;
  if (patch.timeLabel !== undefined) les.timeLabel = patch.timeLabel;
  if (patch.teacher !== undefined) les.teacher = patch.teacher ?? undefined;
  if (patch.topic !== undefined) les.topic = patch.topic ?? undefined;
  if (patch.homework !== undefined) les.homework = patch.homework ?? undefined;
  if (patch.controlWork !== undefined) les.controlWork = patch.controlWork;
  if (patch.place !== undefined) les.place = patch.place ?? undefined;
  if (patch.homeworkNext !== undefined) les.homeworkNext = patch.homeworkNext ?? undefined;
  if (patch.grade !== undefined) les.grade = patch.grade;
  return true;
}
