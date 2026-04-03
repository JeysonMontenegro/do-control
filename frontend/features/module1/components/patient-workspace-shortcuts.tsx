"use client";

type PatientWorkspaceShortcutsProps = {
  appointmentsCount: number;
  examStudiesCount: number;
  encountersCount: number;
  messagesCount: number;
  onGoToAgenda: () => void;
  onGoToEncounters: () => void;
  onGoToExamAnalyses: () => void;
  onGoToMessages: () => void;
};

export function PatientWorkspaceShortcuts({
  appointmentsCount,
  examStudiesCount,
  encountersCount,
  messagesCount,
  onGoToAgenda,
  onGoToEncounters,
  onGoToExamAnalyses,
  onGoToMessages,
}: PatientWorkspaceShortcutsProps) {
  return (
    <div className="patient-workspace-shortcuts">
      <button type="button" className="secondary-button" onClick={onGoToAgenda}>
        Agenda
        <span>{appointmentsCount} cita{appointmentsCount === 1 ? "" : "s"}</span>
      </button>
      <button type="button" className="secondary-button" onClick={onGoToEncounters}>
        Consultas
        <span>{encountersCount} registro{encountersCount === 1 ? "" : "s"}</span>
      </button>
      <button type="button" className="secondary-button" onClick={onGoToExamAnalyses}>
        Examenes IA
        <span>{examStudiesCount} estudio{examStudiesCount === 1 ? "" : "s"}</span>
      </button>
      <button type="button" className="secondary-button" onClick={onGoToMessages}>
        Mensajes
        <span>{messagesCount} comunicacion{messagesCount === 1 ? "" : "es"}</span>
      </button>
    </div>
  );
}
