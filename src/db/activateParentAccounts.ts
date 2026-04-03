import bcrypt from "bcrypt";
import { getPool, closePool } from "./pool";

const DEFAULT_PARENT_PASSWORD = "Parent2026";

type ParentRow = {
  id: number;
  email: string | null;
  last_name: string | null;
  first_name: string | null;
  patronymic: string | null;
  has_password: boolean;
};

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function translitRuToLat(input: string): string {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  return input
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

async function main(): Promise<void> {
  const pool = getPool();
  const passwordHash = await bcrypt.hash(DEFAULT_PARENT_PASSWORD, 10);

  // Берём только тех родителей, которые реально привязаны к детям
  const { rows } = await pool.query<ParentRow>(
    `SELECT
       u.id,
       u.email,
       u.last_name,
       u.first_name,
       u.patronymic,
       (u.password_hash IS NOT NULL AND u.password_hash <> '') AS has_password
     FROM users u
     WHERE u.role = 'parent'
       AND EXISTS (
         SELECT 1
         FROM user_parent_children upc
         WHERE upc.user_id = u.id
       )
     ORDER BY u.id`
  );

  let updatedCount = 0;
  let createdEmailCount = 0;
  let passwordSetCount = 0;

  for (const p of rows) {
    let email = (p.email || "").trim().toLowerCase();
    if (!email) {
      // Строим базу email из фамилии, при отсутствии — из id
      const lastName = normalizeSpaces((p.last_name || "").toLowerCase());
      let base = lastName || `family${p.id}`;
      base = translitRuToLat(base) || `family${p.id}`;
      email = `${base}.parent@school.local`;
      createdEmailCount += 1;
      await pool.query(`UPDATE users SET email = $1 WHERE id = $2`, [email, p.id]);
    }

    if (!p.has_password) {
      await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, p.id]);
      passwordSetCount += 1;
    }

    updatedCount += 1;
  }

  console.log("[activateParentAccounts] parents processed:", updatedCount);
  console.log("[activateParentAccounts] emails created:", createdEmailCount);
  console.log("[activateParentAccounts] passwords set:", passwordSetCount);
  console.log("[activateParentAccounts] default password for new parents:", DEFAULT_PARENT_PASSWORD);

  await closePool();
}

main().catch(async (err) => {
  console.error("[activateParentAccounts] error", err);
  await closePool();
  process.exit(1);
});

