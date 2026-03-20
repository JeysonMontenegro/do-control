"use client";

import type { CommunicationDispatch } from "@/features/module1/types";
import { dispatchStatusLabel } from "@/features/module1/console-utils";

type DispatchStatusForm = {
  status: "sent" | "delivered" | "failed";
  error_message: string;
};

type DispatchStatusModalProps = {
  activeDispatch: CommunicationDispatch | null;
  closeDispatchStatusModal: () => void;
  dispatchStatusForm: DispatchStatusForm;
  setDispatchStatusForm: React.Dispatch<React.SetStateAction<DispatchStatusForm>>;
  submitDispatchStatusUpdate: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function DispatchStatusModal({
  activeDispatch,
  closeDispatchStatusModal,
  dispatchStatusForm,
  setDispatchStatusForm,
  submitDispatchStatusUpdate,
}: DispatchStatusModalProps) {
  if (!activeDispatch) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Mensajes</p>
            <h2>Actualizar estado del mensaje</h2>
          </div>
          <button type="button" className="secondary-button" onClick={closeDispatchStatusModal}>
            Cerrar
          </button>
        </div>
        <div className="detail-panel compact-panel">
          <strong>{activeDispatch.patient_name ?? `Paciente ${activeDispatch.patient_id}`}</strong>
          <span>{activeDispatch.doctor_name ?? "Sin doctor"}</span>
          <span>{dispatchStatusLabel(activeDispatch.status)} actual</span>
          <span>{activeDispatch.recipient_phone}</span>
          <div className="message-preview">{activeDispatch.rendered_message ?? "Sin texto generado."}</div>
        </div>
        <form className="form-card compact-form" onSubmit={submitDispatchStatusUpdate}>
          <label>
            <span>Nuevo estado</span>
            <select
              value={dispatchStatusForm.status}
              onChange={(event) =>
                setDispatchStatusForm((current) => ({
                  ...current,
                  status: event.target.value as "sent" | "delivered" | "failed",
                }))
              }
            >
              <option value="sent">Enviado</option>
              <option value="delivered">Entregado</option>
              <option value="failed">Fallido</option>
            </select>
          </label>
          {dispatchStatusForm.status === "failed" ? (
            <label>
              <span>Motivo del fallo</span>
              <textarea
                value={dispatchStatusForm.error_message}
                onChange={(event) =>
                  setDispatchStatusForm((current) => ({ ...current, error_message: event.target.value }))
                }
                placeholder="Describe por qué falló el envío."
              />
            </label>
          ) : null}
          <div className="row-actions">
            <button type="button" className="secondary-button" onClick={closeDispatchStatusModal}>
              Cancelar
            </button>
            <button type="submit">Guardar estado</button>
          </div>
        </form>
      </div>
    </div>
  );
}
