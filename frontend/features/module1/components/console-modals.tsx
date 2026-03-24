"use client";

import type { ComponentProps } from "react";

import { DispatchStatusModal } from "@/features/module1/components/dispatch-status-modal";
import { PatientActionModal } from "@/features/module1/components/patient-action-modal";
import { ReceptionistModal } from "@/features/module1/components/receptionist-modal";
import { ReviewResolutionModal } from "@/features/module1/components/review-resolution-modal";

type ConsoleModalsProps = {
  dispatchStatusModalProps: ComponentProps<typeof DispatchStatusModal>;
  patientActionModalProps: ComponentProps<typeof PatientActionModal>;
  receptionistModalProps: ComponentProps<typeof ReceptionistModal>;
  reviewResolutionModalProps: ComponentProps<typeof ReviewResolutionModal>;
};

export function ConsoleModals({
  dispatchStatusModalProps,
  patientActionModalProps,
  receptionistModalProps,
  reviewResolutionModalProps,
}: ConsoleModalsProps) {
  return (
    <>
      <PatientActionModal {...patientActionModalProps} />
      <ReviewResolutionModal {...reviewResolutionModalProps} />
      <DispatchStatusModal {...dispatchStatusModalProps} />
      <ReceptionistModal {...receptionistModalProps} />
    </>
  );
}
