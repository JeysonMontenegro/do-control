"use client";

import type { ConsoleTab } from "@/features/module1/console-config";

type ConsoleContentRouterProps = {
  activeTab: ConsoleTab;
  agendaContent: () => React.ReactNode;
  doctorsContent: () => React.ReactNode;
  encountersContent: () => React.ReactNode;
  gestionContent: () => React.ReactNode;
  messagesContent: () => React.ReactNode;
  patientsContent: () => React.ReactNode;
  pendingContent: () => React.ReactNode;
};

export function ConsoleContentRouter({
  activeTab,
  agendaContent,
  doctorsContent,
  encountersContent,
  gestionContent,
  messagesContent,
  patientsContent,
  pendingContent,
}: ConsoleContentRouterProps) {
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
  if (activeTab === "mensajes") {
    return <>{messagesContent()}</>;
  }
  if (activeTab === "pendientes") {
    return <>{pendingContent()}</>;
  }
  return <>{gestionContent()}</>;
}
