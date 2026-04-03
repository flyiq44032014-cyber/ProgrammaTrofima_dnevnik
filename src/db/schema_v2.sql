-- V2 domain model for linked school entities (черновик; приложение пока не использует эти таблицы).
-- Требует существующей таблицы users из schema.sql.

CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS academic_years (
  id SERIAL PRIMARY KEY,
  school_id INT NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  UNIQUE (school_id, label)
);

CREATE TABLE IF NOT EXISTS terms (
  id SERIAL PRIMARY KEY,
  academic_year_id INT NOT NULL REFERENCES academic_years (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (academic_year_id, name)
);

CREATE TABLE IF NOT EXISTS persons (
  id SERIAL PRIMARY KEY,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  patronymic TEXT NOT NULL DEFAULT ''::text,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_person_links (
  user_id INT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  person_id INT NOT NULL UNIQUE REFERENCES persons (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS person_roles (
  id SERIAL PRIMARY KEY,
  person_id INT NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'parent', 'teacher', 'admin')),
  UNIQUE (person_id, role)
);

CREATE TABLE IF NOT EXISTS parent_student_links (
  id SERIAL PRIMARY KEY,
  parent_person_id INT NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
  student_person_id INT NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'guardian',
  UNIQUE (parent_person_id, student_person_id)
);

CREATE TABLE IF NOT EXISTS classes_v2 (
  id SERIAL PRIMARY KEY,
  school_id INT NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
  academic_year_id INT NOT NULL REFERENCES academic_years (id) ON DELETE CASCADE,
  grade_num INT NOT NULL CHECK (grade_num BETWEEN 1 AND 11),
  class_letter TEXT NOT NULL,
  UNIQUE (school_id, academic_year_id, grade_num, class_letter)
);

CREATE TABLE IF NOT EXISTS student_class_enrollments (
  id SERIAL PRIMARY KEY,
  student_person_id INT NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
  class_id INT NOT NULL REFERENCES classes_v2 (id) ON DELETE CASCADE,
  enrolled_on DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (student_person_id, class_id)
);

CREATE TABLE IF NOT EXISTS subjects_v2 (
  id SERIAL PRIMARY KEY,
  school_id INT NOT NULL REFERENCES schools (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (school_id, code)
);

CREATE TABLE IF NOT EXISTS course_sections_v2 (
  id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes_v2 (id) ON DELETE CASCADE,
  subject_id INT NOT NULL REFERENCES subjects_v2 (id) ON DELETE CASCADE,
  term_id INT NOT NULL REFERENCES terms (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  UNIQUE (class_id, subject_id, term_id)
);

CREATE TABLE IF NOT EXISTS teacher_section_assignments (
  id SERIAL PRIMARY KEY,
  teacher_person_id INT NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
  section_id INT NOT NULL REFERENCES course_sections_v2 (id) ON DELETE CASCADE,
  assigned_on DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (teacher_person_id, section_id)
);

CREATE TABLE IF NOT EXISTS student_section_enrollments (
  id SERIAL PRIMARY KEY,
  student_person_id INT NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
  section_id INT NOT NULL REFERENCES course_sections_v2 (id) ON DELETE CASCADE,
  UNIQUE (student_person_id, section_id)
);

CREATE TABLE IF NOT EXISTS assignments_v2 (
  id SERIAL PRIMARY KEY,
  section_id INT NOT NULL REFERENCES course_sections_v2 (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignment_type TEXT NOT NULL DEFAULT 'classwork',
  max_score NUMERIC(5,2) NOT NULL DEFAULT 5,
  due_date DATE,
  term_id INT REFERENCES terms (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grades_v2 (
  id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL REFERENCES assignments_v2 (id) ON DELETE CASCADE,
  student_person_id INT NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  teacher_person_id INT REFERENCES persons (id) ON DELETE SET NULL,
  UNIQUE (assignment_id, student_person_id)
);

CREATE TABLE IF NOT EXISTS attendance_v2 (
  id SERIAL PRIMARY KEY,
  section_id INT NOT NULL REFERENCES course_sections_v2 (id) ON DELETE CASCADE,
  student_person_id INT NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by_person_id INT REFERENCES persons (id) ON DELETE SET NULL,
  note TEXT,
  UNIQUE (section_id, student_person_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS weekly_schedule_entries (
  id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes_v2 (id) ON DELETE CASCADE,
  weekday INT NOT NULL CHECK (weekday BETWEEN 1 AND 5),
  lesson_order INT NOT NULL CHECK (lesson_order BETWEEN 1 AND 8),
  subject_id INT NOT NULL REFERENCES subjects_v2 (id) ON DELETE CASCADE,
  teacher_person_id INT REFERENCES persons (id) ON DELETE SET NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  room TEXT,
  UNIQUE (class_id, weekday, lesson_order)
);

CREATE INDEX IF NOT EXISTS idx_user_person_links_person ON user_person_links (person_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_role ON person_roles (role);
CREATE INDEX IF NOT EXISTS idx_parent_student_parent ON parent_student_links (parent_person_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student ON parent_student_links (student_person_id);
CREATE INDEX IF NOT EXISTS idx_student_class_enrollments_class ON student_class_enrollments (class_id);
CREATE INDEX IF NOT EXISTS idx_student_class_enrollments_student ON student_class_enrollments (student_person_id);
CREATE INDEX IF NOT EXISTS idx_teacher_section_assignments_teacher ON teacher_section_assignments (teacher_person_id);
CREATE INDEX IF NOT EXISTS idx_student_section_enrollments_student ON student_section_enrollments (student_person_id);
CREATE INDEX IF NOT EXISTS idx_assignments_section ON assignments_v2 (section_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades_v2 (student_person_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_v2 (student_person_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_class_weekday ON weekly_schedule_entries (class_id, weekday, lesson_order);
