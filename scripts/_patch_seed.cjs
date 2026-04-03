const fs = require("fs");
const p = "src/db/seedSimple.ts";
let t = fs.readFileSync(p, "utf8");
const block = `
const STUDENT_POOL_FILE = "ПУЛ.txt";
const EXPECTED_POOL_SIZE = 778;

function readStudentPoolFromProjectRoot(root: string): string[] {
  const poolPath = path.join(root, STUDENT_POOL_FILE);
  if (!fs.existsSync(poolPath)) {
    throw new Error(\`Файл \${STUDENT_POOL_FILE} не найден в корне проекта (\${poolPath})\`);
  }
  const raw = fs.readFileSync(poolPath, "utf8");
  const names: string[] = [];
  for (const line of raw.split(/\\r?\\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    names.push(s);
  }
  if (names.length !== EXPECTED_POOL_SIZE) {
    throw new Error(
      \`В \${STUDENT_POOL_FILE} ожидается ровно \${EXPECTED_POOL_SIZE} строк ФИО (без комментариев), сейчас \${names.length}\`
    );
  }
  return names;
}

function allocateClassSizes(total: number, nClasses: number, min: number, max: number): number[] {
  if (total < nClasses * min || total > nClasses * max) {
    throw new Error(
      \`Нельзя распределить \${total} учеников по \${nClasses} классам с вилкой \${min}..\${max} на класс\`
    );
  }
  const sizes = Array.from({ length: nClasses }, () => min);
  let rem = total - nClasses * min;
  let idx = 0;
  while (rem > 0) {
    if (sizes[idx]! >= max) {
      idx = (idx + 1) % nClasses;
      continue;
    }
    sizes[idx]! += 1;
    rem -= 1;
    idx = (idx + 1) % nClasses;
  }
  return sizes;
}

function splitStudentFullName(fullName: string): { lastName: string; firstName: string; patronymic: string } {
  const parts = fullName.trim().split(/\\s+/).filter(Boolean);
  if (parts.length !== 3) {
    throw new Error(\`ФИО должно состоять из 3 слов: «\${fullName}»\`);
  }
  return { lastName: parts[0]!, firstName: parts[1]!, patronymic: parts[2]! };
}

function buildStudentsFromPool(classes: SchoolClass[], poolNames: string[]): StudentSeed[] {
  const sizes = allocateClassSizes(poolNames.length, classes.length, 15, 25);
  const students: StudentSeed[] = [];
  let offset = 0;
  for (let ci = 0; ci < classes.length; ci++) {
    const cl = classes[ci]!;
    const size = sizes[ci]!;
    for (let i = 1; i <= size; i++) {
      const fullName = poolNames[offset]!;
      offset += 1;
      const { lastName, firstName, patronymic } = splitStudentFullName(fullName);
      let id = \`stu-\${cl.id.toLowerCase()}-\${i}\`;
      if (cl.id === "3А" && i === 1) id = "stu-3a-1";
      if (cl.id === "6Б" && i === 1) id = "stu-6b-1";
      const isDemoChild = (cl.id === "3А" && i === 1) || (cl.id === "6Б" && i === 1);
      students.push({
        id,
        fullName,
        lastName,
        firstName,
        patronymic,
        classId: cl.id,
        classLabel: cl.label,
        isDemoChild,
      });
    }
  }
  if (offset !== poolNames.length) {
    throw new Error(\`Внутренняя ошибка: использовано \${offset} имён из \${poolNames.length}\`);
  }
  return students;
}

`;
const ins = t.indexOf("const LAST_NAMES");
if (ins < 0) throw new Error("LAST_NAMES");
t = t.slice(0, ins) + block + t.slice(ins);
const startFn = t.indexOf("function buildStudents(classes: SchoolClass[]): StudentSeed[] {");
const endFn = t.indexOf("\nfunction lessonsPerDay", startFn);
if (startFn < 0 || endFn < 0) throw new Error("buildStudents");
t = t.slice(0, startFn) + t.slice(endFn);
t = t.replace(
  "    const classes = buildClasses();\n    const schoolDays = buildSchoolDaysInMarch2026();\n    const students = buildStudents(classes);",
  "    const classes = buildClasses();\n    const schoolDays = buildSchoolDaysInMarch2026();\n    const poolNames = readStudentPoolFromProjectRoot(process.cwd());\n    const students = buildStudentsFromPool(classes, poolNames);"
);
const oldParent = \`    await pool.query(
      \\\`INSERT INTO user_parent_children (user_id, last_name, first_name, patronymic, class_label, sort_order, student_id)
       VALUES 
         ($1, 'Смирнова', 'Дарья', 'Сергеевна', '3А', 0, NULL),
         ($1, 'Смирнов',  'Иван',  'Сергеевич', '6Б', 1, NULL)\\\`,
      [parentId]
    );\`;
const newParent = \`    const demo3a = students.find((s) => s.classId === "3А" && s.isDemoChild);
    const demo6b = students.find((s) => s.classId === "6Б" && s.isDemoChild);
    if (!demo3a || !demo6b) throw new Error("seedSimple: не найдены демо-ученики 3А/6Б");
    await pool.query(
      \\\`INSERT INTO user_parent_children (user_id, last_name, first_name, patronymic, class_label, sort_order, student_id)
       VALUES ($1, $2, $3, $4, $5, 0, NULL), ($1, $6, $7, $8, $9, 1, NULL)\\\`,
      [
        parentId,
        demo3a.lastName,
        demo3a.firstName,
        demo3a.patronymic,
        demo3a.classLabel,
        demo6b.lastName,
        demo6b.firstName,
        demo6b.patronymic,
        demo6b.classLabel,
      ]
    );\`;
if (!t.includes(oldParent)) throw new Error("parent block not found");
t = t.split(oldParent).join(newParent);
t = t.replace(
  '          const adjusted = child.id === "stu-6b-1" ? Math.max(2, baseGrade - 1) : baseGrade;',
  '          const adjusted = child.classId === "6Б" ? Math.max(2, baseGrade - 1) : baseGrade;'
);
fs.writeFileSync(p, t, "utf8");
console.log("OK");
