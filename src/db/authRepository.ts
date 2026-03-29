import { getPool } from "./pool";

export type UserRole = "parent" | "teacher";

export interface AuthUserRow {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
}

export async function dbFindUserByEmail(emailLower: string): Promise<AuthUserRow | null> {
  const { rows } = await getPool().query<AuthUserRow>(
    `SELECT id, email, password_hash, role FROM users WHERE lower(email) = $1`,
    [emailLower.trim().toLowerCase()]
  );
  const r = rows[0];
  if (!r) return null;
  if (r.role !== "parent" && r.role !== "teacher") return null;
  return r;
}

export async function dbCreateUser(
  emailLower: string,
  passwordHash: string,
  role: UserRole
): Promise<AuthUserRow> {
  const norm = emailLower.trim().toLowerCase();
  const { rows } = await getPool().query<AuthUserRow>(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
     RETURNING id, email, password_hash, role`,
    [norm, passwordHash, role]
  );
  const r = rows[0];
  if (!r) throw new Error("CREATE_FAILED");
  return r;
}
