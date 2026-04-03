export interface Child {
  id: string;
  name: string;
  classLabel: string;
  /** Если задано — дневник берётся из расписания класса (редактирует учитель) */
  classScheduleId?: string;
}

export interface LessonBlock {
  key: string;
  label: string;
  text: string;
}

export interface DiaryLesson {
  id: string;
  order: number;
  title: string;
  timeLabel: string;
  grade?: number | null;
  teacher?: string;
  topic?: string;
  homework?: string;
  controlWork?: string | null;
  place?: string;
  homeworkNext?: string;
  blocks?: LessonBlock[];
}

export interface DiaryDay {
  date: string;
  weekday: string;
  monthGenitive: string;
  year: number;
  lessons: DiaryLesson[];
}

export interface PerformanceRow {
  subjectId: string;
  subjectName: string;
  studentAvg: number;
  classAvg: number;
  parallelAvg: number;
}

export interface PerformancePayload {
  quarterLabel: string;
  dateLabel: string;
  dayNum: number;
  weekday: string;
  monthGenitive: string;
  year: number;
  rows: PerformanceRow[];
}

export interface GradeDaySummary {
  date: string;
  dateDisplay: string;
  grades: number[];
}

export interface GradeDayDetail {
  date: string;
  dateDisplay: string;
  items: {
    subject: string;
    activity: string;
    grade: number;
  }[];
}

export interface FinalRow {
  subject: string;
  t1?: number | null;
  t2?: number | null;
  t3?: number | null;
  t4?: number | null;
  year?: number | null;
}

/** Объявление собрания для класса (видят родители с этим classScheduleId) */
export interface ClassMeetingAnnouncement {
  date: string;
  time: string;
  topic: string;
}

export interface FinalsPayload {
  yearLabel: string;
  rows: FinalRow[];
}
