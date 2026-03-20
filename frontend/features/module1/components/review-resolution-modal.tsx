"use client";

import { formatDateTime, reviewReasonLabel } from "@/features/module1/console-utils";
import type { Appointment, AppointmentReviewItem, Doctor, Patient } from "@/features/module1/types";

type ReviewResolutionAction = "reject" | "link_existing" | "create_appointment";
type ReviewResolutionForm = {
  action: ReviewResolutionAction;
  patient_id: string;
  doctor_id: string;
  appointment_id: string;
  note: string;
};

type ReviewResolutionModalProps = {
  activeReviewItem: AppointmentReviewItem | null;
  allAppointments: Appointment[];
  allPatients: Patient[];
  availableDoctors: Doctor[];
  closeReviewResolutionModal: () => void;
  reviewAppointmentOptions: Appointment[];
  reviewPatientOptions: Patient[];
  reviewResolutionForm: ReviewResolutionForm;
  setReviewResolutionForm: React.Dispatch<React.SetStateAction<ReviewResolutionForm>>;
  submitReviewResolution: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function ReviewResolutionModal({
  activeReviewItem,
  allAppointments,
  allPatients,
  availableDoctors,
  closeReviewResolutionModal,
  reviewAppointmentOptions,
  reviewPatientOptions,
  reviewResolutionForm,
  setReviewResolutionForm,
  submitReviewResolution,
}: ReviewResolutionModalProps) {
  if (!activeReviewItem) {
    return null;
  }

  const actionLabel =
    reviewResolutionForm.action === "create_appointment"
      ? "Crear cita"
      : reviewResolutionForm.action === "link_existing"
        ? "Vincular cita"
        : "Rechazar pendiente";

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h2>{actionLabel}</h2>
          </div>
          <button type="button" className="secondary-button" onClick={closeReviewResolutionModal}>
            Cerrar
          </button>
        </div>
        <div className="detail-panel compact-panel">
          <strong>{activeReviewItem.patient_name}</strong>
          <span>{activeReviewItem.doctor_name ?? activeReviewItem.doctor_phone_number ?? "Doctor pendiente"}</span>
          <span>{formatDateTime(activeReviewItem.scheduled_start)}</span>
          <span>{reviewReasonLabel(activeReviewItem.review_reason)}</span>
          <span>{activeReviewItem.review_message}</span>
        </div>
        <form className="form-card compact-form" onSubmit={submitReviewResolution}>
          <label>
            <span>Acción</span>
            <select
              value={reviewResolutionForm.action}
              onChange={(event) =>
                setReviewResolutionForm((current) => ({
                  ...current,
                  action: event.target.value as ReviewResolutionAction,
                }))
              }
            >
              <option value="create_appointment">Crear cita</option>
              <option value="link_existing">Vincular cita existente</option>
              <option value="reject">Rechazar</option>
            </select>
          </label>

          {reviewResolutionForm.action === "create_appointment" ? (
            <>
              <label>
                <span>Paciente</span>
                <select
                  value={reviewResolutionForm.patient_id}
                  onChange={(event) =>
                    setReviewResolutionForm((current) => ({ ...current, patient_id: event.target.value }))
                  }
                  required
                >
                  <option value="">Seleccionar paciente</option>
                  {reviewPatientOptions.map((patient) => (
                    <option key={`review-patient-${patient.id}`} value={patient.id}>
                      {patient.first_name} {patient.last_name} · {patient.medical_record_number}
                    </option>
                  ))}
                  {!reviewPatientOptions.length
                    ? allPatients.map((patient) => (
                        <option key={`review-patient-fallback-${patient.id}`} value={patient.id}>
                          {patient.first_name} {patient.last_name} · {patient.medical_record_number}
                        </option>
                      ))
                    : null}
                </select>
              </label>
              {activeReviewItem.doctor_id === null ? (
                <label>
                  <span>Doctor</span>
                  <select
                    value={reviewResolutionForm.doctor_id}
                    onChange={(event) =>
                      setReviewResolutionForm((current) => ({ ...current, doctor_id: event.target.value }))
                    }
                    required
                  >
                    <option value="">Seleccionar doctor</option>
                    {availableDoctors.map((doctor) => (
                      <option key={`review-doctor-${doctor.id}`} value={doctor.id}>
                        {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  <span>Doctor resuelto</span>
                  <input value={activeReviewItem.doctor_name ?? `Doctor ${activeReviewItem.doctor_id}`} readOnly />
                </label>
              )}
            </>
          ) : null}

          {reviewResolutionForm.action === "link_existing" ? (
            <label>
              <span>Cita existente</span>
              <select
                value={reviewResolutionForm.appointment_id}
                onChange={(event) =>
                  setReviewResolutionForm((current) => ({ ...current, appointment_id: event.target.value }))
                }
                required
              >
                <option value="">Seleccionar cita</option>
                {reviewAppointmentOptions.map((appointment) => (
                  <option key={`review-appointment-${appointment.id}`} value={appointment.id}>
                    {(appointment.patient_name ?? `Paciente ${appointment.patient_id}`)} · {formatDateTime(appointment.scheduled_start)}
                  </option>
                ))}
                {!reviewAppointmentOptions.length
                  ? allAppointments.map((appointment) => (
                      <option key={`review-appointment-fallback-${appointment.id}`} value={appointment.id}>
                        {(appointment.patient_name ?? `Paciente ${appointment.patient_id}`)} · {formatDateTime(appointment.scheduled_start)}
                      </option>
                    ))
                  : null}
              </select>
            </label>
          ) : null}

          <label>
            <span>Nota operativa</span>
            <textarea
              value={reviewResolutionForm.note}
              onChange={(event) => setReviewResolutionForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Deja aquí el motivo o la resolución."
            />
          </label>
          <div className="row-actions">
            <button type="button" className="secondary-button" onClick={closeReviewResolutionModal}>
              Cancelar
            </button>
            <button type="submit">Guardar resolución</button>
          </div>
        </form>
      </div>
    </div>
  );
}
