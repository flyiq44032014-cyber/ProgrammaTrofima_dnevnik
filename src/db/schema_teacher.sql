-- Классы и расписание (общее для учеников класса — видят родители после правок учителя)

CREATE TABLE IF NOT EXISTS school_classes (
  id TEXT PRIMARY KEY,
  grade INT NOT NULL,
  label TEXT NOT NULL,
  subject_name TEXT NOT NULL DEFAULT 'Химия'
);

CREATE TABLE IF NOT EXISTS class_roster (
  id SERIAL PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS class_diary_days (
  class_id TEXT NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
  date_iso DATE NOT NULL,
  weekday TEXT NOT NULL,
  month_genitive TEXT NOT NULL,
  year INT NOT NULL,
  PRIMARY KEY (class_id, date_iso)
);

CREATE TABLE IF NOT EXISTS class_diary_lessons (
  id SERIAL PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
  date_iso DATE NOT NULL,
  lesson_order INT NOT NULL,
  lesson_key TEXT NOT NULL,
  title TEXT NOT NULL,
  time_label TEXT NOT NULL,
  grade NUMERIC,
  teacher TEXT,
  topic TEXT,
  homework TEXT,
  control_work TEXT,
  place TEXT,
  homework_next TEXT,
  blocks_json JSONB,
  UNIQUE (class_id, date_iso, lesson_order)
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS class_schedule_id TEXT REFERENCES school_classes (id);

CREATE INDEX IF NOT EXISTS idx_students_class_schedule ON students (class_schedule_id);
