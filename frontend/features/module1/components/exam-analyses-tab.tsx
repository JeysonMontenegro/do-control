"use client";

import type { ComponentProps } from "react";

import { ExamAnalysesSection } from "@/features/module1/components/exam-analyses-section";

type ExamAnalysesTabProps = ComponentProps<typeof ExamAnalysesSection>;

export function ExamAnalysesTab(props: ExamAnalysesTabProps) {
  return <ExamAnalysesSection {...props} />;
}
