import { getPool } from "./pool";
import { sqlUpcRowMatchesStudent } from "./repository";
import type { PoolClient } from "pg";
import { createHash, randomBytes } from "crypto";

export type SchoolClassRow = {
  id: string;
  label: string;
  grade: number;
  studentsCount: number;
  classTeacherFullName?: string | null;
};
export type StudentRow = { id: string; name: string; classLabel: string; parentLinkCode: string };
export type ParentRow = { id: number; email: string; fullName: string; children: Array<{ fullName: string; confirmed: boolean }> };
export type ParentListParams = {
  limit: number;
  offset: number;
  search: string;
  filter: "all" | "confirmed" | "pending" | "empty";
  sortBy: "name" | "children" | "status";
  sortDir: "asc" | "desc";
};
export type ParentListResult = {
  parents: Array<ParentRow & {
    confirmedCount: number;
    pendingCount: number;
    confirmationState: "confirmed" | "pending" | "none";
    phone: string;
    avatarUrl: string;
  }>;
  total: number;
  hasMore: boolean;
  nextOffset: number;
};
export type TeacherRow = { id: number; email: string; fullName: string; subjects: string[] };
export type TeacherListResult = {
  teachers: TeacherRow[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
};
export type DeleteClassMode = "move" | "delete";
export type AuditAction =
  | "CLASS_CREATED"
  | "CLASS_DELETED"
  | "CLASS_STUDENTS_MOVED"
  | "STUDENT_ADDED"
  | "STUDENT_REMOVED"
  | "STUDENTS_BULK_ADDED";
export type ParentLinkKeyStatus = "active" | "revoked" | "expired";
export type ParentLinkKeyRow = {
  id: number;
  studentId: string;
  classId: string;
  classLabel: string;
  studentFullName: string;
  status: ParentLinkKeyStatus;
  expiresAt: string | null;
  usageCount: number;
  createdAt: string;
  lastUsedAt: string | null;
};
export type BulkStudentInput = {
  line: number;
  lastName: string;
  firstName: string;
  patronymic: string;
};
export type BulkStudentResult = {
  addedCount: number;
  skipped: Array<{ line: number; fullName: string; reason: string }>;
  errors: Array<{ line: number; reason: string }>;
};
export type AuditLogRow = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  payloadJson: Record<string, unknown> | null;
  createdAt: string;
  actorName: string;
};

let auditLogReady: Promise<void> | null = null;
let parentLinkKeysReady: Promise<void> | null = null;
let studentParentLinkCodeReady: Promise<void> | null = null;

/** 7 символов A–Z и 2–9 без O/0/I/1 для читаемости */
const PARENT_LINK_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Сравнение классов по смыслу: «8 А», «8А», id «c8a» не совпадают по строке id, но один класс. */
function normalizeClassKeyForDedup(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function buildFullName(lastName: string, firstName: string, patronymic: string): string {
  return normalizeText(`${lastName} ${firstName} ${patronymic}`);
}

function makeStudentId(classId: string): string {
  return `stu-${classId.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function ensureAuditLogTable(): Promise<void> {
  if (!auditLogReady) {
    auditLogReady = (async () => {
      await getPool().query(
        `CREATE TABLE IF NOT EXISTS audit_log (
           id BIGSERIAL PRIMARY KEY,
           actor_user_id INT REFERENCES users (id) ON DELETE SET NULL,
           action TEXT NOT NULL,
           entity_type TEXT NOT NULL,
           entity_id TEXT NOT NULL,
           payload_json JSONB,
           created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`
      );
      await getPool().query(`CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC)`);
    })();
  }
  return auditLogReady;
}

async function ensureParentLinkKeysTable(): Promise<void> {
  if (!parentLinkKeysReady) {
    parentLinkKeysReady = (async () => {
      await getPool().query(
        `CREATE TABLE IF NOT EXISTS parent_link_keys (
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
         )`
      );
      await getPool().query(
        `CREATE INDEX IF NOT EXISTS idx_parent_link_keys_student
         ON parent_link_keys (student_id, status, created_at DESC)`
      );
      await getPool().query(
        `CREATE INDEX IF NOT EXISTS idx_parent_link_keys_class
         ON parent_link_keys (class_id, status, created_at DESC)`
      );
    })();
  }
  return parentLinkKeysReady;
}

function hashLinkKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

function buildReadableLinkKey(): string {
  return `PK-${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function randomParentLinkCode(): string {
  let out = "";
  const buf = randomBytes(7);
  for (let i = 0; i < 7; i += 1) {
    out += PARENT_LINK_CODE_CHARS[buf[i]! % PARENT_LINK_CODE_CHARS.length];
  }
  return out;
}

async function ensureStudentParentLinkCodeSchemaOnly(): Promise<void> {
  await getPool().query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_link_code TEXT`);
  await getPool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_students_parent_link_code ON students (parent_link_code) WHERE parent_link_code IS NOT NULL`
  );
}

async function reserveUniqueParentLinkCodeNoEnsure(client: PoolClient): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = randomParentLinkCode();
    const taken = await client.query(`SELECT 1 FROM students WHERE parent_link_code = $1`, [code]);
    if (!taken.rows.length) return code;
  }
  throw new Error("PARENT_LINK_CODE_GENERATION_FAILED");
}

async function ensureStudentParentLinkCodeColumn(): Promise<void> {
  if (!studentParentLinkCodeReady) {
    studentParentLinkCodeReady = (async () => {
      await ensureStudentParentLinkCodeSchemaOnly();
      const missing = await getPool().query<{ id: string }>(
        `SELECT id FROM students WHERE parent_link_code IS NULL OR trim(parent_link_code) = ''`
      );
      for (const r of missing.rows) {
        const client = await getPool().connect();
        try {
          await client.query("BEGIN");
          const cur = await client.query<{ parent_link_code: string | null }>(
            `SELECT parent_link_code FROM students WHERE id = $1 FOR UPDATE`,
            [r.id]
          );
          if (cur.rows[0]?.parent_link_code && String(cur.rows[0].parent_link_code).trim() !== "") {
            await client.query("COMMIT");
            continue;
          }
          const code = await reserveUniqueParentLinkCodeNoEnsure(client);
          await client.query(`UPDATE students SET parent_link_code = $1 WHERE id = $2`, [code, r.id]);
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      }
    })();
  }
  return studentParentLinkCodeReady;
}

async function reserveUniqueParentLinkCode(client: PoolClient): Promise<string> {
  await ensureStudentParentLinkCodeColumn();
  return reserveUniqueParentLinkCodeNoEnsure(client);
}

function isStudentParentLinkCodeFormat(raw: string): boolean {
  const s = raw.trim().toUpperCase();
  return /^[A-Z0-9]{7}$/.test(s);
}

async function insertParentChildIfMissing(
  client: PoolClient,
  parentUserId: number,
  studentName: string,
  classLabel: string,
  studentId: string | null = null
): Promise<{ linkedNow: boolean; studentFullName: string; classLabel: string }> {
  const parts = String(studentName || "").trim().split(/\s+/).filter(Boolean);
  const lastName = parts[0] || "";
  const firstName = parts[1] || "";
  const patronymic = parts.slice(2).join(" ");
  const exists = studentId
    ? await client.query<{ id: number }>(
        `SELECT id FROM user_parent_children
         WHERE user_id = $1 AND student_id = $2
         LIMIT 1`,
        [parentUserId, studentId]
      )
    : await client.query<{ id: number }>(
        `SELECT id FROM user_parent_children
         WHERE user_id = $1 AND last_name = $2 AND first_name = $3 AND patronymic = $4 AND class_label = $5
         LIMIT 1`,
        [parentUserId, lastName, firstName, patronymic, classLabel]
      );
  let linkedNow = false;
  if (!exists.rows[0]) {
    const ins = await client.query<{ id: number }>(
      `WITH nx AS (
         SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM user_parent_children WHERE user_id = $1
       )
       INSERT INTO user_parent_children (user_id, last_name, first_name, patronymic, class_label, sort_order, student_id)
       SELECT $1, $2, $3, $4, $5, nx.n, $6 FROM nx
       RETURNING id`,
      [parentUserId, lastName, firstName, patronymic, classLabel, studentId]
    );
    linkedNow = true;
    const newRowId = ins.rows[0]?.id;
    if (newRowId != null && studentId == null) {
      await client.query(
        `UPDATE user_parent_children upc
         SET student_id = (
           SELECT s.id FROM students s
           WHERE ${sqlUpcRowMatchesStudent("upc", "s")}
           ORDER BY s.id
           LIMIT 1
         )
         WHERE upc.id = $1 AND upc.student_id IS NULL`,
        [newRowId]
      );
    }
  }
  return { linkedNow, studentFullName: studentName, classLabel };
}

async function logAction(
  client: PoolClient,
  actorUserId: number | null | undefined,
  action: AuditAction,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>
): Promise<void> {
  await ensureAuditLogTable();
  await client.query(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, payload_json)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [actorUserId ?? null, action, entityType, entityId, JSON.stringify(payload)]
  );
}

export async function listClasses(): Promise<SchoolClassRow[]> {
  const { rows } = await getPool().query<{
    id: string;
    label: string;
    grade: number;
    students_count: string;
    class_teacher_full_name: string | null;
  }>(
    `SELECT
       sc.id,
       sc.label,
       sc.grade,
       (
         SELECT COUNT(*)::text
         FROM students s
         WHERE s.class_label = sc.label
       ) AS students_count
       ,
       trim(concat_ws(' ', u.last_name, u.first_name, NULLIF(u.patronymic, ''))) AS class_teacher_full_name
     FROM school_classes sc
      LEFT JOIN user_teacher_classes utc
       ON regexp_replace(upper(trim(utc.label)), E'\\s+', '', 'g') =
          regexp_replace(upper(trim(sc.label)), E'\\s+', '', 'g')
      AND (utc.grade = sc.grade OR utc.grade IS NULL)
     LEFT JOIN users u
       ON u.id = utc.user_id
     ORDER BY sc.grade, sc.label`
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    grade: r.grade,
    studentsCount: Number(r.students_count),
    classTeacherFullName: r.class_teacher_full_name,
  }));
}

export async function createClass(
  id: string,
  label: string,
  grade: number,
  actorUserId?: number | null
): Promise<void> {
  const normLabel = normalizeClassKeyForDedup(label);
  const dup = await getPool().query(
    `SELECT 1 FROM school_classes
     WHERE id = $1
        OR (
          grade = $2
          AND regexp_replace(upper(trim(coalesce(label, ''))), E'\\s+', '', 'g') = $3
        )`,
    [id, grade, normLabel]
  );
  if (dup.rows.length > 0) {
    throw new Error("CLASS_ALREADY_EXISTS");
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO school_classes (id, label, grade, subject_name)
       VALUES ($1, $2, $3, 'Классный час')`,
      [id, label, grade]
    );
    await logAction(client, actorUserId, "CLASS_CREATED", "class", id, { id, label, grade });
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteClass(
  id: string,
  mode: DeleteClassMode,
  targetClassId?: string,
  actorUserId?: number | null
): Promise<{ movedCount: number; deletedCount: number }> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const srcRes = await client.query<{ id: string; label: string; grade: number }>(
      `SELECT id, label, grade FROM school_classes WHERE id = $1`,
      [id]
    );
    const sourceClass = srcRes.rows[0];
    if (!sourceClass) throw new Error("CLASS_NOT_FOUND");
    if (mode === "move") {
      const to = String(targetClassId ?? "").trim().toUpperCase();
      if (!to || to === id) throw new Error("INVALID_TARGET_CLASS");
      const dstRes = await client.query<{ id: string; label: string; grade: number }>(
        `SELECT id, label, grade FROM school_classes WHERE id = $1`,
        [to]
      );
      const targetClass = dstRes.rows[0];
      if (!targetClass) throw new Error("TARGET_CLASS_NOT_FOUND");
      if (Number(targetClass.grade) !== Number(sourceClass.grade)) {
        throw new Error("TARGET_CLASS_GRADE_MISMATCH");
      }
      const moved = await client.query(
        `UPDATE students
         SET class_label = $2, class_schedule_id = $3
         WHERE class_schedule_id = $1 OR class_label = $4`,
        [sourceClass.id, targetClass.label, targetClass.id, sourceClass.label]
      );
      await client.query(`DELETE FROM class_roster WHERE class_id = $1`, [targetClass.id]);
      await client.query(
        `INSERT INTO class_roster (class_id, full_name, sort_order)
         SELECT $1, s.name, ROW_NUMBER() OVER (ORDER BY s.name) - 1
         FROM students s
         WHERE s.class_schedule_id = $1 OR s.class_label = $2`,
        [targetClass.id, targetClass.label]
      );
      await client.query(`DELETE FROM school_classes WHERE id = $1`, [sourceClass.id]);
      await logAction(client, actorUserId, "CLASS_STUDENTS_MOVED", "class", sourceClass.id, {
        fromClassId: sourceClass.id,
        toClassId: targetClass.id,
        movedCount: moved.rowCount ?? 0,
      });
      await logAction(client, actorUserId, "CLASS_DELETED", "class", sourceClass.id, {
        mode: "move",
        targetClassId: targetClass.id,
      });
      await client.query("COMMIT");
      return { movedCount: moved.rowCount ?? 0, deletedCount: 0 };
    }
    const deletedStudents = await client.query(
      `DELETE FROM students WHERE class_schedule_id = $1 OR class_label = $2`,
      [sourceClass.id, sourceClass.label]
    );
    await client.query(`DELETE FROM school_classes WHERE id = $1`, [sourceClass.id]);
    await logAction(client, actorUserId, "CLASS_DELETED", "class", sourceClass.id, {
      mode: "delete",
      deletedStudentsCount: deletedStudents.rowCount ?? 0,
    });
    await client.query("COMMIT");
    return { movedCount: 0, deletedCount: deletedStudents.rowCount ?? 0 };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listStudentsByClass(classLabel: string): Promise<StudentRow[]> {
  await ensureStudentParentLinkCodeColumn();
  const { rows } = await getPool().query<{
    id: string;
    name: string;
    class_label: string;
    parent_link_code: string | null;
  }>(
    `SELECT id, name, class_label, parent_link_code FROM students WHERE class_label = $1 ORDER BY name`,
    [classLabel]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    classLabel: r.class_label,
    parentLinkCode: r.parent_link_code != null && String(r.parent_link_code).trim() !== "" ? String(r.parent_link_code) : "",
  }));
}

export async function listAllStudents(): Promise<StudentRow[]> {
  await ensureStudentParentLinkCodeColumn();
  const { rows } = await getPool().query<{
    id: string;
    name: string;
    class_label: string;
    parent_link_code: string | null;
  }>(
    `SELECT id, name, class_label, parent_link_code FROM students ORDER BY class_label, name`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    classLabel: r.class_label,
    parentLinkCode: r.parent_link_code != null && String(r.parent_link_code).trim() !== "" ? String(r.parent_link_code) : "",
  }));
}

export async function addStudent(
  studentId: string,
  fullName: string,
  classLabel: string,
  classId: string,
  actorUserId?: number | null
): Promise<string> {
  await ensureStudentParentLinkCodeColumn();
  const normalized = normalizeText(fullName);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const dup = await client.query(
      `SELECT 1 FROM students
       WHERE (class_schedule_id = $1 OR class_label = $2) AND lower(name) = lower($3)`,
      [classId, classLabel, normalized]
    );
    if (dup.rows.length > 0) {
      throw new Error("STUDENT_DUPLICATE_IN_CLASS");
    }
    const parentLinkCode = await reserveUniqueParentLinkCodeNoEnsure(client);
    await client.query(
      `INSERT INTO students (id, name, class_label, class_schedule_id, parent_link_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [studentId, normalized, classLabel, classId, parentLinkCode]
    );
    await client.query(
      `WITH nx AS (
         SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM class_roster WHERE class_id = $1
       )
       INSERT INTO class_roster (class_id, full_name, sort_order)
       SELECT $1, $2, nx.n FROM nx`,
      [classId, normalized]
    );
    await logAction(client, actorUserId, "STUDENT_ADDED", "student", studentId, {
      classId,
      fullName: normalized,
      parentLinkCode,
    });
    await client.query("COMMIT");
    return parentLinkCode;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function removeStudent(studentId: string, classId: string, actorUserId?: number | null): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const studentRes = await client.query<{ name: string }>(`SELECT name FROM students WHERE id = $1`, [studentId]);
    const student = studentRes.rows[0];
    await client.query(
      `DELETE FROM class_roster WHERE class_id = $1 AND full_name = (SELECT name FROM students WHERE id = $2)`,
      [classId, studentId]
    );
    await client.query(`DELETE FROM students WHERE id = $1`, [studentId]);
    await logAction(client, actorUserId, "STUDENT_REMOVED", "student", studentId, {
      classId,
      fullName: student?.name ?? "",
    });
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function assignStudentToClass(studentId: string, classId: string): Promise<void> {
  await ensureStudentParentLinkCodeColumn();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ name: string; parent_link_code: string | null }>(
      `SELECT name, parent_link_code FROM students WHERE id = $1 FOR UPDATE`,
      [studentId]
    );
    const s = rows[0];
    if (!s) throw new Error("STUDENT_NOT_FOUND");
    if (!s.parent_link_code || String(s.parent_link_code).trim() === "") {
      const code = await reserveUniqueParentLinkCodeNoEnsure(client);
      await client.query(`UPDATE students SET parent_link_code = $1 WHERE id = $2`, [code, studentId]);
    }
    await client.query(
      `UPDATE students SET class_label = $1, class_schedule_id = $1 WHERE id = $2`,
      [classId, studentId]
    );
    await client.query(`DELETE FROM class_roster WHERE class_id <> $1 AND full_name = $2`, [classId, s.name]);
    await client.query(
      `WITH nx AS (
         SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM class_roster WHERE class_id = $1
       )
       INSERT INTO class_roster (class_id, full_name, sort_order)
       SELECT $1, $2, nx.n FROM nx`,
      [classId, s.name]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function bulkAddStudentsToClass(
  classId: string,
  students: BulkStudentInput[],
  actorUserId?: number | null
): Promise<BulkStudentResult> {
  await ensureStudentParentLinkCodeColumn();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const clsRes = await client.query<{ id: string; label: string }>(
      `SELECT id, label FROM school_classes WHERE id = $1`,
      [classId]
    );
    const cls = clsRes.rows[0];
    if (!cls) throw new Error("CLASS_NOT_FOUND");
    const existingRows = await client.query<{ name: string }>(
      `SELECT name FROM students WHERE class_schedule_id = $1 OR class_label = $2`,
      [cls.id, cls.label]
    );
    const existingSet = new Set(existingRows.rows.map((r) => normalizeText(r.name).toLowerCase()));
    const batchSet = new Set<string>();
    const skipped: Array<{ line: number; fullName: string; reason: string }> = [];
    const errors: Array<{ line: number; reason: string }> = [];
    let addedCount = 0;
    for (const item of students) {
      const fullName = buildFullName(item.lastName, item.firstName, item.patronymic);
      const words = fullName.split(" ").filter(Boolean);
      if (words.length < 3) {
        errors.push({ line: item.line, reason: "Нужно минимум 3 слова в ФИО" });
        continue;
      }
      const key = fullName.toLowerCase();
      if (existingSet.has(key) || batchSet.has(key)) {
        skipped.push({ line: item.line, fullName, reason: "Дубликат ФИО в классе" });
        continue;
      }
      const studentId = makeStudentId(classId);
      const parentLinkCode = await reserveUniqueParentLinkCodeNoEnsure(client);
      await client.query(
        `INSERT INTO students (id, name, class_label, class_schedule_id, parent_link_code)
         VALUES ($1, $2, $3, $4, $5)`,
        [studentId, fullName, cls.label, cls.id, parentLinkCode]
      );
      await client.query(
        `WITH nx AS (
           SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM class_roster WHERE class_id = $1
         )
         INSERT INTO class_roster (class_id, full_name, sort_order)
         SELECT $1, $2, nx.n FROM nx`,
        [cls.id, fullName]
      );
      batchSet.add(key);
      addedCount += 1;
    }
    if (addedCount > 0) {
      await logAction(client, actorUserId, "STUDENTS_BULK_ADDED", "class", classId, {
        classId,
        addedCount,
        skippedCount: skipped.length,
        errorsCount: errors.length,
      });
    }
    await client.query("COMMIT");
    return { addedCount, skipped, errors };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listAuditLog(limit = 20): Promise<AuditLogRow[]> {
  await ensureAuditLogTable();
  const { rows } = await getPool().query<{
    id: number;
    action: string;
    entity_type: string;
    entity_id: string;
    payload_json: Record<string, unknown> | null;
    created_at: string;
    actor_email: string | null;
    actor_last_name: string | null;
    actor_first_name: string | null;
    actor_patronymic: string | null;
  }>(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.payload_json, a.created_at,
            u.email AS actor_email, u.last_name AS actor_last_name, u.first_name AS actor_first_name, u.patronymic AS actor_patronymic
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.actor_user_id
     ORDER BY a.id DESC
     LIMIT $1`,
    [Math.max(1, Math.min(100, limit))]
  );
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    payloadJson: r.payload_json,
    createdAt: r.created_at,
    actorName:
      [r.actor_last_name, r.actor_first_name, r.actor_patronymic].filter(Boolean).join(" ").trim() ||
      r.actor_email ||
      "Система",
  }));
}

export async function listParentsPaged(params: ParentListParams): Promise<ParentListResult> {
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 15));
  const offset = Math.max(0, Number(params.offset) || 0);
  const search = normalizeText(String(params.search || "")).toLowerCase();
  const filter = params.filter;
  const sortBy = params.sortBy;
  const sortDir = params.sortDir === "desc" ? "DESC" : "ASC";

  const orderExpr =
    sortBy === "children"
      ? "children_count"
      : sortBy === "status"
      ? "status_rank"
      : "parent_name";

  const { rows } = await getPool().query<{
    id: number;
    email: string;
    last_name: string | null;
    first_name: string | null;
    patronymic: string | null;
    children: Array<{ fullName: string; confirmed: boolean }> | null;
    confirmed_count: string;
    pending_count: string;
    total_count: string;
  }>(
    `WITH children_agg AS (
       SELECT
         upc.user_id,
         COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'fullName', trim(concat_ws(' ', upc.last_name, upc.first_name, NULLIF(upc.patronymic, ''))),
               'confirmed', TRUE
             )
             ORDER BY upc.sort_order, upc.last_name, upc.first_name, upc.patronymic
           ),
           '[]'::jsonb
         ) AS children,
         COALESCE(
           string_agg(trim(concat_ws(' ', upc.last_name, upc.first_name, NULLIF(upc.patronymic, ''))), ' '),
           ''
         ) AS children_search,
         COUNT(*)::int AS confirmed_count,
         0::int AS pending_count,
         COUNT(*)::int AS children_count
       FROM user_parent_children upc
       GROUP BY upc.user_id
     ),
     parent_rows AS (
       SELECT
         u.id,
         u.email,
         u.last_name,
         u.first_name,
         u.patronymic,
         trim(concat_ws(' ', u.last_name, u.first_name, NULLIF(u.patronymic, ''))) AS parent_name,
         COALESCE(ca.children, '[]'::jsonb) AS children,
         COALESCE(ca.children_search, '') AS children_search,
         COALESCE(ca.confirmed_count, 0)::int AS confirmed_count,
         COALESCE(ca.pending_count, 0)::int AS pending_count,
         COALESCE(ca.children_count, 0)::int AS children_count
       FROM users u
       LEFT JOIN children_agg ca ON ca.user_id = u.id
       WHERE u.role = 'parent'
     ),
     filtered AS (
       SELECT
         pr.*,
         CASE
           WHEN pr.pending_count > 0 THEN 'pending'
           WHEN pr.confirmed_count > 0 THEN 'confirmed'
           ELSE 'none'
         END AS confirmation_state,
         CASE
           WHEN pr.pending_count > 0 THEN 0
           WHEN pr.confirmed_count > 0 THEN 1
           ELSE 2
         END AS status_rank
       FROM parent_rows pr
       WHERE
         ($1 = '' OR
          lower(pr.parent_name) LIKE '%' || $1 || '%' OR
          lower(pr.email) LIKE '%' || $1 || '%' OR
          lower(pr.children_search) LIKE '%' || $1 || '%')
         AND (
           $2 = 'all'
           OR ($2 = 'confirmed' AND pr.pending_count = 0 AND pr.confirmed_count > 0)
           OR ($2 = 'pending' AND pr.pending_count > 0)
           OR ($2 = 'empty' AND pr.children_count = 0)
         )
     )
     SELECT
       f.id,
       f.email,
       f.last_name,
       f.first_name,
       f.patronymic,
       f.children,
       f.confirmed_count::text,
       f.pending_count::text,
       COUNT(*) OVER()::text AS total_count
     FROM filtered f
     ORDER BY ${orderExpr} ${sortDir}, parent_name ASC, id ASC
     LIMIT $3 OFFSET $4`,
    [search, filter, limit, offset]
  );
  const parents = rows.map((r) => {
    const confirmationState: "confirmed" | "pending" | "none" =
      Number(r.pending_count) > 0 ? "pending" : (Number(r.confirmed_count) > 0 ? "confirmed" : "none");
    return ({
    id: r.id,
    email: r.email,
    fullName: [r.last_name, r.first_name, r.patronymic].filter(Boolean).join(" ").trim(),
    children: Array.isArray(r.children) ? r.children : [],
    confirmedCount: Number(r.confirmed_count),
    pendingCount: Number(r.pending_count),
    confirmationState,
    phone: "",
    avatarUrl: "",
  });
  });
  const total = rows.length ? Number(rows[0].total_count) : 0;
  const nextOffset = offset + parents.length;
  return {
    parents,
    total,
    hasMore: nextOffset < total,
    nextOffset,
  };
}

export async function linkChildToParent(parentUserId: number, studentId: string): Promise<void> {
  const { rows } = await getPool().query<{ name: string; class_label: string }>(
    `SELECT name, class_label FROM students WHERE id = $1`,
    [studentId]
  );
  const s = rows[0];
  if (!s) throw new Error("STUDENT_NOT_FOUND");
  const parts = s.name.trim().split(/\s+/);
  const lastName = parts[0] ?? "";
  const firstName = parts[1] ?? "";
  const patronymic = parts.slice(2).join(" ");
  await getPool().query(
    `WITH nx AS (
       SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM user_parent_children WHERE user_id = $1
     )
    INSERT INTO user_parent_children (user_id, last_name, first_name, patronymic, class_label, sort_order, student_id)
    SELECT $1, $2, $3, $4, $5, nx.n, $6 FROM nx`,
    [parentUserId, lastName, firstName, patronymic, s.class_label, studentId]
  );
}

export async function createOrRotateParentLinkKey(
  studentId: string,
  classId: string,
  createdByUserId: number | null,
  ttlDays = 7
): Promise<{ id: number; key: string; expiresAt: string | null }> {
  await ensureParentLinkKeysTable();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const studentRes = await client.query<{ id: string; class_schedule_id: string | null; class_label: string; name: string }>(
      `SELECT id, class_schedule_id, class_label, name
       FROM students
       WHERE id = $1
       FOR UPDATE`,
      [studentId]
    );
    const student = studentRes.rows[0];
    if (!student) throw new Error("STUDENT_NOT_FOUND");
    if ((student.class_schedule_id || "").trim().toUpperCase() !== classId.trim().toUpperCase()) {
      throw new Error("STUDENT_CLASS_MISMATCH");
    }
    await client.query(
      `UPDATE parent_link_keys
       SET status = 'revoked'
       WHERE student_id = $1 AND class_id = $2 AND status = 'active'`,
      [studentId, classId]
    );
    const rawKey = buildReadableLinkKey();
    const keyHash = hashLinkKey(rawKey);
    const expiresAt = Number.isFinite(ttlDays) && ttlDays > 0 ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000) : null;
    const ins = await client.query<{ id: string; expires_at: string | null }>(
      `INSERT INTO parent_link_keys
       (student_id, class_id, class_label, link_key_hash, status, expires_at, created_by_user_id)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)
       RETURNING id::text, expires_at`,
      [studentId, classId, student.class_label, keyHash, expiresAt, createdByUserId]
    );
    await logAction(client, createdByUserId, "STUDENT_ADDED", "parent_link_key", String(ins.rows[0].id), {
      studentId,
      classId,
      classLabel: student.class_label,
      studentName: student.name,
    });
    await client.query("COMMIT");
    return { id: Number(ins.rows[0].id), key: rawKey, expiresAt: ins.rows[0].expires_at };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function revokeParentLinkKey(keyId: number): Promise<void> {
  await ensureParentLinkKeysTable();
  const { rowCount } = await getPool().query(
    `UPDATE parent_link_keys
     SET status = 'revoked'
     WHERE id = $1 AND status = 'active'`,
    [keyId]
  );
  if (!rowCount) throw new Error("LINK_KEY_NOT_FOUND_OR_INACTIVE");
}

export async function listParentLinkKeys(params: {
  classId?: string;
  status?: "all" | ParentLinkKeyStatus;
  limit?: number;
}): Promise<ParentLinkKeyRow[]> {
  await ensureParentLinkKeysTable();
  const where: string[] = [];
  const values: unknown[] = [];
  if (params.classId) {
    values.push(params.classId.trim().toUpperCase());
    where.push(`k.class_id = $${values.length}`);
  }
  if (params.status && params.status !== "all") {
    values.push(params.status);
    where.push(`k.status = $${values.length}`);
  }
  const limit = Math.max(1, Math.min(500, Number(params.limit) || 100));
  values.push(limit);
  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await getPool().query<{
    id: string;
    student_id: string;
    class_id: string;
    class_label: string;
    student_full_name: string;
    status: ParentLinkKeyStatus;
    expires_at: string | null;
    usage_count: string;
    created_at: string;
    last_used_at: string | null;
  }>(
    `SELECT
       k.id::text, k.student_id, k.class_id, k.class_label, s.name AS student_full_name,
       k.status, k.expires_at, k.usage_count::text, k.created_at, k.last_used_at
     FROM parent_link_keys k
     JOIN students s ON s.id = k.student_id
     ${sqlWhere}
     ORDER BY k.id DESC
     LIMIT $${values.length}`,
    values
  );
  return rows.map((r) => ({
    id: Number(r.id),
    studentId: r.student_id,
    classId: r.class_id,
    classLabel: r.class_label,
    studentFullName: r.student_full_name,
    status: r.status,
    expiresAt: r.expires_at,
    usageCount: Number(r.usage_count),
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
  }));
}

export async function redeemParentLinkKey(
  parentUserId: number,
  rawKey: string
): Promise<{ linkedNow: boolean; studentFullName: string; classLabel: string }> {
  const trimmed = rawKey.trim().toUpperCase();
  if (isStudentParentLinkCodeFormat(trimmed)) {
    await ensureStudentParentLinkCodeColumn();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const stRes = await client.query<{ id: string; name: string; class_label: string }>(
        `SELECT id, name, class_label FROM students WHERE parent_link_code = $1 FOR UPDATE`,
        [trimmed]
      );
      const st = stRes.rows[0];
      if (!st) throw new Error("LINK_KEY_NOT_FOUND");
      const out = await insertParentChildIfMissing(client, parentUserId, st.name, st.class_label, st.id);
      await client.query("COMMIT");
      return out;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  await ensureParentLinkKeysTable();
  const keyHash = hashLinkKey(trimmed);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const keyRes = await client.query<{
      id: number;
      class_label: string;
      status: ParentLinkKeyStatus;
      expires_at: string | null;
      student_name: string;
      student_id: string;
    }>(
      `SELECT k.id, k.class_label, k.status, k.expires_at, s.name AS student_name, s.id AS student_id
       FROM parent_link_keys k
       JOIN students s ON s.id = k.student_id
       WHERE k.link_key_hash = $1
       FOR UPDATE`,
      [keyHash]
    );
    const row = keyRes.rows[0];
    if (!row) throw new Error("LINK_KEY_NOT_FOUND");
    if (row.status !== "active") throw new Error("LINK_KEY_INACTIVE");
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      await client.query(`UPDATE parent_link_keys SET status = 'expired' WHERE id = $1`, [row.id]);
      throw new Error("LINK_KEY_EXPIRED");
    }
    const out = await insertParentChildIfMissing(
      client,
      parentUserId,
      row.student_name,
      row.class_label,
      row.student_id
    );
    await client.query(
      `UPDATE parent_link_keys
       SET usage_count = usage_count + 1, last_used_at = NOW()
       WHERE id = $1`,
      [row.id]
    );
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listTeachersWithSubjects(): Promise<TeacherRow[]> {
  const { rows } = await getPool().query<{
    id: number;
    email: string;
    last_name: string | null;
    first_name: string | null;
    patronymic: string | null;
    subject_name: string | null;
  }>(
    `SELECT u.id, u.email, u.last_name, u.first_name, u.patronymic, ts.subject_name
     FROM users u
     LEFT JOIN teacher_subjects ts ON ts.teacher_user_id = u.id
     WHERE u.role = 'teacher'
     ORDER BY u.id, ts.subject_name`
  );
  const map = new Map<number, TeacherRow>();
  for (const r of rows) {
    if (!map.has(r.id)) {
      map.set(r.id, {
        id: r.id,
        email: r.email,
        fullName: [r.last_name, r.first_name, r.patronymic].filter(Boolean).join(" ").trim(),
        subjects: [],
      });
    }
    if (r.subject_name) map.get(r.id)!.subjects.push(r.subject_name);
  }
  return [...map.values()];
}

/** Та же строка, что в таблице «Учителя» у директора: ФИО + предметы по `subject_name`. */
export async function getTeacherCardByUserId(
  teacherUserId: number
): Promise<TeacherRow | null> {
  const { rows } = await getPool().query<{
    id: number;
    email: string;
    last_name: string | null;
    first_name: string | null;
    patronymic: string | null;
    subject_name: string | null;
  }>(
    `SELECT u.id, u.email, u.last_name, u.first_name, u.patronymic, ts.subject_name
     FROM users u
     LEFT JOIN teacher_subjects ts ON ts.teacher_user_id = u.id
     WHERE u.id = $1 AND u.role = 'teacher'
     ORDER BY ts.subject_name`,
    [teacherUserId]
  );
  if (rows.length === 0) return null;
  const subjects: string[] = [];
  const id = rows[0].id;
  const email = rows[0].email;
  const fullName = [rows[0].last_name, rows[0].first_name, rows[0].patronymic]
    .filter(Boolean)
    .join(" ")
    .trim();
  for (const r of rows) {
    if (r.subject_name) subjects.push(r.subject_name);
  }
  return { id, email, fullName, subjects };
}

export async function listTeachersWithSubjectsPaged(params: {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: "name";
  sortDir?: "asc" | "desc";
}): Promise<TeacherListResult> {
  const limit = Math.max(1, Math.min(100, Math.trunc(Number(params.limit) || 15)));
  const offset = Math.max(0, Math.trunc(Number(params.offset) || 0));
  const search = String(params.search ?? "").trim();
  const q = search ? `%${search.toLowerCase()}%` : "";
  const sortDir = params.sortDir === "desc" ? "DESC" : "ASC";
  const orderSql = `f.last_name ${sortDir} NULLS LAST, f.first_name ${sortDir} NULLS LAST, f.patronymic ${sortDir} NULLS LAST, f.id ${sortDir}`;
  const { rows } = await getPool().query<{
    id: number;
    email: string;
    last_name: string | null;
    first_name: string | null;
    patronymic: string | null;
    subject_name: string | null;
    total_count: string;
  }>(
    `WITH filtered AS (
       SELECT u.id, u.email, u.last_name, u.first_name, u.patronymic
       FROM users u
       WHERE u.role = 'teacher'
         AND (
           $3::text = ''
           OR lower(coalesce(u.last_name, '') || ' ' || coalesce(u.first_name, '') || ' ' || coalesce(u.patronymic, '')) LIKE $3
           OR lower(coalesce(u.email, '')) LIKE $3
           OR EXISTS (
             SELECT 1
             FROM teacher_subjects ts
             WHERE ts.teacher_user_id = u.id
               AND lower(coalesce(ts.subject_name, '')) LIKE $3
           )
         )
     ),
     page AS (
       SELECT f.id, f.email, f.last_name, f.first_name, f.patronymic,
              COUNT(*) OVER()::text AS total_count
       FROM filtered f
       ORDER BY ${orderSql}
       LIMIT $1 OFFSET $2
     )
     SELECT p.id, p.email, p.last_name, p.first_name, p.patronymic, p.total_count, ts.subject_name
     FROM page p
     LEFT JOIN teacher_subjects ts ON ts.teacher_user_id = p.id
     ORDER BY p.last_name ${sortDir} NULLS LAST,
              p.first_name ${sortDir} NULLS LAST,
              p.patronymic ${sortDir} NULLS LAST,
              p.id ${sortDir},
              ts.subject_name`,
    [limit, offset, q]
  );
  const total = rows.length ? Number(rows[0].total_count) : 0;
  const map = new Map<number, TeacherRow>();
  for (const r of rows) {
    if (!map.has(r.id)) {
      map.set(r.id, {
        id: r.id,
        email: r.email,
        fullName: [r.last_name, r.first_name, r.patronymic].filter(Boolean).join(" ").trim(),
        subjects: [],
      });
    }
    if (r.subject_name) map.get(r.id)!.subjects.push(r.subject_name);
  }
  const teachers = [...map.values()];
  const nextOffset = offset + teachers.length;
  return {
    teachers,
    total,
    hasMore: nextOffset < total,
    nextOffset,
  };
}

export async function createTeacher(
  email: string,
  passwordHash: string,
  lastName: string,
  firstName: string,
  patronymic: string
): Promise<number> {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
     VALUES ($1, $2, 'teacher', $3, $4, $5)
     RETURNING id`,
    [email.toLowerCase(), passwordHash, lastName, firstName, patronymic]
  );
  return rows[0].id;
}

export async function deleteTeacher(teacherUserId: number): Promise<void> {
  await getPool().query(`DELETE FROM users WHERE id = $1 AND role = 'teacher'`, [teacherUserId]);
}

export async function setTeacherSubjects(teacherUserId: number, subjects: string[]): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM teacher_subjects WHERE teacher_user_id = $1`, [teacherUserId]);
  for (const s of subjects) {
    await pool.query(
      `INSERT INTO teacher_subjects (teacher_user_id, subject_name) VALUES ($1, $2)`,
      [teacherUserId, s]
    );
  }
}

/** Тот же состав и порядок, что при сборке колонки «Предметы» у директора */
export async function listTeacherSubjectNames(teacherUserId: number): Promise<string[]> {
  const { rows } = await getPool().query<{ subject_name: string }>(
    `SELECT subject_name FROM teacher_subjects WHERE teacher_user_id = $1 ORDER BY subject_name`,
    [teacherUserId]
  );
  return rows.map((r) => r.subject_name);
}

export async function getQuarterSchedule(classId: string, quarter: number) {
  const { rows } = await getPool().query<{
    weekday_idx: number;
    lesson_order: number;
    subject_name: string;
    teacher_user_id: number | null;
    time_label: string;
    teacher_name: string | null;
    cabinet_label: string;
  }>(
    `SELECT
       s.weekday_idx,
       s.lesson_order,
       s.subject_name,
       s.teacher_user_id,
       s.time_label,
       NULLIF(
         trim(
           concat_ws(
             ' ',
             coalesce(u.last_name, su.last_name),
             coalesce(u.first_name, su.first_name),
             NULLIF(coalesce(u.patronymic, su.patronymic, ''), '')
           )
         ),
         ''
       ) AS teacher_name,
       (CASE
         WHEN lower(s.subject_name) LIKE '%физическ%' THEN 'Спортзал'
         WHEN lower(s.subject_name) LIKE '%хими%' THEN 'Лаб. химии'
         WHEN lower(s.subject_name) LIKE '%физик%' AND lower(s.subject_name) NOT LIKE '%физическ%' THEN 'Лаб. физики'
         WHEN lower(s.subject_name) LIKE '%информат%' THEN 'Каб. информатики'
         WHEN lower(s.subject_name) LIKE '%музык%' THEN 'Каб. музыки'
         WHEN lower(s.subject_name) LIKE '%изобраз%' THEN 'Каб. ИЗО'
         WHEN lower(s.subject_name) LIKE '%труд%' THEN 'Мастерская'
         ELSE 'Каб. общего типа'
       END) AS cabinet_label
     FROM director_quarter_schedule s
     LEFT JOIN users u ON u.id = s.teacher_user_id
     LEFT JOIN LATERAL (
       SELECT u2.last_name, u2.first_name, u2.patronymic
       FROM teacher_subjects ts
       JOIN users u2 ON u2.id = ts.teacher_user_id
       WHERE lower(trim(ts.subject_name)) = lower(trim(s.subject_name))
       ORDER BY ts.teacher_user_id
       LIMIT 1
     ) su ON TRUE
     WHERE s.class_id = $1 AND s.quarter = $2
     ORDER BY s.weekday_idx, s.lesson_order`,
    [classId, quarter]
  );
  return rows;
}

export async function saveQuarterSchedule(
  classId: string,
  quarter: number,
  items: Array<{
    weekdayIdx: number;
    lessonOrder: number;
    subjectName: string;
    teacherUserId: number | null;
    timeLabel: string;
  }>
): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM director_quarter_schedule WHERE class_id = $1 AND quarter = $2`, [classId, quarter]);
  for (const it of items) {
    await pool.query(
      `INSERT INTO director_quarter_schedule
       (class_id, quarter, weekday_idx, lesson_order, subject_name, teacher_user_id, time_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [classId, quarter, it.weekdayIdx, it.lessonOrder, it.subjectName, it.teacherUserId, it.timeLabel]
    );
  }
}

export async function validateQuarterConflicts(quarter: number) {
  const { rows } = await getPool().query<{
    teacher_user_id: number;
    weekday_idx: number;
    lesson_order: number;
    classes: string[];
    cnt: string;
  }>(
    `SELECT teacher_user_id, weekday_idx, lesson_order,
            array_agg(class_id ORDER BY class_id) AS classes,
            COUNT(*)::text AS cnt
     FROM director_quarter_schedule
     WHERE quarter = $1 AND teacher_user_id IS NOT NULL
     GROUP BY teacher_user_id, weekday_idx, lesson_order
     HAVING COUNT(*) > 1`,
    [quarter]
  );
  return rows.map((r) => ({
    teacherUserId: r.teacher_user_id,
    weekdayIdx: r.weekday_idx,
    lessonOrder: r.lesson_order,
    classes: r.classes,
    count: Number(r.cnt),
  }));
}

export async function estimateResourcesFromQuarter(
  quarter: number,
  dayLimit: number,
  subjectRoomTypeMap: Record<string, string>
): Promise<{
  teachersRequiredBySubject: Array<{
    subjectName: string;
    requiredTeachers: number;
    weeklyLessons: number;
    maxParallel: number;
    maxDaily: number;
    existingTeachers: number;
    shortage: number;
  }>;
  roomsRequiredByType: Array<{ roomType: string; requiredCount: number }>;
  totals: { requiredTeachers: number; requiredRooms: number };
  warnings: string[];
}> {
  const safeQuarter = Math.max(1, Math.min(4, Number(quarter) || 4));
  const safeDayLimit = Math.max(1, Math.min(8, Number(dayLimit) || 5));
  const slots = await getPool().query<{
    subject_name: string;
    weekday_idx: number;
    lesson_order: number;
  }>(
    `SELECT subject_name, weekday_idx, lesson_order
     FROM director_quarter_schedule
     WHERE quarter = $1`,
    [safeQuarter]
  );
  const warnings: string[] = [];
  if (!slots.rows.length) {
    return {
      teachersRequiredBySubject: [],
      roomsRequiredByType: [],
      totals: { requiredTeachers: 0, requiredRooms: 0 },
      warnings: ["В расписании выбранной четверти нет данных"],
    };
  }
  const normalizeSubject = (s: string) => normalizeText(String(s || "")).toLowerCase();
  const bySubject = new Map<
    string,
    {
      subjectName: string;
      weeklyLessons: number;
      bySlot: Map<string, number>;
      byDay: Map<number, number>;
    }
  >();
  const byRoomTypeSlot = new Map<string, number>();
  const normRoomMap = new Map<string, string>();
  Object.entries(subjectRoomTypeMap || {}).forEach(([k, v]) => {
    const nk = normalizeSubject(k);
    const roomType = String(v || "").trim() || "regular";
    if (nk) normRoomMap.set(nk, roomType);
  });
  for (const row of slots.rows) {
    const rawSubject = normalizeText(row.subject_name || "");
    if (!rawSubject) continue;
    const subjectKey = normalizeSubject(rawSubject);
    const slotKey = `${row.weekday_idx}:${row.lesson_order}`;
    let agg = bySubject.get(subjectKey);
    if (!agg) {
      agg = {
        subjectName: rawSubject,
        weeklyLessons: 0,
        bySlot: new Map<string, number>(),
        byDay: new Map<number, number>(),
      };
      bySubject.set(subjectKey, agg);
    }
    agg.weeklyLessons += 1;
    agg.bySlot.set(slotKey, (agg.bySlot.get(slotKey) || 0) + 1);
    agg.byDay.set(row.weekday_idx, (agg.byDay.get(row.weekday_idx) || 0) + 1);

    const roomType = normRoomMap.get(subjectKey) || "regular";
    if (!normRoomMap.has(subjectKey)) {
      warnings.push(`Для предмета "${rawSubject}" не задан тип кабинета, использован regular`);
    }
    const roomSlotKey = `${roomType}:${slotKey}`;
    byRoomTypeSlot.set(roomSlotKey, (byRoomTypeSlot.get(roomSlotKey) || 0) + 1);
  }
  const teacherRows = await getPool().query<{ subject_key: string; cnt: string }>(
    `SELECT lower(trim(subject_name)) AS subject_key,
            COUNT(DISTINCT teacher_user_id)::text AS cnt
     FROM teacher_subjects
     GROUP BY lower(trim(subject_name))`
  );
  const teacherBySubject = new Map<string, number>();
  teacherRows.rows.forEach((r) => teacherBySubject.set(r.subject_key, Number(r.cnt) || 0));

  const teachersRequiredBySubject = [...bySubject.entries()]
    .map(([subjectKey, agg]) => {
      const maxParallel = [...agg.bySlot.values()].reduce((m, v) => Math.max(m, v), 0);
      const maxDaily = [...agg.byDay.values()].reduce((m, v) => Math.max(m, v), 0);
      const weeklyCapacityPerTeacher = safeDayLimit * 5;
      const byWeekly = Math.ceil(agg.weeklyLessons / weeklyCapacityPerTeacher);
      const byDay = Math.ceil(maxDaily / safeDayLimit);
      const requiredTeachers = Math.max(maxParallel, byDay, byWeekly, 1);
      const existingTeachers = teacherBySubject.get(subjectKey) || 0;
      return {
        subjectName: agg.subjectName,
        requiredTeachers,
        weeklyLessons: agg.weeklyLessons,
        maxParallel,
        maxDaily,
        existingTeachers,
        shortage: Math.max(0, requiredTeachers - existingTeachers),
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "ru"));

  const roomMax = new Map<string, number>();
  byRoomTypeSlot.forEach((v, key) => {
    const roomType = key.split(":")[0];
    roomMax.set(roomType, Math.max(roomMax.get(roomType) || 0, v));
  });
  const roomsRequiredByType = [...roomMax.entries()]
    .map(([roomType, requiredCount]) => ({ roomType, requiredCount }))
    .sort((a, b) => a.roomType.localeCompare(b.roomType, "ru"));

  return {
    teachersRequiredBySubject,
    roomsRequiredByType,
    totals: {
      requiredTeachers: teachersRequiredBySubject.reduce((sum, x) => sum + x.requiredTeachers, 0),
      requiredRooms: roomsRequiredByType.reduce((sum, x) => sum + x.requiredCount, 0),
    },
    warnings: [...new Set(warnings)],
  };
}
