import type { PatientSummary } from "@/features/module1/types";

export function normalizeComparableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getFirstExamOrderId(summary: PatientSummary | null) {
  return summary?.encounters.flatMap((encounter) => encounter.exam_orders ?? []).find((exam) => exam.id)?.id ?? null;
}
