import { getPool } from "./pool";

export interface UserNamesRow {
  email: string;
  last_name: string | null;
  first_name: string | null;
  patronymic: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export interface ParentChildRow {
  id: number;
  lastName: string;
  firstName: string;
  patronymic: string;
  classLabel: string;
  /** id в таблице students; null — дневник/оценки недоступны, пока директор не привяжет ученика */
  linkedStudentId: string | null;
}

export interface TeacherClassRow {
  id: number;
  label: string;
  grade: number | null;
}

export async function dbGetUserNames(userId: number): Promise<UserNamesRow | null> {
  const { rows } = await getPool().query<UserNamesRow>(
    `SELECT email, last_name, first_name, patronymic, phone, avatar_url FROM users WHERE id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function dbGetParentAccount(
  userId: number
): Promise<{ email: string; role: string } | null> {
  const { rows } = await getPool().query<{ email: string; role: string }>(
    `SELECT email, role FROM users WHERE id = $1`,
    [userId]
  );
  const r = rows[0];
  return r ?? null;
}

export async function dbUpdateParentPhone(userId: number, phone: string): Promise<void> {
  const { rowCount } = await getPool().query(
    `UPDATE users SET phone = $2 WHERE id = $1 AND role = 'parent'`,
    [userId, phone]
  );
  if ((rowCount ?? 0) < 1) {
    throw new Error("PARENT_PHONE_UPDATE_FAILED");
  }
}

export async function dbListParentChildren(userId: number): Promise<ParentChildRow[]> {
  const { rows } = await getPool().query<{
    id: number;
    last_name: string;
    first_name: string;
    patronymic: string;
    class_label: string;
    student_id: string | null;
  }>(
    `SELECT id, last_name, first_name, patronymic, class_label, student_id
     FROM user_parent_children WHERE user_id = $1 ORDER BY sort_order, id`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    lastName: r.last_name,
    firstName: r.first_name,
    patronymic: r.patronymic || "",
    classLabel: r.class_label,
    linkedStudentId: r.student_id,
  }));
}

export async function dbAddParentChild(
  userId: number,
  body: { lastName: string; firstName: string; patronymic: string; classLabel: string }
): Promise<ParentChildRow> {
  const { rows } = await getPool().query<{
    id: number;
    last_name: string;
    first_name: string;
    patronymic: string;
    class_label: string;
  }>(
    `WITH nx AS (
       SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM user_parent_children WHERE user_id = $1
     )
     INSERT INTO user_parent_children (user_id, last_name, first_name, patronymic, class_label, sort_order, student_id)
     SELECT $1, $2, $3, $4, $5, nx.n, NULL FROM nx
     RETURNING id, last_name, first_name, patronymic, class_label`,
    [
      userId,
      body.lastName.trim(),
      body.firstName.trim(),
      body.patronymic.trim(),
      body.classLabel.trim(),
    ]
  );
  const r = rows[0];
  if (!r) throw new Error("INSERT_CHILD_FAILED");
  return {
    id: r.id,
    lastName: r.last_name,
    firstName: r.first_name,
    patronymic: r.patronymic || "",
    classLabel: r.class_label,
    linkedStudentId: null,
  };
}

export async function dbListTeacherProfileClasses(userId: number): Promise<TeacherClassRow[]> {
  const { rows } = await getPool().query<{
    id: number;
    label: string;
    grade: number | null;
  }>(
    `SELECT id, label, grade FROM user_teacher_classes WHERE user_id = $1 ORDER BY sort_order, id`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    grade: r.grade,
  }));
}

export async function dbAddTeacherProfileClass(
  userId: number,
  body: { label: string; grade: number | null }
): Promise<TeacherClassRow> {
  const { rows } = await getPool().query<{ id: number; label: string; grade: number | null }>(
    `WITH nx AS (
       SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM user_teacher_classes WHERE user_id = $1
     )
     INSERT INTO user_teacher_classes (user_id, label, grade, sort_order)
     SELECT $1, $2, $3, nx.n FROM nx
     RETURNING id, label, grade`,
    [userId, body.label.trim(), body.grade]
  );
  const r = rows[0];
  if (!r) throw new Error("INSERT_CLASS_FAILED");
  return { id: r.id, label: r.label, grade: r.grade };
}
