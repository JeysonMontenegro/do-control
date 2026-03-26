"use client";

import { useMemo, useState } from "react";

import type { ICellRendererParams } from "ag-grid-community";

import { ClinicalDataGrid, type ClinicalGridColumn } from "@/features/module1/components/clinical-data-grid";
import type { EmailWhitelistState, MessagingWhitelistState } from "@/features/module1/types";

type GestionWhitelistSectionProps = {
  emailWhitelist: EmailWhitelistState | null;
  messagingWhitelist: MessagingWhitelistState | null;
  onAddEmailWhitelistAddress: (email: string) => void;
  onAddMessagingWhitelistPhone: (phone: string) => void;
  onRemoveEmailWhitelistAddress: (email: string) => void;
  onRemoveMessagingWhitelistPhone: (phone: string) => void;
  onToggleEmailWhitelist: (enabled: boolean) => void;
  onToggleMessagingWhitelist: (enabled: boolean) => void;
};

export function GestionWhitelistSection({
  emailWhitelist,
  messagingWhitelist,
  onAddEmailWhitelistAddress,
  onAddMessagingWhitelistPhone,
  onRemoveEmailWhitelistAddress,
  onRemoveMessagingWhitelistPhone,
  onToggleEmailWhitelist,
  onToggleMessagingWhitelist,
}: GestionWhitelistSectionProps) {
  const [newWhitelistPhone, setNewWhitelistPhone] = useState("");
  const [newWhitelistEmail, setNewWhitelistEmail] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const filteredPhones = useMemo(() => {
    const query = phoneSearch.trim().toLowerCase();
    const items = messagingWhitelist?.phones ?? [];
    return query ? items.filter((phone) => phone.toLowerCase().includes(query)) : items;
  }, [messagingWhitelist?.phones, phoneSearch]);
  const filteredEmails = useMemo(() => {
    const query = emailSearch.trim().toLowerCase();
    const items = emailWhitelist?.addresses ?? [];
    return query ? items.filter((email) => email.toLowerCase().includes(query)) : items;
  }, [emailWhitelist?.addresses, emailSearch]);
  const phoneRows = useMemo(() => filteredPhones.map((phone) => ({ phone })), [filteredPhones]);
  const emailRows = useMemo(() => filteredEmails.map((email) => ({ email })), [filteredEmails]);
  const phoneColumns = useMemo<ClinicalGridColumn<{ phone: string }>[]>(
    () => [
      {
        headerName: "Número autorizado",
        field: "phone",
        minWidth: 260,
        flex: 1,
        exportValue: (row) => row.phone,
      },
      {
        headerName: "Acciones",
        minWidth: 150,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<{ phone: string }>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              <button type="button" className="danger-button" onClick={() => onRemoveMessagingWhitelistPhone(data.phone)}>
                Quitar
              </button>
            </div>
          ) : null;
        },
      },
    ],
    [onRemoveMessagingWhitelistPhone],
  );
  const emailColumns = useMemo<ClinicalGridColumn<{ email: string }>[]>(
    () => [
      {
        headerName: "Correo autorizado",
        field: "email",
        minWidth: 320,
        flex: 1,
        exportValue: (row) => row.email,
      },
      {
        headerName: "Acciones",
        minWidth: 150,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<{ email: string }>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              <button type="button" className="danger-button" onClick={() => onRemoveEmailWhitelistAddress(data.email)}>
                Quitar
              </button>
            </div>
          ) : null;
        },
      },
    ],
    [onRemoveEmailWhitelistAddress],
  );

  return (
    <article className="card section-card span-three">
      <div className="subsection-header">
        <div>
          <p className="eyebrow">Whitelist</p>
          <h2>Destinatarios autorizados</h2>
        </div>
      </div>
      <div className="summary-grid">
        <div className="metric-card">
          <small>WhatsApp</small>
          <strong>{messagingWhitelist?.enabled ? "Protegida" : "Libre"}</strong>
          <span>{messagingWhitelist?.phones.length ?? 0} número(s) autorizados.</span>
        </div>
        <div className="metric-card">
          <small>Correo</small>
          <strong>{emailWhitelist?.enabled ? "Protegido" : "Libre"}</strong>
          <span>{emailWhitelist?.addresses.length ?? 0} correo(s) autorizados.</span>
        </div>
        <div className="metric-card">
          <small>Mantenimiento</small>
          <strong>QA seguro</strong>
          <span>Controla exactamente quién puede recibir pruebas.</span>
        </div>
      </div>

      <div className="table-list">
        <div className="simple-list-item whitelist-panel">
          <div className="toggle-row">
            <div className="toggle-copy">
              <strong>Whitelist de WhatsApp</strong>
              <span>Cuando está encendida, solo los números de esta lista pueden recibir mensajes.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={messagingWhitelist?.enabled ?? false}
              className={`switch-button ${(messagingWhitelist?.enabled ?? false) ? "switch-button-active" : ""}`}
              onClick={() => onToggleMessagingWhitelist(!(messagingWhitelist?.enabled ?? false))}
            >
              <span className="switch-track">
                <span className="switch-thumb" />
              </span>
              <span className="switch-label">{messagingWhitelist?.enabled ? "Encendido" : "Apagado"}</span>
            </button>
          </div>
            <div className="form-card compact-form whitelist-maintenance-card">
              <div className="whitelist-entry-row">
              <label>
                <span>Agregar número</span>
                <input
                  value={newWhitelistPhone}
                  onChange={(event) => setNewWhitelistPhone(event.target.value)}
                  placeholder="50252827538"
                />
              </label>
              <button
                type="button"
                className="success-button compact-action-button"
                disabled={!newWhitelistPhone.trim()}
                onClick={() => {
                  onAddMessagingWhitelistPhone(newWhitelistPhone);
                  setNewWhitelistPhone("");
                }}
              >
                Agregar número
              </button>
              </div>
              <input
                className="search-input"
                placeholder="Buscar número autorizado"
                value={phoneSearch}
                onChange={(event) => setPhoneSearch(event.target.value)}
              />
              <ClinicalDataGrid<{ phone: string }>
                columns={phoneColumns}
                emptyMessage="Todavía no hay números autorizados."
                exportFileName="whitelist-whatsapp"
                quickFilter={phoneSearch}
                rowData={phoneRows}
              />
          </div>
        </div>

        <div className="simple-list-item whitelist-panel">
          <div className="toggle-row">
            <div className="toggle-copy">
              <strong>Whitelist de correos</strong>
              <span>Cuando está encendida, solo los correos de esta lista pueden recibir envíos.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailWhitelist?.enabled ?? false}
              className={`switch-button ${(emailWhitelist?.enabled ?? false) ? "switch-button-active" : ""}`}
              onClick={() => onToggleEmailWhitelist(!(emailWhitelist?.enabled ?? false))}
            >
              <span className="switch-track">
                <span className="switch-thumb" />
              </span>
              <span className="switch-label">{emailWhitelist?.enabled ? "Encendido" : "Apagado"}</span>
            </button>
          </div>
            <div className="form-card compact-form whitelist-maintenance-card">
              <div className="whitelist-entry-row">
              <label>
                <span>Agregar correo</span>
                <input
                  type="email"
                  value={newWhitelistEmail}
                  onChange={(event) => setNewWhitelistEmail(event.target.value)}
                  placeholder="qa@dominio.com"
                />
              </label>
              <button
                type="button"
                className="success-button compact-action-button"
                disabled={!newWhitelistEmail.trim()}
                onClick={() => {
                  onAddEmailWhitelistAddress(newWhitelistEmail);
                  setNewWhitelistEmail("");
                }}
              >
                Agregar correo
              </button>
              </div>
              <input
                className="search-input"
                placeholder="Buscar correo autorizado"
                value={emailSearch}
                onChange={(event) => setEmailSearch(event.target.value)}
              />
              <ClinicalDataGrid<{ email: string }>
                columns={emailColumns}
                emptyMessage="Todavía no hay correos autorizados."
                exportFileName="whitelist-correos"
                quickFilter={emailSearch}
                rowData={emailRows}
              />
          </div>
        </div>
      </div>
    </article>
  );
}
