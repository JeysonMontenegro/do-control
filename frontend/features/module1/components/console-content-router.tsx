"use client";

import type { ConsoleTab } from "@/features/module1/console-config";

type ConsoleContentRouterProps = {
  activeTab: ConsoleTab;
  overviewContent: () => React.ReactNode;
  agendaContent: () => React.ReactNode;
  doctorsContent: () => React.ReactNode;
  encountersContent: () => React.ReactNode;
  examAnalysesContent: () => React.ReactNode;
  gestionContent: () => React.ReactNode;
  messagesContent: () => React.ReactNode;
  patientsContent: () => React.ReactNode;
  pendingContent: () => React.ReactNode;
};

export function ConsoleContentRouter({
  activeTab,
  overviewContent,
  agendaContent,
  doctorsContent,
  encountersContent,
  examAnalysesContent,
  gestionContent,
  messagesContent,
  patientsContent,
  pendingContent,
}: ConsoleContentRouterProps) {
  if (activeTab === "resumen") {
    return <>{overviewContent()}</>;
  }
  if (activeTab === "agenda") {
    return <>{agendaContent()}</>;
  }
  if (activeTab === "doctores") {
    return <>{doctorsContent()}</>;
  }
  if (activeTab === "pacientes") {
    return <>{patientsContent()}</>;
  }
  if (activeTab === "consultas") {
    return <>{encountersContent()}</>;
  }
  if (activeTab === "examenes") {
    return <>{examAnalysesContent()}</>;
  }
  if (activeTab === "mensajes") {
    return <>{messagesContent()}</>;
  }
  if (activeTab === "pendientes") {
    return <>{pendingContent()}</>;
  }
  return <>{gestionContent()}</>;
}
