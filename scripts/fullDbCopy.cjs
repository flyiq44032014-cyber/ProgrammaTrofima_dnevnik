"use strict";
/**
 * Полная логическая копия public с локальной БД на удалённую (Render и т.д.) без pg_dump.
 * Требует: Node, зависимость `pg`, в корне `.env`:
 *   LOCAL_DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/dnevnik_local
 *   DATABASE_URL или REMOTE_DATABASE_URL — целевая БД.
 * Внутренний хост Render (dpg-…-a без домена) заменяется на *.frankfurt-postgres.render.com
 * (override: RENDER_PG_REGION=oregon и т.д.).
 *
 * Запуск: node scripts/fullDbCopy.cjs
 * Опции: --no-init-schema — не выполнять SQL из src/db/*.sql перед копированием.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const SCHEMA_FILES = [
  path.join(__dirname, "..", "src", "db", "schema.sql"),
  path.join(__dirname, "..", "src", "db", "schema_teacher.sql"),
  path.join(__dirname, "..", "src", "db", "schema_v2.sql"),
];

function renderExternalUrl(urlString) {
  try {
    const u = new URL(urlString);
    const h = u.hostname;
    if (h && !h.includes(".") && /^dpg-/i.test(h)) {
      const region = process.env.RENDER_PG_REGION || "frankfurt";
      u.hostname = `${h}.${region}-postgres.render.com`;
    }
    return u.toString();
  } catch {
    return urlString;
  }
}

/** Как в pool.ts: для не-localhost включаем TLS (Render требует, иначе ECONNRESET / SSL required). */
function pgClientConfig(connectionString) {
  let useSsl = true;
  try {
    const h = new URL(connectionString).hostname.toLowerCase();
    useSsl = h !== "localhost" && h !== "127.0.0.1";
  } catch {
    useSsl = true;
  }
  return {
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    keepAlive: true,
    connectionTimeoutMillis: 120_000,
  };
}

function splitSqlStatements(sql) {
  const out = [];
  let cur = "";
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      cur += ch;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      cur += ch;
      continue;
    }
    if (!inSingle && !inDouble && ch === ";" && sql[i + 1] === "\n") {
      let t = cur.trim();
      /* убрать ведущие однострочные комментарии — иначе блок «-- шапка + CREATE» ошибочно отбрасывался */
      while (t.length) {
        const low = t.toLowerCase();
        if (low.startsWith("--")) {
          const nl = t.indexOf("\n");
          t = (nl === -1 ? "" : t.slice(nl + 1)).trim();
          continue;
        }
        break;
      }
      if (t.length) out.push(t);
      cur = "";
      i++;
      continue;
    }
    cur += ch;
  }
  let tail = cur.trim();
  while (tail.length && tail.toLowerCase().startsWith("--")) {
    const nl = tail.indexOf("\n");
    tail = (nl === -1 ? "" : tail.slice(nl + 1)).trim();
  }
  if (tail.length) out.push(tail);
  return out;
}

/** Каждый фрагмент — новое соединение: на Render длинные DDL-сессии часто рвутся (ECONNRESET). */
async function runSqlFile(remoteUrl, filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn("Пропуск (нет файла):", filePath);
    return;
  }
  const sql = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const parts = splitSqlStatements(sql);
  for (const p of parts) {
    const c = new Client(pgClientConfig(remoteUrl));
    c.on("error", (e) => console.error("[schema stmt idle]", e.message));
    await c.connect();
    try {
      await c.query("SET statement_timeout = 0");
      await c.query(p);
    } catch (e) {
      console.error("Ошибка в фрагменте из", path.basename(filePath), p.slice(0, 80) + "…");
      throw e;
    } finally {
      await c.end().catch(() => {});
    }
  }
  console.log("Применён:", path.basename(filePath));
}

async function listPublicTables(client) {
  const { rows } = await client.query(`
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);
  return rows.map((r) => r.name);
}

async function tableColumns(client, tableName) {
  const { rows } = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `,
    [tableName]
  );
  return rows.map((r) => r.column_name);
}

/** Порядок вставки: родительские таблицы раньше (managed Postgres не даёт session_replication_role). */
async function tablesInsertOrder(client, tables) {
  const { rows } = await client.query(`
    SELECT
      kcu.table_name AS child,
      ccu.table_name AS parent
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu
      ON rc.constraint_name = kcu.constraint_name
      AND rc.constraint_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
      AND rc.unique_constraint_schema = ccu.table_schema
    WHERE kcu.table_schema = 'public'
  `);
  const set = new Set(tables);
  const childrenOf = new Map();
  const indegree = new Map();
  for (const t of tables) indegree.set(t, 0);
  for (const { child, parent } of rows) {
    if (!set.has(child) || !set.has(parent) || child === parent) continue;
    indegree.set(child, indegree.get(child) + 1);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent).push(child);
  }
  const q = tables.filter((t) => indegree.get(t) === 0);
  const out = [];
  while (q.length) {
    const t = q.shift();
    out.push(t);
    for (const c of childrenOf.get(t) || []) {
      indegree.set(c, indegree.get(c) - 1);
      if (indegree.get(c) === 0) q.push(c);
    }
  }
  if (out.length !== tables.length) {
    const bad = tables.filter((t) => !out.includes(t));
    throw new Error("Не удалось упорядочить таблицы по FK (цикл?). Проверьте: " + bad.join(", "));
  }
  return out;
}

async function main() {
  const noInit = process.argv.includes("--no-init-schema");
  const localUrl = process.env.LOCAL_DATABASE_URL;
  let remoteUrl = process.env.REMOTE_DATABASE_URL || process.env.DATABASE_URL;
  if (!localUrl) {
    console.error(
      "Добавьте в .env строку LOCAL_DATABASE_URL=postgresql://USER:ПАРОЛЬ@127.0.0.1:5432/dnevnik_local"
    );
    process.exit(1);
  }
  if (!remoteUrl) {
    console.error("Нужен DATABASE_URL или REMOTE_DATABASE_URL (целевая БД).");
    process.exit(1);
  }
  remoteUrl = renderExternalUrl(remoteUrl);

  const src = new Client(pgClientConfig(localUrl));
  await src.connect();
  console.log("Источник (локально): ok");
  console.log("Назначение (хостинг): проверка…");
  {
    const ping = new Client(pgClientConfig(remoteUrl));
    await ping.connect();
    await ping.query("SELECT 1");
    await ping.end();
  }
  console.log("Назначение (хостинг): ok");

  let dest = new Client(pgClientConfig(remoteUrl));
  await dest.connect();
  dest.on("error", (err) => console.error("[dest idle error]", err.message));

  try {
    if (!noInit) {
      await dest.end().catch(() => {});
      dest = null;
      for (const f of SCHEMA_FILES) {
        await runSqlFile(remoteUrl, f);
      }
      dest = new Client(pgClientConfig(remoteUrl));
      await dest.connect();
      dest.on("error", (err) => console.error("[dest idle error]", err.message));
      await dest.query("SET statement_timeout = 0");
      try {
        await dest.query("SET idle_in_transaction_session_timeout = '30min'");
      } catch {
        /* старый Postgres */
      }
    } else {
      await dest.query("SET statement_timeout = 0");
      try {
        await dest.query("SET idle_in_transaction_session_timeout = '30min'");
      } catch {
        /* старый Postgres */
      }
    }

    const srcTables = await listPublicTables(src);
    const destTables = await listPublicTables(dest);
    const destSet = new Set(destTables);
    const missing = srcTables.filter((t) => !destSet.has(t));
    if (missing.length) {
      throw new Error(
        "На целевой БД нет таблиц, которые есть локально: " +
          missing.join(", ") +
          ". Запустите без --no-init-schema или примените схему вручную."
      );
    }

    const quoted = srcTables.map((t) => `"${t.replace(/"/g, '""')}"`).join(", ");
    await dest.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
    console.log("TRUNCATE всех public-таблиц на назначении выполнен.");
    await dest.end().catch(() => {});
    dest = null;

    const insertOrder = await tablesInsertOrder(src, srcTables);

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    async function queryWithTimeout(client, text, params, ms) {
      let to;
      const timeout = new Promise((_, rej) => {
        to = setTimeout(() => rej(Object.assign(new Error("query timeout"), { code: "TIMEOUT" })), ms);
      });
      try {
        return await Promise.race([client.query(text, params), timeout]);
      } finally {
        clearTimeout(to);
      }
    }

    for (let ti = 0; ti < insertOrder.length; ti++) {
      const table = insertOrder[ti];
      console.log(`Таблица ${table} (${ti + 1}/${insertOrder.length})…`);
      if (ti > 0) await delay(500);

      let ins = new Client(pgClientConfig(remoteUrl));
      ins.on("error", (e) => console.error("[insert idle]", table, e.message));
      await ins.connect();
      await ins.query("SET statement_timeout = 0");
      try {
        const sc = await tableColumns(src, table);
        const dc = new Set(await tableColumns(ins, table));
        const cols = sc.filter((c) => dc.has(c));
        if (!cols.length) continue;

        const tq = `"${table.replace(/"/g, '""')}"`;
        const colList = cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");
        const { rows } = await src.query(`SELECT ${colList} FROM ${tq}`);
        if (rows.length === 0) {
          console.log(`— ${table}: 0 строк`);
          continue;
        }

        /* По одной строке: на Render многострочные INSERT часто рвут соединение (особенно users + длинные hash). */
        const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(", ");
        const insertOne = `INSERT INTO ${tq} (${colList}) VALUES (${placeholders})`;
        const perRowMs = 90_000;
        for (let i = 0; i < rows.length; i++) {
          await delay(50);
          const row = rows[i];
          const params = cols.map((c) => (row[c] === undefined ? null : row[c]));
          let ok = false;
          for (let attempt = 1; attempt <= 5 && !ok; attempt++) {
            try {
              await queryWithTimeout(ins, insertOne, params, perRowMs);
              ok = true;
            } catch (err) {
              if (err.code === "23505") {
                ok = true;
                break;
              }
              const transient =
                err.code === "ECONNRESET" ||
                err.code === "TIMEOUT" ||
                String(err.message || "").includes("terminated unexpectedly") ||
                String(err.message || "").includes("ECONNRESET");
              if (!transient || attempt === 5) throw err;
              console.warn(`Повтор ${attempt} (${table}), строка ${i + 1}/${rows.length}…`);
              await ins.end().catch(() => {});
              await delay(900 * attempt);
              ins = new Client(pgClientConfig(remoteUrl));
              ins.on("error", (e) => console.error("[insert idle]", table, e.message));
              await ins.connect();
              await ins.query("SET statement_timeout = 0");
            }
          }
        }
        console.log(`+ ${table}: ${rows.length} строк`);
      } finally {
        await ins.end().catch(() => {});
      }
    }

    console.log("Готово: данные перенесены.");
  } finally {
    await src.end().catch(() => {});
    if (dest) await dest.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
