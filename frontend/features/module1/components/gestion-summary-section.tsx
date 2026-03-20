"use client";

import { PhoneField } from "@/features/module1/components/form-fields";
import { formatDateTime } from "@/features/module1/console-utils";
import type { Appointment } from "@/features/module1/types";

type ProfileFormState = {
  first_name: string;
  last_name: string;
  display_name: string;
  gender: string;
  phone_number: string;
  current_password: string;
  new_password: string;
  confirm_new_password: string;
};

type GestionSummarySectionProps = {
  activeDoctorsCount: number;
  activeReceptionistsCount: number;
  allowMultiDoctorVisibility: boolean;
  cancelledUpcomingCount: number;
  confirmedUpcomingCount: number;
  currentUserDisplay: string;
  currentUserEmail: string;
  currentUserProfilePhotoUrl: string | null;
  inactiveUsersCount: number;
  isAdmin: boolean;
  onGoToAgendaAppointment: (appointmentId: number) => void;
  onProfilePhotoChange: (file: File | null) => void;
  profileForm: ProfileFormState;
  remindersScheduledCount: number;
  scopedUpcomingAppointments: Appointment[];
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileFormState>>;
  toggleMultiDoctorVisibility: (enabled: boolean) => void;
  unconfirmedUpcomingCount: number;
  updateCurrentProfile: (event: React.FormEvent<HTMLFormElement>) => void;
  uploadCurrentProfilePhoto: () => void;
};

export function GestionSummarySection({
  activeDoctorsCount,
  activeReceptionistsCount,
  allowMultiDoctorVisibility,
  cancelledUpcomingCount,
  confirmedUpcomingCount,
  currentUserDisplay,
  currentUserEmail,
  currentUserProfilePhotoUrl,
  inactiveUsersCount,
  isAdmin,
  onGoToAgendaAppointment,
  onProfilePhotoChange,
  profileForm,
  remindersScheduledCount,
  scopedUpcomingAppointments,
  setProfileForm,
  toggleMultiDoctorVisibility,
  unconfirmedUpcomingCount,
  updateCurrentProfile,
  uploadCurrentProfilePhoto,
}: GestionSummarySectionProps) {
  return (
    <>
      <article className={`card section-card ${isAdmin ? "" : "span-three"}`}>
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Perfil</p>
            <h2>Mi perfil</h2>
          </div>
        </div>
        <form className="form-card compact-form" onSubmit={updateCurrentProfile}>
          <div className="profile-card-layout">
            <div className="profile-photo-panel">
              {currentUserProfilePhotoUrl ? (
                <img className="profile-photo-preview" src={currentUserProfilePhotoUrl} alt={currentUserDisplay} />
              ) : (
                <div className="profile-photo-placeholder">{currentUserDisplay.slice(0, 1).toUpperCase()}</div>
              )}
              <label>
                <span>Foto de perfil</span>
                <input type="file" accept="image/*" onChange={(event) => onProfilePhotoChange(event.target.files?.[0] ?? null)} />
              </label>
              <button type="button" className="success-button" onClick={uploadCurrentProfilePhoto}>
                Subir foto
              </button>
            </div>
            <div className="two-column-grid">
              <label>
                <span>Nombres</span>
                <input value={profileForm.first_name} onChange={(event) => setProfileForm((current) => ({ ...current, first_name: event.target.value }))} />
              </label>
              <label>
                <span>Apellidos</span>
                <input value={profileForm.last_name} onChange={(event) => setProfileForm((current) => ({ ...current, last_name: event.target.value }))} />
              </label>
              <label>
                <span>Nombre visible</span>
                <input
                  value={profileForm.display_name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, display_name: event.target.value }))}
                  placeholder="Cómo deseas aparecer"
                />
              </label>
              <label>
                <span>Género</span>
                <select value={profileForm.gender} onChange={(event) => setProfileForm((current) => ({ ...current, gender: event.target.value }))}>
                  <option value="">No especificado</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label>
                <span>Correo</span>
                <input value={currentUserEmail} readOnly />
              </label>
              <PhoneField
                label="Teléfono"
                value={profileForm.phone_number}
                onChange={(nextValue) => setProfileForm((current) => ({ ...current, phone_number: nextValue }))}
                placeholder="58420737"
              />
              <label>
                <span>Contraseña actual</span>
                <input
                  type="password"
                  value={profileForm.current_password}
                  onChange={(event) => setProfileForm((current) => ({ ...current, current_password: event.target.value }))}
                />
              </label>
              <label>
                <span>Nueva contraseña</span>
                <input
                  type="password"
                  value={profileForm.new_password}
                  onChange={(event) => setProfileForm((current) => ({ ...current, new_password: event.target.value }))}
                />
              </label>
              <label>
                <span>Confirmar nueva contraseña</span>
                <input
                  type="password"
                  value={profileForm.confirm_new_password}
                  onChange={(event) => setProfileForm((current) => ({ ...current, confirm_new_password: event.target.value }))}
                />
              </label>
            </div>
          </div>
          <p className="empty-state">
            El teléfono debe ser único entre usuarios. Si cambias contraseña, debes indicar la actual.
          </p>
          <div className="row-actions">
            <button type="submit">Guardar perfil</button>
          </div>
        </form>
      </article>

      {isAdmin ? (
        <article className="card section-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Administración</p>
              <h2>Resumen del equipo</h2>
            </div>
          </div>
          <div className="summary-grid">
            <div className="metric-card">
              <strong>{activeDoctorsCount}</strong>
              <span>Doctores activos</span>
            </div>
            <div className="metric-card">
              <strong>{activeReceptionistsCount}</strong>
              <span>Recepcionistas activas</span>
            </div>
            <div className="metric-card">
              <strong>{inactiveUsersCount}</strong>
              <span>Usuarios inactivos</span>
            </div>
          </div>
        </article>
      ) : null}

      {isAdmin ? (
        <article className="card section-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Administración</p>
              <h2>Visibilidad de doctores</h2>
            </div>
          </div>
          <div className="detail-panel compact-panel">
            <strong>{allowMultiDoctorVisibility ? "Visibilidad habilitada" : "Visibilidad restringida"}</strong>
            <span>
              {allowMultiDoctorVisibility
                ? "Recepción puede ver y elegir entre varios doctores asignados."
                : "Recepción no verá nombres de varios doctores; deberá contactar a administración."}
            </span>
          </div>
          <div className="row-actions">
            <button
              type="button"
              className="success-button"
              onClick={() => toggleMultiDoctorVisibility(true)}
              disabled={allowMultiDoctorVisibility}
            >
              Habilitar visibilidad
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => toggleMultiDoctorVisibility(false)}
              disabled={!allowMultiDoctorVisibility}
            >
              Ocultar nombres
            </button>
          </div>
        </article>
      ) : null}

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Resumen</p>
            <h2>Seguimiento de recordatorios</h2>
          </div>
        </div>
        <div className="summary-grid">
          <div className="metric-card" title="Citas futuras con reglas activas de recordatorio.">
            <strong>{remindersScheduledCount}</strong>
            <span>Recordatorios por enviar</span>
          </div>
          <div className="metric-card" title="Citas futuras que ya quedaron confirmadas.">
            <strong>{confirmedUpcomingCount}</strong>
            <span>Confirmadas</span>
          </div>
          <div className="metric-card" title="Citas futuras que aún están pendientes de respuesta.">
            <strong>{unconfirmedUpcomingCount}</strong>
            <span>Sin confirmar</span>
          </div>
          <div className="metric-card" title="Citas futuras canceladas que siguen en agenda histórica.">
            <strong>{cancelledUpcomingCount}</strong>
            <span>Canceladas</span>
          </div>
        </div>
        <div className="table-list">
          {scopedUpcomingAppointments.slice(0, 6).map((appointment) => (
            <button
              type="button"
              className="simple-list-item"
              key={`gestion-upcoming-${appointment.id}`}
              onClick={() => onGoToAgendaAppointment(appointment.id)}
            >
              <strong>{appointment.patient_name ?? `Paciente ${appointment.patient_id}`}</strong>
              <span>{formatDateTime(appointment.scheduled_start)}</span>
              <span>{appointment.doctor_name ?? `Doctor ${appointment.doctor_id}`}</span>
            </button>
          ))}
          {!scopedUpcomingAppointments.length ? <p className="empty-state">No hay citas futuras para este contexto.</p> : null}
        </div>
      </article>
    </>
  );
}
