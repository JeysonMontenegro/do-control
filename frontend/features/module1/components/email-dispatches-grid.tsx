"use client";

import { useMemo } from "react";

import {
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";

import { ClinicalDataGrid, type ClinicalGridColumn } from "@/features/module1/components/clinical-data-grid";
import { formatDateTime } from "@/features/module1/console-utils";
import type { EmailDispatch } from "@/features/module1/types";

type EmailDispatchesGridProps = {
  dispatches: EmailDispatch[];
  quickFilter: string;
  statusFilter: string;
  onOpenDispatch: (dispatch: EmailDispatch) => void;
  onResendDispatch: (dispatchId: number) => void;
};

function statusBadge(status: string) {
  return <span className={`status-badge status-badge-${status}`}>{status}</span>;
}

export function EmailDispatchesGrid({
  dispatches,
  quickFilter,
  statusFilter,
  onOpenDispatch,
  onResendDispatch,
}: EmailDispatchesGridProps) {
  const rowData = useMemo(
    () => dispatches.filter((dispatch) => (statusFilter === "all" ? true : dispatch.status === statusFilter)),
    [dispatches, statusFilter],
  );

  const columnDefs = useMemo<ClinicalGridColumn<EmailDispatch>[]>(
    () => [
      {
        headerName: "Destinatario",
        field: "recipient_email",
        minWidth: 220,
        flex: 1.2,
        filter: true,
        exportValue: (row) => row.recipient_email,
      },
      {
        headerName: "Asunto",
        field: "subject",
        minWidth: 240,
        flex: 1.5,
        filter: true,
        exportValue: (row) => row.subject,
      },
      {
        headerName: "Template",
        field: "template_key",
        minWidth: 170,
        valueGetter: ({ data }) => data?.template_key ?? "Correo libre",
        filter: true,
        exportValue: (row) => row.template_key ?? "Correo libre",
      },
      {
        headerName: "Estado",
        field: "status",
        minWidth: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams<EmailDispatch>) => statusBadge(String(params.value ?? "")),
        exportValue: (row) => row.status,
      },
      {
        headerName: "Proveedor",
        field: "provider",
        minWidth: 140,
        valueGetter: ({ data }) => data?.provider || "Sin proveedor",
        filter: true,
        exportValue: (row) => row.provider || "Sin proveedor",
      },
      {
        headerName: "Creado",
        field: "created_at",
        minWidth: 180,
        sortable: true,
        valueFormatter: ({ value }) => (value ? formatDateTime(value) : "Sin fecha"),
        exportValue: (row) => formatDateTime(row.created_at),
      },
      {
        headerName: "Detalle",
        field: "error_message",
        minWidth: 220,
        flex: 1,
        sortable: false,
        filter: true,
        valueGetter: ({ data }) => data?.error_message ?? data?.text_body ?? data?.html_body ?? "",
        exportValue: (row) => row.error_message ?? row.text_body ?? row.html_body ?? "",
      },
      {
        headerName: "Acciones",
        minWidth: 220,
        sortable: false,
        filter: false,
        pinned: "right",
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<EmailDispatch>) => {
          const dispatch = params.data;
          if (!dispatch) {
            return null;
          }
          return (
            <div className="ag-actions-cell">
              <button
                type="button"
                className="secondary-button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDispatch(dispatch);
                }}
              >
                Ver detalle
              </button>
              <button
                type="button"
                className="success-button"
                onClick={(event) => {
                  event.stopPropagation();
                  onResendDispatch(dispatch.id);
                }}
              >
                Reenviar
              </button>
            </div>
          );
        },
      },
    ],
    [onOpenDispatch, onResendDispatch],
  );

  return (
    <ClinicalDataGrid<EmailDispatch>
      columns={columnDefs}
      emptyMessage="No hay correos que coincidan con el filtro actual."
      exportFileName="envios-recientes-correo"
      quickFilter={quickFilter}
      rowData={rowData}
    />
  );
}
