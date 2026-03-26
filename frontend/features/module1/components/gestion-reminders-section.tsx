"use client";

import { useMemo, useState } from "react";

import type { ICellRendererParams } from "ag-grid-community";

import { ClinicalDataGrid, type ClinicalGridColumn } from "@/features/module1/components/clinical-data-grid";
import { CONFIRMATION_TEMPLATE_KEY } from "@/features/module1/console-config";
import { reminderLeadTimeLabel } from "@/features/module1/console-utils";
import type { Appointment, Doctor, ReminderRule } from "@/features/module1/types";

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
  scopedUpcomingAppointments: Appointment[];
  selectedDoctor: Doctor | null;
  setDoctorReminderRuleActive: (doctorId: number, isActive: boolean) => void;
  setReminderRuleForm: React.Dispatch<React.SetStateAction<ReminderRuleFormState>>;
  submitReminderRule: (event: React.FormEvent<HTMLFormElement>) => void;
  toggleReminderRule: (rule: ReminderRule) => void;
};

export function GestionRemindersSection({
  activateDefault24HourReminder,
  doctorNameById,
  generalReminderRule,
  isAdmin,
  reminderRules,
  scopedDoctorId,
  scopedUpcomingAppointments,
  toggleReminderRule,
  setDoctorReminderRuleActive,
  availableDoctors,
  selectedDoctor,
}: GestionRemindersSectionProps) {
  const scopedReminderRules = reminderRules.filter(
    (rule) => scopedDoctorId === null || rule.doctor_id === null || rule.doctor_id === scopedDoctorId,
  );
  const scopedDoctorRules = scopedReminderRules.filter((rule) => rule.doctor_id !== null);
  const generalRuleActive = Boolean(generalReminderRule?.is_active);
  const [doctorCoverageSearch, setDoctorCoverageSearch] = useState("");
  const [doctorRuleSearch, setDoctorRuleSearch] = useState("");
  const doctorCards = (isAdmin ? availableDoctors : selectedDoctor ? [selectedDoctor] : []).map((doctor) => {
    const doctorRule =
      scopedDoctorRules.find((rule) => rule.doctor_id === doctor.id && rule.trigger_type === "before_appointment") ?? null;
    const effectiveActive = doctorRule ? doctorRule.is_active : generalRuleActive;
    const effectiveMinutes = doctorRule?.minutes_before ?? generalReminderRule?.minutes_before ?? 1440;
    const effectiveTemplateKey = doctorRule?.template_key ?? generalReminderRule?.template_key ?? CONFIRMATION_TEMPLATE_KEY;
    const coveredAppointments = scopedUpcomingAppointments.filter((appointment) => appointment.doctor_id === doctor.id).length;
    const hasOwnRule = Boolean(doctorRule);
    return {
      doctor,
      coveredAppointments,
      effectiveActive,
      effectiveMinutes,
      effectiveTemplateKey,
      hasOwnRule,
      doctorRule,
    };
  });
  const filteredDoctorCards = useMemo(() => {
    const query = doctorCoverageSearch.trim().toLowerCase();
    if (!query) {
      return doctorCards;
    }
    return doctorCards.filter(({ doctor, effectiveTemplateKey }) =>
      `${doctor.first_name} ${doctor.last_name} ${effectiveTemplateKey}`.toLowerCase().includes(query),
    );
  }, [doctorCards, doctorCoverageSearch]);
  const filteredDoctorRules = useMemo(() => {
    const query = doctorRuleSearch.trim().toLowerCase();
    if (!query) {
      return scopedDoctorRules;
    }
    return scopedDoctorRules.filter((rule) =>
      `${doctorNameById.get(rule.doctor_id ?? -1) ?? ""} ${rule.template_key} ${rule.minutes_before}`.toLowerCase().includes(query),
    );
  }, [doctorNameById, doctorRuleSearch, scopedDoctorRules]);
  const doctorCoverageColumns = useMemo<ClinicalGridColumn<(typeof doctorCards)[number]>[]>(
    () => [
      {
        headerName: "Doctor",
        minWidth: 220,
        valueGetter: ({ data }) => (data ? `${data.doctor.first_name} ${data.doctor.last_name}` : ""),
        exportValue: (row) => `${row.doctor.first_name} ${row.doctor.last_name}`,
      },
      {
        headerName: "Estado",
        minWidth: 150,
        valueGetter: ({ data }) => (data?.effectiveActive ? "Recordatorios activos" : "Recordatorios inactivos"),
        exportValue: (row) => (row.effectiveActive ? "Recordatorios activos" : "Recordatorios inactivos"),
      },
      {
        headerName: "Citas próximas",
        minWidth: 140,
        valueGetter: ({ data }) => data?.coveredAppointments ?? 0,
        exportValue: (row) => row.coveredAppointments,
      },
      {
        headerName: "Anticipación",
        minWidth: 150,
        valueGetter: ({ data }) => (data ? reminderLeadTimeLabel(data.effectiveMinutes) : ""),
        exportValue: (row) => reminderLeadTimeLabel(row.effectiveMinutes),
      },
      {
        headerName: "Template",
        minWidth: 180,
        valueGetter: ({ data }) => (data?.effectiveTemplateKey === CONFIRMATION_TEMPLATE_KEY ? "Template de confirmación" : `Template ${data?.effectiveTemplateKey}`),
        exportValue: (row) => (row.effectiveTemplateKey === CONFIRMATION_TEMPLATE_KEY ? "Template de confirmación" : `Template ${row.effectiveTemplateKey}`),
      },
      {
        headerName: "Cobertura",
        minWidth: 170,
        valueGetter: ({ data }) => (data?.hasOwnRule ? "Tiene excepción propia" : "Hereda la regla global"),
        exportValue: (row) => (row.hasOwnRule ? "Tiene excepción propia" : "Hereda la regla global"),
      },
      {
        headerName: "Acciones",
        minWidth: 220,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<(typeof doctorCards)[number]>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              <button
                type="button"
                className={data.effectiveActive ? "danger-button" : "success-button"}
                onClick={() => setDoctorReminderRuleActive(data.doctor.id, !data.effectiveActive)}
              >
                {data.effectiveActive ? "Desactivar" : "Activar"}
              </button>
            </div>
          ) : null;
        },
      },
    ],
    [setDoctorReminderRuleActive],
  );
  const doctorRuleColumns = useMemo<ClinicalGridColumn<ReminderRule>[]>(
    () => [
      {
        headerName: "Regla",
        minWidth: 180,
        valueGetter: ({ data }) => (data?.doctor_id ? "Regla por doctor" : "Regla general"),
        exportValue: (row) => (row.doctor_id ? "Regla por doctor" : "Regla general"),
      },
      {
        headerName: "Doctor",
        minWidth: 220,
        valueGetter: ({ data }) =>
          data?.doctor_id ? doctorNameById.get(data.doctor_id) ?? `Doctor ${data.doctor_id}` : "General para toda la clínica",
        exportValue: (row) => (row.doctor_id ? doctorNameById.get(row.doctor_id) ?? `Doctor ${row.doctor_id}` : "General para toda la clínica"),
      },
      {
        headerName: "Anticipación",
        minWidth: 150,
        valueGetter: ({ data }) => (data ? reminderLeadTimeLabel(data.minutes_before) : ""),
        exportValue: (row) => reminderLeadTimeLabel(row.minutes_before),
      },
      {
        headerName: "Template",
        minWidth: 180,
        valueGetter: ({ data }) => (data?.template_key === CONFIRMATION_TEMPLATE_KEY ? "Template de confirmación" : `Template ${data?.template_key}`),
        exportValue: (row) => (row.template_key === CONFIRMATION_TEMPLATE_KEY ? "Template de confirmación" : `Template ${row.template_key}`),
      },
      {
        headerName: "Estado",
        minWidth: 120,
        valueGetter: ({ data }) => (data?.is_active ? "Activa" : "Inactiva"),
        exportValue: (row) => (row.is_active ? "Activa" : "Inactiva"),
      },
      {
        headerName: "Acciones",
        minWidth: 180,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<ReminderRule>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              <button
                type="button"
                className={data.is_active ? "danger-button" : "success-button"}
                onClick={() => toggleReminderRule(data)}
              >
                {data.is_active ? "Desactivar" : "Activar"}
              </button>
            </div>
          ) : null;
        },
      },
    ],
    [doctorNameById, toggleReminderRule],
  );

  return (
    <>
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Recordatorios</p>
            <h2>Control global de recordatorios</h2>
          </div>
          <button
            type="button"
            className={generalRuleActive ? "danger-button" : "success-button"}
            onClick={() => {
              if (generalReminderRule) {
                toggleReminderRule(generalReminderRule);
                return;
              }
              activateDefault24HourReminder();
            }}
          >
            {generalRuleActive ? "Desactivar recordatorios" : "Activar recordatorios"}
          </button>
        </div>
        <div className="summary-grid">
          <div className="metric-card">
            <small>Estado global</small>
            <strong>{generalRuleActive ? "Activo" : "Inactivo"}</strong>
            <span>{generalReminderRule ? reminderLeadTimeLabel(generalReminderRule.minutes_before) : "Recomendado: 24 horas antes"}</span>
          </div>
          <div className="metric-card">
            <small>Citas cubiertas</small>
            <strong>{generalRuleActive ? scopedUpcomingAppointments.length : 0}</strong>
            <span>Próximas citas bajo el recordatorio general</span>
          </div>
          <div className="metric-card">
            <small>Template referenciado</small>
            <strong>{generalReminderRule?.template_key === CONFIRMATION_TEMPLATE_KEY ? "Confirmación" : generalReminderRule?.template_key ?? "Pendiente"}</strong>
            <span>La aprobación y edición final vive en appoint-me</span>
          </div>
        </div>
        <p className="empty-state">
          Aquí solo debes decidir si los recordatorios globales están encendidos o apagados. El contenido del template de WhatsApp se administra fuera de do-control.
        </p>
        {!generalReminderRule ? (
          <div className="detail-panel">
            <strong>No hay regla general creada</strong>
            <span>Si activas recordatorios, se configurará la base recomendada de 24 horas antes.</span>
          </div>
        ) : null}
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Recordatorios</p>
            <h2>Cobertura por doctor</h2>
          </div>
        </div>
        <ClinicalDataGrid<(typeof doctorCards)[number]>
          columns={doctorCoverageColumns}
          emptyMessage="No hay doctores visibles en este contexto para gestionar recordatorios."
          exportFileName="recordatorios-por-doctor"
          quickFilter={doctorCoverageSearch}
          rowData={filteredDoctorCards}
          extraToolbar={
            <input
              className="search-input"
              placeholder="Buscar doctor o template"
              value={doctorCoverageSearch}
              onChange={(event) => setDoctorCoverageSearch(event.target.value)}
            />
          }
        />
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Recordatorios</p>
            <h2>Excepciones visibles</h2>
          </div>
        </div>
        <ClinicalDataGrid<ReminderRule>
          columns={doctorRuleColumns}
          emptyMessage="No hay excepciones por doctor visibles. El control principal es el global."
          exportFileName="excepciones-recordatorios"
          quickFilter={doctorRuleSearch}
          rowData={filteredDoctorRules}
          extraToolbar={
            <input
              className="search-input"
              placeholder="Buscar doctor o template"
              value={doctorRuleSearch}
              onChange={(event) => setDoctorRuleSearch(event.target.value)}
            />
          }
        />
      </article>
    </>
  );
}
