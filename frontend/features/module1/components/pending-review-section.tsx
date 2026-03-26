"use client";

import { useMemo } from "react";

import type { ICellRendererParams } from "ag-grid-community";

import { ClinicalDataGrid, type ClinicalGridColumn } from "@/features/module1/components/clinical-data-grid";
import { confirmationLabel, formatDateTime, reviewReasonLabel } from "@/features/module1/console-utils";
import { formatPhoneForDisplay } from "@/features/module1/phone-utils";
import type { Appointment, AppointmentReviewItem } from "@/features/module1/types";

type PendingReviewSectionProps = {
  appointmentReviewItems: AppointmentReviewItem[];
  attentionAppointments: Appointment[];
  onGoToAgendaAppointment: (appointmentId: number) => void;
  renderAppointmentBadges: (appointment: Appointment) => React.ReactNode;
  resolveReviewItem: (itemId: number, action: "create_appointment" | "link_existing" | "reject") => void;
  reviewGroups: Array<{
    key: string;
    title: string;
    description: string;
    items: AppointmentReviewItem[];
  }>;
};

export function PendingReviewSection({
  appointmentReviewItems,
  attentionAppointments,
  onGoToAgendaAppointment,
  resolveReviewItem,
  reviewGroups,
}: PendingReviewSectionProps) {
  const reviewRows = useMemo(
    () =>
      reviewGroups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          review_group_title: group.title,
        })),
      ),
    [reviewGroups],
  );

  const reviewColumns = useMemo<ClinicalGridColumn<(typeof reviewRows)[number]>[]>(
    () => [
      {
        headerName: "Paciente",
        minWidth: 220,
        valueGetter: ({ data }) => data?.patient_name ?? "",
        exportValue: (row) => row.patient_name,
      },
      {
        headerName: "Doctor",
        minWidth: 220,
        valueGetter: ({ data }) => data?.doctor_name ?? data?.doctor_phone_number ?? "Doctor pendiente",
        exportValue: (row) => row.doctor_name ?? row.doctor_phone_number ?? "Doctor pendiente",
      },
      {
        headerName: "Grupo",
        minWidth: 190,
        valueGetter: ({ data }) => data?.review_group_title ?? "",
        exportValue: (row) => row.review_group_title,
      },
      {
        headerName: "Motivo",
        minWidth: 180,
        valueGetter: ({ data }) => (data ? reviewReasonLabel(data.review_reason) : ""),
        exportValue: (row) => reviewReasonLabel(row.review_reason),
      },
      {
        headerName: "Fecha solicitada",
        minWidth: 180,
        valueGetter: ({ data }) => (data ? formatDateTime(data.scheduled_start) : ""),
        exportValue: (row) => formatDateTime(row.scheduled_start),
      },
      {
        headerName: "Contacto",
        minWidth: 160,
        valueGetter: ({ data }) => formatPhoneForDisplay(data?.phone_number),
        exportValue: (row) => formatPhoneForDisplay(row.phone_number),
      },
      {
        headerName: "Mensaje",
        minWidth: 320,
        flex: 1.5,
        valueGetter: ({ data }) => data?.review_message ?? "",
        exportValue: (row) => row.review_message,
      },
      {
        headerName: "Acciones",
        minWidth: 280,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<(typeof reviewRows)[number]>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              <button type="button" className="success-button" onClick={() => resolveReviewItem(data.id, "create_appointment")}>
                Crear cita
              </button>
              <button type="button" className="secondary-button" onClick={() => resolveReviewItem(data.id, "link_existing")}>
                Vincular
              </button>
              <button type="button" className="danger-button" onClick={() => resolveReviewItem(data.id, "reject")}>
                Rechazar
              </button>
            </div>
          ) : null;
        },
      },
    ],
    [resolveReviewItem, reviewRows],
  );

  const attentionColumns = useMemo<ClinicalGridColumn<Appointment>[]>(
    () => [
      {
        headerName: "Paciente",
        minWidth: 220,
        valueGetter: ({ data }) => data?.patient_name ?? (data ? `Paciente ${data.patient_id}` : ""),
        exportValue: (row) => row.patient_name ?? `Paciente ${row.patient_id}`,
      },
      {
        headerName: "Doctor",
        minWidth: 220,
        valueGetter: ({ data }) => data?.doctor_name ?? (data ? `Doctor ${data.doctor_id}` : ""),
        exportValue: (row) => row.doctor_name ?? `Doctor ${row.doctor_id}`,
      },
      {
        headerName: "Fecha y hora",
        minWidth: 180,
        valueGetter: ({ data }) => (data ? formatDateTime(data.scheduled_start) : ""),
        exportValue: (row) => formatDateTime(row.scheduled_start),
      },
      {
        headerName: "Confirmación",
        minWidth: 150,
        valueGetter: ({ data }) => (data ? confirmationLabel(data.confirmation_status) : ""),
        exportValue: (row) => confirmationLabel(row.confirmation_status),
      },
      {
        headerName: "Estado",
        minWidth: 120,
        valueGetter: ({ data }) => data?.status ?? "",
        exportValue: (row) => row.status,
      },
      {
        headerName: "Acción",
        minWidth: 160,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<Appointment>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              <button type="button" className="secondary-button" onClick={() => onGoToAgendaAppointment(data.id)}>
                Ver cita
              </button>
            </div>
          ) : null;
        },
      },
    ],
    [onGoToAgendaAppointment],
  );

  return (
    <section className="tab-layout">
      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h2>Centro de seguimiento operativo</h2>
          </div>
        </div>
        <div className="summary-grid">
          <div className="metric-card">
            <strong>{appointmentReviewItems.length}</strong>
            <span>Solicitudes por resolver</span>
          </div>
          <div className="metric-card">
            <strong>{appointmentReviewItems.filter((item) => item.review_reason === "reschedule_request").length}</strong>
            <span>Solicitudes de reagendar</span>
          </div>
          <div className="metric-card">
            <strong>{appointmentReviewItems.filter((item) => item.review_reason !== "reschedule_request").length}</strong>
            <span>Casos por validar</span>
          </div>
          <div className="metric-card">
            <strong>{attentionAppointments.length}</strong>
            <span>Citas con seguimiento hoy</span>
          </div>
        </div>
        <div className="detail-panel">
          <strong>Qué ves aquí</strong>
          <span>Esta bandeja reúne solicitudes que no se resolvieron automáticamente y citas que siguen abiertas por confirmar o con problemas de comunicación.</span>
        </div>
      </article>
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Solicitudes</p>
            <h2>Casos que requieren decisión</h2>
          </div>
        </div>
        <ClinicalDataGrid<(typeof reviewRows)[number]>
          columns={reviewColumns}
          emptyMessage="No hay solicitudes pendientes de revisión manual."
          exportFileName="casos-que-requieren-decision"
          quickFilter=""
          rowData={reviewRows}
        />
      </article>
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Agenda sensible</p>
            <h2>Citas que necesitan seguimiento</h2>
          </div>
        </div>
        <div className="detail-panel compact-panel">
          <strong>Qué revisar primero</strong>
          <span>Empieza por citas sin confirmar, mensajes fallidos y citas que ya tienen una solicitud de revisión ligada.</span>
        </div>
        <ClinicalDataGrid<Appointment>
          columns={attentionColumns}
          emptyMessage="No hay citas marcadas con seguimiento especial."
          exportFileName="citas-que-necesitan-seguimiento"
          quickFilter=""
          rowData={attentionAppointments}
        />
      </article>
    </section>
  );
}
