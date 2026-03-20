"use client";

import { CONFIRMATION_TEMPLATE_KEY } from "@/features/module1/console-config";
import { reminderLeadTimeLabel } from "@/features/module1/console-utils";
import type { Doctor, ReminderRule } from "@/features/module1/types";

type ReminderRuleFormState = {
  doctor_id: string;
  channel: string;
  trigger_type: string;
  minutes_before: string;
  template_key: string;
  is_active: boolean;
};

type GestionRemindersSectionProps = {
  activateDefault24HourReminder: () => void;
  availableDoctors: Doctor[];
  doctorNameById: Map<number, string>;
  generalReminderRule: ReminderRule | null;
  isAdmin: boolean;
  reminderRuleForm: ReminderRuleFormState;
  reminderRules: ReminderRule[];
  scopedDoctorId: number | null;
  scopedUpcomingAppointmentsCount: number;
  selectedDoctor: Doctor | null;
  setReminderRuleForm: React.Dispatch<React.SetStateAction<ReminderRuleFormState>>;
  submitReminderRule: (event: React.FormEvent<HTMLFormElement>) => void;
  toggleReminderRule: (rule: ReminderRule) => void;
};

export function GestionRemindersSection({
  activateDefault24HourReminder,
  availableDoctors,
  doctorNameById,
  generalReminderRule,
  isAdmin,
  reminderRuleForm,
  reminderRules,
  scopedDoctorId,
  scopedUpcomingAppointmentsCount,
  selectedDoctor,
  setReminderRuleForm,
  submitReminderRule,
  toggleReminderRule,
}: GestionRemindersSectionProps) {
  const scopedReminderRules = reminderRules.filter(
    (rule) => scopedDoctorId === null || rule.doctor_id === null || rule.doctor_id === scopedDoctorId,
  );

  return (
    <>
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Recordatorios</p>
            <h2>Regla base de la clinica</h2>
          </div>
          {isAdmin ? (
            <button type="button" className="success-button" onClick={activateDefault24HourReminder}>
              Activar regla general 24 horas
            </button>
          ) : null}
        </div>
        <div className="summary-grid">
          <div className="metric-card">
            <small>Regla general</small>
            <strong>{generalReminderRule?.is_active ? "Activa" : "Pendiente"}</strong>
            <span>{generalReminderRule ? reminderLeadTimeLabel(generalReminderRule.minutes_before) : "Recomendada: 24 horas antes"}</span>
          </div>
          <div className="metric-card">
            <small>Citas cubiertas</small>
            <strong>{generalReminderRule?.is_active ? scopedUpcomingAppointmentsCount : 0}</strong>
            <span>Proximas citas que tomaran la regla base</span>
          </div>
          <div className="metric-card">
            <small>Plantilla usada</small>
            <strong>{generalReminderRule?.template_key === CONFIRMATION_TEMPLATE_KEY ? "Confirmacion" : generalReminderRule?.template_key ?? "Pendiente"}</strong>
            <span>Mensaje enviado 24 horas antes</span>
          </div>
        </div>
        <p className="empty-state">
          La configuracion recomendada es una sola regla general de WhatsApp, 24 horas antes de la cita. Solo crea reglas por doctor si realmente necesitas una excepcion.
        </p>
        <form className="form-card compact-form" onSubmit={submitReminderRule}>
          {isAdmin ? (
            <label>
              <span>Alcance</span>
              <select
                value={reminderRuleForm.doctor_id}
                onChange={(event) => setReminderRuleForm((current) => ({ ...current, doctor_id: event.target.value }))}
              >
                <option value="">General para toda la clinica</option>
                {availableDoctors.map((doctor) => (
                  <option key={`reminder-doctor-${doctor.id}`} value={doctor.id}>
                    Solo Dr. {doctor.first_name} {doctor.last_name}
                  </option>
                ))}
              </select>
            </label>
          ) : selectedDoctor ? (
            <label>
              <span>Doctor</span>
              <input value={`${selectedDoctor.first_name} ${selectedDoctor.last_name}`} readOnly />
            </label>
          ) : null}
          <label>
            <span>Momento del recordatorio</span>
            <select
              value={reminderRuleForm.minutes_before}
              onChange={(event) => setReminderRuleForm((current) => ({ ...current, minutes_before: event.target.value }))}
            >
              <option value="1440">24 horas antes</option>
              <option value="720">12 horas antes</option>
              <option value="120">2 horas antes</option>
              <option value="60">1 hora antes</option>
              <option value="30">30 minutos antes</option>
            </select>
          </label>
          <div className="row-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setReminderRuleForm((current) => ({ ...current, minutes_before: "1440", doctor_id: "" }))}
            >
              Usar 24 horas
            </button>
            <button type="submit">Guardar regla</button>
          </div>
        </form>
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Recordatorios</p>
            <h2>Reglas configuradas</h2>
          </div>
        </div>
        <div className="table-list">
          {scopedReminderRules.map((rule) => (
            <div className="simple-list-item" key={`reminder-${rule.id}`}>
              <strong>{rule.doctor_id ? "Regla por doctor" : "Regla general"}</strong>
              <span>{reminderLeadTimeLabel(rule.minutes_before)}</span>
              <span>
                {rule.doctor_id
                  ? `Asignada a ${doctorNameById.get(rule.doctor_id) ?? `Doctor ${rule.doctor_id}`}`
                  : "General para toda la clinica"}
              </span>
              <span>{rule.template_key === CONFIRMATION_TEMPLATE_KEY ? "Usa mensaje de confirmacion" : `Plantilla ${rule.template_key}`}</span>
              <div className="row-actions">
                <button
                  type="button"
                  className="success-button"
                  onClick={() =>
                    setReminderRuleForm({
                      doctor_id: rule.doctor_id ? String(rule.doctor_id) : "",
                      channel: rule.channel,
                      trigger_type: rule.trigger_type,
                      minutes_before: String(rule.minutes_before),
                      template_key: rule.template_key,
                      is_active: rule.is_active,
                    })
                  }
                >
                  Usar como base
                </button>
                <button
                  type="button"
                  className={rule.is_active ? "danger-button" : "success-button"}
                  onClick={() => toggleReminderRule(rule)}
                >
                  {rule.is_active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
          {!reminderRules.length ? <p className="empty-state">Todavia no hay reglas de recordatorio configuradas.</p> : null}
        </div>
      </article>
    </>
  );
}
