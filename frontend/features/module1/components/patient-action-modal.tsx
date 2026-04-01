"use client";

import { PhoneField, RequiredLabel, SearchableSelect } from "@/features/module1/components/form-fields";
import type { Doctor } from "@/features/module1/types";

type PatientAction = "patient_create" | "patient_edit" | null;

type PatientForm = {
  medical_record_number: string;
  display_name: string;
  first_name: string;
  last_name: string;
  primary_phone: string;
  national_id: string;
  tax_id: string;
  email: string;
  doctor_id: string;
};

type PatientEditForm = {
  display_name: string;
  first_name: string;
  last_name: string;
  primary_phone: string;
  national_id: string;
  tax_id: string;
  email: string;
  address: string;
  notes: string;
  is_active: boolean;
};

type PatientActionModalProps = {
  activeSectionAction: PatientAction;
  availableDoctors: Doctor[];
  patientEditForm: PatientEditForm;
  patientForm: PatientForm;
  onTogglePatientActive: () => void;
  setActiveSectionAction: React.Dispatch<React.SetStateAction<PatientAction>>;
  setPatientEditForm: React.Dispatch<React.SetStateAction<PatientEditForm>>;
  setPatientForm: React.Dispatch<React.SetStateAction<PatientForm>>;
  submitPatient: (event: React.FormEvent<HTMLFormElement>) => void;
  submitPatientUpdate: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function PatientActionModal({
  activeSectionAction,
  availableDoctors,
  onTogglePatientActive,
  patientEditForm,
  patientForm,
  setActiveSectionAction,
  setPatientEditForm,
  setPatientForm,
  submitPatient,
  submitPatientUpdate,
}: PatientActionModalProps) {
  const doctorOptions = availableDoctors.map((doctor) => ({
    value: String(doctor.id),
    label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
  }));

  if (!activeSectionAction) {
    return null;
  }

  if (activeSectionAction === "patient_create") {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Registro manual</p>
              <h2>Agregar paciente</h2>
            </div>
            <button type="button" className="secondary-button" onClick={() => setActiveSectionAction(null)}>
              Cerrar
            </button>
          </div>
          <form className="form-card" onSubmit={submitPatient}>
            <div className="three-column-grid">
              <label>
                <RequiredLabel>Doctor responsable</RequiredLabel>
                <SearchableSelect
                  value={patientForm.doctor_id}
                  onChange={(value) => setPatientForm((current) => ({ ...current, doctor_id: value }))}
                  options={doctorOptions}
                  placeholder="Selecciona doctor"
                  searchPlaceholder="Buscar doctor"
                  required
                />
              </label>
              <label>
                <span>Expediente</span>
                <input
                  value={patientForm.medical_record_number}
                  onChange={(event) => setPatientForm((current) => ({ ...current, medical_record_number: event.target.value }))}
                  placeholder="Automático si lo dejas vacío"
                />
              </label>
              <label>
                <span>Alias visible</span>
                <input
                  value={patientForm.display_name}
                  onChange={(event) => setPatientForm((current) => ({ ...current, display_name: event.target.value }))}
                  placeholder="Ej. Edward Gomez (padre)"
                />
              </label>
              <label>
                <RequiredLabel>Nombres</RequiredLabel>
                <input
                  value={patientForm.first_name}
                  onChange={(event) => setPatientForm((current) => ({ ...current, first_name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <RequiredLabel>Apellidos</RequiredLabel>
                <input
                  value={patientForm.last_name}
                  onChange={(event) => setPatientForm((current) => ({ ...current, last_name: event.target.value }))}
                  required
                />
              </label>
              <PhoneField
                label="Teléfono"
                value={patientForm.primary_phone}
                onChange={(nextValue) => setPatientForm((current) => ({ ...current, primary_phone: nextValue }))}
                required
                placeholder="58420737"
              />
              <label>
                <span>DPI</span>
                <input
                  value={patientForm.national_id}
                  onChange={(event) => setPatientForm((current) => ({ ...current, national_id: event.target.value }))}
                />
              </label>
              <label>
                <span>NIT</span>
                <input
                  value={patientForm.tax_id}
                  onChange={(event) => setPatientForm((current) => ({ ...current, tax_id: event.target.value }))}
                />
              </label>
              <label className="span-two">
                <span>Correo</span>
                <input
                  type="email"
                  value={patientForm.email}
                  onChange={(event) => setPatientForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
            </div>
            <div className="row-actions">
              <button type="button" className="secondary-button" onClick={() => setActiveSectionAction(null)}>
                Cancelar
              </button>
              <button type="submit">Guardar paciente</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Ficha del paciente</p>
            <h2>Editar paciente</h2>
          </div>
          <button type="button" className="secondary-button" onClick={() => setActiveSectionAction(null)}>
            Cerrar
          </button>
        </div>
        <form className="form-card compact-form" onSubmit={submitPatientUpdate}>
          <div className="three-column-grid">
            <label>
              <span>Alias visible</span>
              <input
                value={patientEditForm.display_name}
                onChange={(event) => setPatientEditForm((current) => ({ ...current, display_name: event.target.value }))}
                placeholder="Ej. Edward Gomez (padre)"
              />
            </label>
            <label>
              <RequiredLabel>Nombres</RequiredLabel>
              <input
                value={patientEditForm.first_name}
                onChange={(event) => setPatientEditForm((current) => ({ ...current, first_name: event.target.value }))}
                required
              />
            </label>
            <label>
              <RequiredLabel>Apellidos</RequiredLabel>
              <input
                value={patientEditForm.last_name}
                onChange={(event) => setPatientEditForm((current) => ({ ...current, last_name: event.target.value }))}
                required
              />
            </label>
            <PhoneField
              label="Teléfono"
              value={patientEditForm.primary_phone}
              onChange={(nextValue) => setPatientEditForm((current) => ({ ...current, primary_phone: nextValue }))}
              required
              placeholder="58420737"
            />
            <label>
              <span>DPI</span>
              <input
                value={patientEditForm.national_id}
                onChange={(event) => setPatientEditForm((current) => ({ ...current, national_id: event.target.value }))}
              />
            </label>
            <label>
              <span>NIT</span>
              <input
                value={patientEditForm.tax_id}
                onChange={(event) => setPatientEditForm((current) => ({ ...current, tax_id: event.target.value }))}
              />
            </label>
            <label>
              <span>Correo</span>
              <input
                type="email"
                value={patientEditForm.email}
                onChange={(event) => setPatientEditForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="span-two">
              <span>Dirección</span>
              <input
                value={patientEditForm.address}
                onChange={(event) => setPatientEditForm((current) => ({ ...current, address: event.target.value }))}
              />
            </label>
            <label className="span-two">
              <span>Notas</span>
              <textarea
                value={patientEditForm.notes}
                onChange={(event) => setPatientEditForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
            <label>
              <span>Estado</span>
              <select
                value={patientEditForm.is_active ? "active" : "inactive"}
                onChange={(event) => setPatientEditForm((current) => ({ ...current, is_active: event.target.value === "active" }))}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
          </div>
          <div className="row-actions">
            <button
              type="button"
              className={patientEditForm.is_active ? "danger-button" : "success-button"}
              onClick={onTogglePatientActive}
            >
              {patientEditForm.is_active ? "Desactivar paciente" : "Activar paciente"}
            </button>
            <button type="button" className="secondary-button" onClick={() => setActiveSectionAction(null)}>
              Cancelar
            </button>
            <button type="submit">Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}
