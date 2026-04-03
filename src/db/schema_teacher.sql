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

CREATE TABLE IF NOT EXISTS director_quarter_schedule (
  id SERIAL PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
  quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  weekday_idx INT NOT NULL CHECK (weekday_idx BETWEEN 0 AND 4),
  lesson_order INT NOT NULL CHECK (lesson_order BETWEEN 1 AND 7),
  subject_name TEXT NOT NULL,
  teacher_user_id INT REFERENCES users (id) ON DELETE SET NULL,
  time_label TEXT NOT NULL DEFAULT '',
  UNIQUE (class_id, quarter, weekday_idx, lesson_order)
);

CREATE TABLE IF NOT EXISTS parent_link_keys (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES school_classes (id) ON DELETE CASCADE,
  class_label TEXT NOT NULL,
  link_key_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired')) DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  usage_count INT NOT NULL DEFAULT 0,
  created_by_user_id INT REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_parent_link_keys_student ON parent_link_keys (student_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_link_keys_class ON parent_link_keys (class_id, status, created_at DESC);
