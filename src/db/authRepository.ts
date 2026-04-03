import { getPool, withPgRetry } from "./pool";

export type UserRole = "parent" | "teacher" | "director";

export interface AuthUserRow {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
}

export async function dbFindUserByEmail(emailLower: string): Promise<AuthUserRow | null> {
  return withPgRetry(async () => {
    const { rows } = await getPool().query<AuthUserRow>(
      `SELECT id, email, password_hash, role FROM users WHERE lower(email) = $1`,
      [emailLower.trim().toLowerCase()]
    );
    const r = rows[0];
    if (!r) return null;
    if (r.role !== "parent" && r.role !== "teacher" && r.role !== "director") return null;
    return r;
  });
}

export interface RegisterProfile {
  lastName: string;
  firstName: string;
  patronymic: string;
}

export async function dbCreateUser(
  emailLower: string,
  passwordHash: string,
  role: UserRole,
  profile: RegisterProfile
): Promise<AuthUserRow> {
  const norm = emailLower.trim().toLowerCase();
  const { rows } = await getPool().query<AuthUserRow>(
    `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, password_hash, role`,
    [
      norm,
      passwordHash,
      role,
      profile.lastName.trim(),
      profile.firstName.trim(),
      profile.patronymic.trim(),
    ]
  );
  const r = rows[0];
  if (!r) throw new Error("CREATE_FAILED");
  return r;
}
