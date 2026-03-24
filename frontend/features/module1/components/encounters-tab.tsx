"use client";

import type { ComponentProps } from "react";

import { EncountersSection } from "@/features/module1/components/encounters-section";

type EncountersTabProps = ComponentProps<typeof EncountersSection>;

export function EncountersTab(props: EncountersTabProps) {
  return <EncountersSection {...props} />;
}
