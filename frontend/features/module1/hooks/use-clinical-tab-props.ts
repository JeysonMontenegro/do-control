"use client";

import type { ComponentProps } from "react";

import type { EncountersTab } from "@/features/module1/components/encounters-tab";
import type { MessagesTab } from "@/features/module1/components/messages-tab";
import type { PatientsTab } from "@/features/module1/components/patients-tab";

type UseClinicalTabPropsParams = {
  encountersTabProps: ComponentProps<typeof EncountersTab>;
  messagesTabProps: ComponentProps<typeof MessagesTab>;
  patientsTabProps: ComponentProps<typeof PatientsTab>;
};

export function useClinicalTabProps({
  encountersTabProps,
  messagesTabProps,
  patientsTabProps,
}: UseClinicalTabPropsParams) {
  return {
    encountersTabProps,
    messagesTabProps,
    patientsTabProps,
  };
}
