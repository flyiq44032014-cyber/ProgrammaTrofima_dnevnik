-- Электронный дневник — схема Neon / PostgreSQL

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class_label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diary_days (
  id SERIAL PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  date_iso DATE NOT NULL,
  weekday TEXT NOT NULL,
  month_genitive TEXT NOT NULL,
  year INT NOT NULL,
  UNIQUE (child_id, date_iso)
);

CREATE TABLE IF NOT EXISTS diary_lessons (
  id SERIAL PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
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
  UNIQUE (child_id, date_iso, lesson_order)
);

CREATE TABLE IF NOT EXISTS performance_meta (
  child_id TEXT PRIMARY KEY REFERENCES students (id) ON DELETE CASCADE,
  trimester_label TEXT NOT NULL,
  date_label TEXT NOT NULL,
  day_num INT NOT NULL,
  weekday TEXT NOT NULL,
  month_genitive TEXT NOT NULL,
  year INT NOT NULL,
  finals_year_label TEXT NOT NULL DEFAULT '2025/2026'
);

CREATE TABLE IF NOT EXISTS performance_rows (
  id SERIAL PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  student_avg NUMERIC NOT NULL,
  class_avg NUMERIC NOT NULL,
  parallel_avg NUMERIC NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (child_id, subject_id)
);

CREATE TABLE IF NOT EXISTS grade_history_summary (
  id SERIAL PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  date_iso DATE NOT NULL,
  date_display TEXT NOT NULL,
  grades_json JSONB NOT NULL,
  UNIQUE (child_id, date_iso)
);

CREATE TABLE IF NOT EXISTS grade_history_detail (
  child_id TEXT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  date_iso DATE NOT NULL,
  items_json JSONB NOT NULL,
  PRIMARY KEY (child_id, date_iso)
);

CREATE TABLE IF NOT EXISTS grade_history_by_subject (
  id SERIAL PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  date_iso DATE NOT NULL,
  date_display TEXT NOT NULL,
  grades_json JSONB NOT NULL,
  UNIQUE (child_id, subject_id, date_iso)
);

CREATE TABLE IF NOT EXISTS finals (
  id SERIAL PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  t1 NUMERIC,
  t2 NUMERIC,
  t3 NUMERIC,
  year_grade NUMERIC,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (child_id, subject)
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'teacher')),
  last_name TEXT,
  first_name TEXT,
  patronymic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS patronymic TEXT;

CREATE TABLE IF NOT EXISTS user_parent_children (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  patronymic TEXT NOT NULL DEFAULT ''::text,
  class_label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_parent_children_user ON user_parent_children (user_id);

CREATE TABLE IF NOT EXISTS user_teacher_classes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  grade INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_teacher_classes_user ON user_teacher_classes (user_id);
