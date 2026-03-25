"use client";

import type { ConsoleTab } from "@/features/module1/console-config";

type ConsoleSidebarProps = {
  activeTab: ConsoleTab;
  appointmentCount: number;
  patientCount: number;
  reviewCount: number;
  canViewGestion: boolean;
  canViewMessages: boolean;
  canViewReviewQueue: boolean;
  currentRoles: string[];
  isAdmin: boolean;
  logout: () => void;
  onTabChange: (tab: ConsoleTab) => void;
  tabs: Array<{ id: ConsoleTab; label: string }>;
};

export function ConsoleSidebar({
  activeTab,
  appointmentCount,
  patientCount,
  reviewCount,
  canViewGestion,
  canViewMessages,
  canViewReviewQueue,
  currentRoles,
  isAdmin,
  logout,
  onTabChange,
  tabs,
}: ConsoleSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <p className="eyebrow">Do-Control</p>
        <h1>Panel medico</h1>
        <span>Operacion clinica centralizada</span>
      </div>

      <nav className="sidebar-nav">
        {tabs
          .filter((tab) => tab.id !== "doctores" || isAdmin)
          .filter((tab) => tab.id !== "gestion" || canViewGestion)
          .filter((tab) => tab.id !== "mensajes" || canViewMessages)
          .filter((tab) => tab.id !== "pendientes" || canViewReviewQueue)
          .map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`sidebar-link ${activeTab === tab.id ? "sidebar-link-active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              <strong className="sidebar-link-full">{tab.label}</strong>
              <strong className="sidebar-link-compact">{getCompactTabLabel(tab.id)}</strong>
              <span>{getTabSupportText(tab.id)}</span>
            </button>
          ))}
      </nav>

      <div className="sidebar-summary">
        <div className="sidebar-stat">
          <strong>{appointmentCount}</strong>
          <span>Citas activas en tablero</span>
        </div>
        <div className="sidebar-stat">
          <strong>{patientCount}</strong>
          <span>Pacientes visibles</span>
        </div>
        <div className="sidebar-stat">
          <strong>{reviewCount}</strong>
          <span>Casos por seguimiento</span>
        </div>
      </div>

      <div className="sidebar-role-pills">
        {currentRoles.map((role) => (
          <span key={role} className="sidebar-role-pill">
            {role}
          </span>
        ))}
      </div>

      <button type="button" className="secondary-button sidebar-logout" onClick={logout}>
        <span className="sidebar-logout-full">Cerrar sesion</span>
        <span className="sidebar-logout-compact">Salir</span>
      </button>
    </aside>
  );
}

function getTabSupportText(tab: ConsoleTab) {
  switch (tab) {
    case "resumen":
      return "Indicadores y lectura rapida";
    case "agenda":
      return "Calendario, estados y seguimiento";
    case "doctores":
      return "Equipo medico y estructura";
    case "pacientes":
      return "Expedientes y linea clinica";
    case "consultas":
      return "Encuentros y adjuntos";
    case "mensajes":
      return "Despachos y comunicacion";
    case "pendientes":
      return "Revision manual y alertas";
    case "gestion":
      return "Configuracion y operacion";
    default:
      return "";
  }
}

function getCompactTabLabel(tab: ConsoleTab) {
  switch (tab) {
    case "resumen":
      return "Rs";
    case "agenda":
      return "Ag";
    case "doctores":
      return "Dr";
    case "pacientes":
      return "Px";
    case "consultas":
      return "Cx";
    case "mensajes":
      return "Ms";
    case "pendientes":
      return "Pd";
    case "gestion":
      return "Gt";
    default:
      return "--";
  }
}
