import type { Pool } from "pg";

/** Пароль в открытом виде — только для логов/доков; в БД передаётся `passwordHash`. */
export const FAMILY_PARENT_PASSWORD = "FamilyParent2026";

type StudentNameRow = { id: string; name: string; class_label: string };
type UpsertParentRow = { id: number };

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function splitFio(fullName: string): { lastName: string; firstName: string; patronymic: string } | null {
  const clean = normalizeSpaces(fullName);
  if (!clean) return null;
  const parts = clean.split(" ");
  if (!parts[0] || !parts[1]) return null;
  return {
    lastName: parts[0],
    firstName: parts[1],
    patronymic: parts.slice(2).join(" "),
  };
}

function translitRuToLat(input: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return input
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function familyGroupKey(lastName: string): string {
  const raw = normalizeSpaces(lastName)
    .toLowerCase()
    .replace(/ё/g, "е");
  if (!raw) return "";
  if (raw.endsWith("ова") || raw.endsWith("ева") || raw.endsWith("ина")) {
    return raw.slice(0, -1);
  }
  if (raw.endsWith("ская")) {
    return `${raw.slice(0, -4)}ский`;
  }
  return raw;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type SyncFamilyParentsOptions = {
  passwordHash: string;
  /** Не удалять родительские учётки с этими email при финальной чистке (редко нужно). */
  preservedParentEmails?: string[];
};

export type SyncFamilyParentsResult = {
  families: number;
  parents: number;
  linkedChildren: number;
};

/**
 * Полная пересборка: user_parent_children и родители по таблице students.
 * ФИО родителя: фамилия семьи как у детей, имя «Родитель», почта translit.parent@school.local
 */
export async function syncFamilyParents(
  pool: Pool,
  opts: SyncFamilyParentsOptions
): Promise<SyncFamilyParentsResult> {
  const { passwordHash, preservedParentEmails = [] } = opts;
  const { rows } = await pool.query<StudentNameRow>(
    `SELECT id, name, class_label
     FROM students
     ORDER BY class_label, name`
  );

  const families = new Map<string, { familyLastName: string; students: StudentNameRow[] }>();
  for (const s of rows) {
    const fio = splitFio(s.name);
    if (!fio) continue;
    const exact = normalizeSpaces(fio.lastName);
    const key = familyGroupKey(exact) || exact.toLowerCase();
    const entry = families.get(key) ?? {
      familyLastName: capitalize(exact),
      students: [],
    };
    entry.students.push(s);
    families.set(key, entry);
  }

  for (const entry of families.values()) {
    const freq = new Map<string, number>();
    for (const st of entry.students) {
      const p = splitFio(st.name);
      if (!p) continue;
      const ln = normalizeSpaces(p.lastName);
      freq.set(ln, (freq.get(ln) ?? 0) + 1);
    }
    let best = entry.familyLastName;
    let bestCount = 0;
    for (const [ln, c] of freq) {
      if (c > bestCount) {
        bestCount = c;
        best = capitalize(ln);
      }
    }
    entry.familyLastName = best;
  }

  let parentsCount = 0;
  let linkedChildren = 0;
  let fallbackSeq = 1;
  const expectedEmails = new Set<string>();

  await pool.query(`BEGIN`);
  try {
    await pool.query(`DELETE FROM user_parent_children`);

    for (const entry of families.values()) {
      const students = entry.students;
      if (!students.length) continue;

      let emailBase = translitRuToLat(entry.familyLastName);
      if (!emailBase) {
        emailBase = `family${fallbackSeq}`;
        fallbackSeq += 1;
      }
      let email = `${emailBase}.parent@school.local`;
      let emailSeq = 2;
      while (expectedEmails.has(email)) {
        email = `${emailBase}${emailSeq}.parent@school.local`;
        emailSeq += 1;
      }
      expectedEmails.add(email);

      const upsert = await pool.query<UpsertParentRow>(
        `INSERT INTO users (email, password_hash, role, last_name, first_name, patronymic)
         VALUES ($1, $2, 'parent', $3, 'Родитель', '')
         ON CONFLICT (email) DO UPDATE SET
           role = EXCLUDED.role,
           last_name = EXCLUDED.last_name
         RETURNING id`,
        [email, passwordHash, entry.familyLastName]
      );
      const parentUserId = upsert.rows[0]!.id;
      parentsCount += 1;

      let sortOrder = 0;
      for (const st of students) {
        const parts = splitFio(st.name);
        if (!parts) continue;
        await pool.query(
          `INSERT INTO user_parent_children (user_id, last_name, first_name, patronymic, class_label, sort_order, student_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [parentUserId, parts.lastName, parts.firstName, parts.patronymic, st.class_label, sortOrder, st.id]
        );
        sortOrder += 1;
        linkedChildren += 1;
      }
    }

    const keepEmails = [...expectedEmails, ...preservedParentEmails];
    if (keepEmails.length > 0) {
      await pool.query(
        `DELETE FROM users
         WHERE role = 'parent'
           AND email <> ALL($1::text[])`,
        [keepEmails]
      );
    }

    await pool.query("COMMIT");
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  }

  return { families: families.size, parents: parentsCount, linkedChildren };
}
