"use strict";
const fs = require("fs");
const path = require("path");
const inp = process.argv[2] || path.join(__dirname, "..", "backups", "repair-data-inserts.sql");
const out = process.argv[3] || path.join(__dirname, "..", "backups", "repair-data-clean.sql");
let s = fs.readFileSync(inp, "utf8");
s = s.replace(/^\\restrict[^\n]*\s*/m, "");
s = s.replace(/^\\unrestrict[^\n]*\s*/m, "");
const lines = s.split(/\r?\n/);
const keep = lines.filter(
  (line) =>
    !line.startsWith("SET ") &&
    !line.startsWith("SELECT pg_catalog.set_config") &&
    !line.startsWith("\\unrestrict")
);
fs.writeFileSync(out, keep.join("\n"), "utf8");
console.log("Wrote", out, "lines", keep.length);
