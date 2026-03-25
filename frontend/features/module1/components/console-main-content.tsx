"use client";

import type { ComponentProps } from "react";

import { AgendaTab } from "@/features/module1/components/agenda-tab";
import { ConsoleContentRouter } from "@/features/module1/components/console-content-router";
import { DoctorsSection } from "@/features/module1/components/doctors-section";
import { EncountersTab } from "@/features/module1/components/encounters-tab";
import { GestionHub } from "@/features/module1/components/gestion-hub";
import { MessagesTab } from "@/features/module1/components/messages-tab";
import { OverviewTab } from "@/features/module1/components/overview-tab";
import { PatientsTab } from "@/features/module1/components/patients-tab";
import { PendingReviewTab } from "@/features/module1/components/pending-review-tab";
import type { ConsoleTab } from "@/features/module1/console-config";

type ConsoleMainContentProps = {
  activeTab: ConsoleTab;
  overviewTabProps: ComponentProps<typeof OverviewTab>;
  agendaTabProps: ComponentProps<typeof AgendaTab>;
  canViewGestion: boolean;
  doctorsSectionProps: ComponentProps<typeof DoctorsSection>;
  encountersTabProps: ComponentProps<typeof EncountersTab>;
  gestionHubProps: ComponentProps<typeof GestionHub>;
  isAdmin: boolean;
  messagesTabProps: ComponentProps<typeof MessagesTab>;
  patientsTabProps: ComponentProps<typeof PatientsTab>;
  pendingReviewTabProps: ComponentProps<typeof PendingReviewTab>;
};

export function ConsoleMainContent({
  activeTab,
  overviewTabProps,
  agendaTabProps,
  canViewGestion,
  doctorsSectionProps,
  encountersTabProps,
  gestionHubProps,
  isAdmin,
  messagesTabProps,
  patientsTabProps,
  pendingReviewTabProps,
}: ConsoleMainContentProps) {
  const renderOverviewTab = () => <OverviewTab {...overviewTabProps} />;
  const renderAgendaTab = () => <AgendaTab {...agendaTabProps} />;

  const renderDoctoresTab = () => {
    if (!isAdmin) {
      return renderAgendaTab();
    }

    return <DoctorsSection {...doctorsSectionProps} />;
  };

  const renderPacientesTab = () => <PatientsTab {...patientsTabProps} />;

  const renderConsultasTab = () => <EncountersTab {...encountersTabProps} />;

  const renderMensajesTab = () => <MessagesTab {...messagesTabProps} />;

  const renderPendientesTab = () => <PendingReviewTab {...pendingReviewTabProps} />;

  const renderGestionTab = () => <GestionHub {...gestionHubProps} />;

  return (
    <ConsoleContentRouter
      activeTab={activeTab}
      overviewContent={renderOverviewTab}
      agendaContent={renderAgendaTab}
      doctorsContent={isAdmin ? renderDoctoresTab : renderAgendaTab}
      encountersContent={renderConsultasTab}
      gestionContent={canViewGestion ? renderGestionTab : renderAgendaTab}
      messagesContent={renderMensajesTab}
      patientsContent={renderPacientesTab}
      pendingContent={renderPendientesTab}
    />
  );
}
