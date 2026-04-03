import { Router } from "express";
import { requireAuth, requireParent, requireTeacher } from "../middleware/auth";
import * as profile from "../profile/service";
import * as directorRepo from "../db/directorRepository";
import { catchAsync } from "../middleware/catchAsync";
import { getPool } from "../db/pool";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get(
  "/",
  catchAsync(async (req, res) => {
    const uid = req.session!.uid!;
    const role = req.session!.role!;
    const email = req.session!.email ?? "";
    const data = await profile.getProfile(uid, role, email);
    if (!data) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json(data);
  }, { error: "Ошибка сервера" })
);

profileRouter.patch("/phone", requireParent, async (req, res) => {
  try {
    const data = await profile.updateParentPhone(req.session!.uid!, String(req.body?.phone ?? ""));
    res.json(data);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "Пользователь не найден") {
        res.status(404).json({ error: e.message });
        return;
      }
      if (
        e.message.startsWith("Номер") ||
        e.message.startsWith("Допустимы") ||
        e.message === "PARENT_PHONE_UPDATE_FAILED"
      ) {
        res.status(400).json({
          error:
            e.message === "PARENT_PHONE_UPDATE_FAILED"
              ? "Не удалось сохранить телефон"
              : e.message,
        });
        return;
      }
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

profileRouter.post(
  "/children",
  requireParent,
  catchAsync(async (req, res) => {
    const lastName = String(req.body?.lastName ?? "").trim();
    const firstName = String(req.body?.firstName ?? "").trim();
    const patronymic = String(req.body?.patronymic ?? "").trim();
    const classLabel = String(req.body?.classLabel ?? "").trim();
    if (!lastName || !firstName || !classLabel) {
      res.status(400).json({ error: "Укажите фамилию, имя и класс" });
      return;
    }
    const normalizedFullName = `${lastName} ${firstName} ${patronymic}`.trim().replace(/\s+/g, " ");
    const { rows } = await getPool().query<{ id: string }>(
      `SELECT id
       FROM students s
       WHERE (
           s.class_label = $1 AND lower(s.name) = lower($2)
         )
         OR (
           regexp_replace(upper(trim(s.class_label)), E'\\s+', '', 'g')
             = regexp_replace(upper(trim($3)), E'\\s+', '', 'g')
           AND (
             upper(
               regexp_replace(
                 trim(concat_ws(' ', $4, $5, NULLIF(trim($6), ''))),
                 '[[:space:]]+',
                 ' ',
                 'g'
               )
             ) = upper(
               regexp_replace(
                 trim(replace(replace(COALESCE(s.name, ''), chr(160), ' '), chr(8201), ' ')),
                 '[[:space:]]+',
                 ' ',
                 'g'
               )
             )
             OR (
               upper(trim($4))
                 = upper(trim(split_part(replace(replace(COALESCE(s.name, ''), chr(160), ' '), chr(8201), ' '), ' ', 1)))
               AND upper(trim($5))
                 = upper(trim(split_part(replace(replace(COALESCE(s.name, ''), chr(160), ' '), chr(8201), ' '), ' ', 2)))
             )
           )
         )
       LIMIT 1`,
      [classLabel, normalizedFullName, classLabel, lastName, firstName, patronymic]
    );

    const studentId = rows[0]?.id;
    if (!studentId) {
      res.status(404).json({ error: "Ученик не найден" });
      return;
    }

    await directorRepo.linkChildToParent(req.session!.uid!, studentId);
    res.json({
      child: {
        lastName,
        firstName,
        patronymic,
        classLabel,
      },
    });
  }, { error: "Ошибка сервера" })
);

profileRouter.post(
  "/classes",
  requireTeacher,
  catchAsync(async (req, res) => {
    const label = String(req.body?.label ?? "").trim();
    if (!label) {
      res.status(400).json({ error: "Укажите название класса" });
      return;
    }
    let grade: number | null = null;
    const g = req.body?.grade;
    if (g !== undefined && g !== null && g !== "") {
      const n = Number(g);
      if (!Number.isFinite(n)) {
        res.status(400).json({ error: "Некорректный номер параллели" });
        return;
      }
      grade = Math.round(n);
    }
    const row = await profile.addTeacherClass(req.session!.uid!, { label, grade });
    res.json({ class: row });
  }, { error: "Ошибка сервера" })
);
