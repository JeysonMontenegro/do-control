"use client";

import { useMemo, useRef } from "react";

import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type IRowNode,
} from "ag-grid-community";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

ModuleRegistry.registerModules([AllCommunityModule]);

export type ClinicalGridColumn<T> = ColDef<T> & {
  excludeFromExport?: boolean;
  exportLabel?: string;
  exportValue?: (row: T) => string | number | boolean | null | undefined;
};

type ClinicalDataGridProps<T> = {
  columns: ClinicalGridColumn<T>[];
  emptyMessage: string;
  exportFileName: string;
  extraToolbar?: React.ReactNode;
  pageSize?: number;
  quickFilter: string;
  rowData: T[];
};

function getNestedValue(source: unknown, path: string) {
  if (!source || !path) {
    return "";
  }
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return "";
  }, source);
}

function stringifyExportValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function ClinicalDataGrid<T extends object>({
  columns,
  emptyMessage,
  exportFileName,
  extraToolbar,
  pageSize = 10,
  quickFilter,
  rowData,
}: ClinicalDataGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null);

  const defaultColDef = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      resizable: true,
      minWidth: 120,
      filter: true,
    }),
    [],
  );

  function collectExportRows() {
    const api = gridRef.current?.api;
    if (!api) {
      return [] as Array<Record<string, string>>;
    }

    const exportableColumns = columns.filter((column) => !column.excludeFromExport);
    const rows: Array<Record<string, string>> = [];

    api.forEachNodeAfterFilterAndSort((node: IRowNode<T>) => {
      if (!node.data) {
        return;
      }
      const row = node.data;
      const exportRow = exportableColumns.reduce<Record<string, string>>((current, column) => {
        const header = column.exportLabel ?? column.headerName ?? column.field ?? "Columna";
        const value =
          typeof column.exportValue === "function"
            ? column.exportValue(row)
            : column.field
              ? getNestedValue(row, column.field)
              : "";
        current[header] = stringifyExportValue(value);
        return current;
      }, {});
      rows.push(exportRow);
    });

    return rows;
  }

  function exportToExcel() {
    const rows = collectExportRows();
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Resultado: "Sin datos para exportar" }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
    XLSX.writeFile(workbook, `${exportFileName}.xlsx`);
  }

  function exportToPdf() {
    const rows = collectExportRows();
    const headers = columns
      .filter((column) => !column.excludeFromExport)
      .map((column) => column.exportLabel ?? column.headerName ?? column.field ?? "Columna");
    const body = rows.map((row) => headers.map((header) => row[header] ?? ""));

    const doc = new jsPDF({
      orientation: headers.length > 5 ? "landscape" : "portrait",
      unit: "pt",
      format: "a4",
    });

    doc.setFontSize(14);
    doc.text(exportFileName, 40, 36);
    autoTable(doc, {
      head: [headers],
      body: body.length ? body : [["Sin datos para exportar"]],
      startY: 52,
      styles: {
        fontSize: 8,
        cellPadding: 5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [15, 108, 120],
      },
      margin: { left: 28, right: 28 },
    });

    doc.save(`${exportFileName}.pdf`);
  }

  return (
    <div className="data-grid-stack">
      <div className="data-grid-toolbar">
        <div className="data-grid-toolbar-main">{extraToolbar}</div>
        <div className="data-grid-export-actions">
          <button type="button" className="secondary-button compact-action-button" onClick={exportToExcel}>
            Exportar Excel
          </button>
          <button type="button" className="secondary-button compact-action-button" onClick={exportToPdf}>
            Exportar PDF
          </button>
        </div>
      </div>
      <div className="email-grid-shell ag-theme-quartz">
        <AgGridReact<T>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columns}
          defaultColDef={defaultColDef}
          theme={themeQuartz}
          quickFilterText={quickFilter}
          pagination
          paginationPageSize={pageSize}
          paginationPageSizeSelector={[10, 20, 50]}
          animateRows
          suppressCellFocus
          overlayNoRowsTemplate={emptyMessage}
        />
      </div>
    </div>
  );
}
