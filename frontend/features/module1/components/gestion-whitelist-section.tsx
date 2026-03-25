"use client";

import { useState } from "react";

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
            <div className="table-list whitelist-list">
              {messagingWhitelist?.phones.length ? (
                messagingWhitelist.phones.map((phone) => (
                  <div className="simple-list-item whitelist-list-item" key={`messaging-whitelist-${phone}`}>
                    <strong>{phone}</strong>
                    <button type="button" className="secondary-button compact-action-button" onClick={() => onRemoveMessagingWhitelistPhone(phone)}>
                      Quitar
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-state">Todavía no hay números autorizados.</p>
              )}
            </div>
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
            <div className="table-list whitelist-list">
              {emailWhitelist?.addresses.length ? (
                emailWhitelist.addresses.map((email) => (
                  <div className="simple-list-item whitelist-list-item" key={`email-whitelist-${email}`}>
                    <strong>{email}</strong>
                    <button type="button" className="secondary-button compact-action-button" onClick={() => onRemoveEmailWhitelistAddress(email)}>
                      Quitar
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-state">Todavía no hay correos autorizados.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
