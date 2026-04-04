"use strict";
/**
 * Полная заливка данных локали → Render: plain pg_dump (--data-only) режется на мелкие COPY-чанки.
 *
 * 1) pg_dump -h … -d dnevnik_local --data-only -F p -f scripts/_full_plain.sql
 * 2) node scripts/strip-pgdump-session.cjs scripts/_full_plain.sql scripts/_full_plain_clean.sql
 * 3) node scripts/sync-full-data-chunked.cjs
 *    node scripts/sync-full-data-chunked.cjs --resume   — не TRUNCATE всего; таблицы с полным
 *    числом строк пропускаются; неполные очищаются и заливаются заново.
 *
 * Переменные: DATABASE_URL, CHUNK_LINES (default 50), PSQL_ATTEMPTS (default 12)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function renderExternalUrl(urlString) {
  try {
    const u = new URL(urlString);
    if (u.hostname && !u.hostname.includes(".") && /^dpg-/i.test(u.hostname)) {
      u.hostname = `${u.hostname}.frankfurt-postgres.render.com`;
    }
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return urlString;
  }
}

const remoteUrl = renderExternalUrl(process.env.DATABASE_URL);
const password = new URL(remoteUrl).password;
const psql = "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const CHUNK = Math.max(25, parseInt(process.env.CHUNK_LINES || "50", 10) || 50);
const ATTEMPTS = parseInt(process.env.PSQL_ATTEMPTS || "12", 10) || 12;
const resume = process.argv.includes("--resume");

const cleanPath = path.join(__dirname, "_full_plain_clean.sql");

/** Все public-таблицы на Render (из pg_tables); очищаем перед полной подстановкой локали. */
const TRUNCATE_SQL = `TRUNCATE TABLE public.academic_years, public.assignments_v2, public.attendance_v2, public.audit_log, public.class_diary_days, public.class_diary_lessons, public.class_roster, public.classes_v2, public.course_sections_v2, public.diary_days, public.diary_lessons, public.director_quarter_schedule, public.finals, public.grade_history_by_subject, public.grade_history_detail, public.grade_history_summary, public.grades_v2, public.parent_link_keys, public.parent_student_links, public.performance_meta, public.performance_rows, public.person_roles, public.persons, public.school_classes, public.schools, public.student_class_enrollments, public.student_section_enrollments, public.students, public.subjects_v2, public.teacher_section_assignments, public.teacher_subjects, public.terms, public.user_parent_children, public.user_person_links, public.user_teacher_classes, public.users, public.weekly_schedule_entries RESTART IDENTITY CASCADE`;

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function parseDump(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  const setvals = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("COPY public.")) {
      const header = line;
      i++;
      const data = [];
      while (i < lines.length && lines[i] !== "\\.") {
        data.push(lines[i]);
        i++;
      }
      if (i >= lines.length) throw new Error("unterminated COPY");
      i++;
      blocks.push({ header, data });
      continue;
    }
    if (line.startsWith("SELECT pg_catalog.setval(")) {
      setvals.push(line);
    }
    i++;
  }
  return { blocks, setvals };
}

function tableFromHeader(header) {
  const m = /^COPY public\.(\w+)/.exec(header);
  return m ? m[1] : "?";
}

/** Меньшие чанки для тяжёлых JSON-таблиц (обрывы SSL на Render). */
function chunkSizeForTable(tbl) {
  const envKey = `CHUNK_${tbl}`;
  if (process.env[envKey]) {
    const n = parseInt(process.env[envKey], 10);
    if (n >= 5 && n <= 500) return n;
  }
  const small = {
    grade_history_detail: 12,
    grade_history_summary: 12,
    grade_history_by_subject: 35,
  };
  return small[tbl] ?? CHUNK;
}

function remoteCount(tbl, env) {
  const r = spawnSync(psql, [remoteUrl, "-t", "-A", "-c", `SELECT count(*)::bigint FROM public.${tbl}`], {
    env,
    encoding: "utf8",
  });
  if (r.status !== 0) return -1;
  const n = parseInt(String(r.stdout).trim(), 10);
  return Number.isFinite(n) ? n : -1;
}

function main() {
  if (!fs.existsSync(cleanPath)) {
    console.error("Нет файла", cleanPath);
    console.error("См. шапку скрипта: pg_dump → strip → этот скрипт.");
    process.exit(1);
  }

  const env = { ...process.env, PGPASSWORD: password };
  if (!resume) {
    console.error("TRUNCATE на Render…");
    const trunc = spawnSync(psql, [remoteUrl, "-v", "ON_ERROR_STOP=1", "-c", TRUNCATE_SQL], {
      env,
      encoding: "utf8",
    });
    if (trunc.status !== 0) {
      console.error(trunc.stderr || trunc.stdout);
      process.exit(1);
    }
  } else {
    console.error("Режим --resume: полный TRUNCATE пропущен.");
  }

  const text = fs.readFileSync(cleanPath, "utf8");
  const { blocks, setvals } = parseDump(text);
  console.error("COPY-блоков:", blocks.length, "setval:", setvals.length, "chunk:", CHUNK);

  const outDir = path.join(__dirname, "_sync_chunks");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  let part = 0;
  for (const { header, data } of blocks) {
    const tbl = tableFromHeader(header);
    const expected = data.length;
    if (resume) {
      const ac = remoteCount(tbl, env);
      if (ac < 0) {
        console.error("\nНе удалось прочитать count для", tbl);
        process.exit(1);
      }
      if (ac === expected) {
        console.error(`skip ${tbl} (${ac} rows)`);
        continue;
      }
      if (ac > expected) {
        console.error(`\n${tbl}: на сервере больше строк (${ac}), чем в дампе (${expected}). Остановка.`);
        process.exit(1);
      }
      if (ac > 0 && ac < expected) {
        console.error(`redo ${tbl}: было ${ac}, нужно ${expected} — TRUNCATE и повтор`);
        const tr = spawnSync(psql, [remoteUrl, "-v", "ON_ERROR_STOP=1", "-c", `TRUNCATE TABLE public.${tbl} RESTART IDENTITY CASCADE`], {
          env,
          encoding: "utf8",
        });
        if (tr.status !== 0) {
          console.error(tr.stderr || tr.stdout);
          process.exit(1);
        }
      }
    }

    const cs = chunkSizeForTable(tbl);
    const chunks = [];
    for (let j = 0; j < data.length; j += cs) {
      chunks.push(data.slice(j, j + cs));
    }
    if (chunks.length === 0) {
      chunks.push([]);
    }
    for (let c = 0; c < chunks.length; c++) {
      const body = [header, ...chunks[c], "\\.", ""].join("\n");
      const file = path.join(outDir, `p_${String(part).padStart(5, "0")}.sql`);
      fs.writeFileSync(file, body, "utf8");
      let ok = false;
      for (let attempt = 1; attempt <= ATTEMPTS && !ok; attempt++) {
        const r = spawnSync(psql, [remoteUrl, "-v", "ON_ERROR_STOP=1", "-f", file], {
          env,
          encoding: "utf8",
          maxBuffer: 50 * 1024 * 1024,
        });
        if (r.status === 0) {
          ok = true;
          process.stdout.write(`\r${tbl} ${c + 1}/${chunks.length}  part ${part + 1}`);
        } else {
          const err = r.stderr || r.stdout || "";
          console.error(`\nfail ${tbl} chunk ${c + 1}/${chunks.length} attempt ${attempt}:`, err);
          let mult = attempt;
          if (/timeout|10060|10053|not known|unreachable|ECONNRESET/i.test(String(err))) {
            mult = attempt * 3;
          }
          sleepSync(1000 * mult);
        }
      }
      if (!ok) {
        console.error("\nОстановка. Проверьте сеть или уменьшите CHUNK_LINES.");
        process.exit(1);
      }
      part++;
    }
  }

  const setvalFile = path.join(outDir, "_setval.sql");
  fs.writeFileSync(setvalFile, setvals.join("\n") + "\n", "utf8");
  const sv = spawnSync(psql, [remoteUrl, "-v", "ON_ERROR_STOP=1", "-f", setvalFile], {
    env,
    encoding: "utf8",
  });
  if (sv.status !== 0) {
    console.error(sv.stderr || sv.stdout);
    process.exit(1);
  }
  console.log("\nГотово: данные локали залиты на Render (все COPY-блоки + setval).");
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
