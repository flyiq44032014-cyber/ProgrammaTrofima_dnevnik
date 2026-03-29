import type { DiaryLesson } from "../types";

export function rowToLesson(r: Record<string, unknown>): DiaryLesson {
  const blocksRaw = r.blocks_json;
  let blocks: DiaryLesson["blocks"];
  if (Array.isArray(blocksRaw)) {
    blocks = blocksRaw as DiaryLesson["blocks"];
  }
  const lesson: DiaryLesson = {
    id: String(r.lesson_key),
    order: Number(r.lesson_order),
    title: String(r.title),
    timeLabel: String(r.time_label),
    grade:
      r.grade === null || r.grade === undefined
        ? null
        : Number(r.grade as string | number),
  };
  if (r.teacher) lesson.teacher = String(r.teacher);
  if (r.topic) lesson.topic = String(r.topic);
  if (r.homework) lesson.homework = String(r.homework);
  if (r.control_work) lesson.controlWork = String(r.control_work);
  if (r.place) lesson.place = String(r.place);
  if (r.homework_next) lesson.homeworkNext = String(r.homework_next);
  if (blocks) lesson.blocks = blocks;
  return lesson;
}
