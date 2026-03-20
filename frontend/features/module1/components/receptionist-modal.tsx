"use client";

import { PhoneField, RequiredLabel } from "@/features/module1/components/form-fields";
import type { Doctor } from "@/features/module1/types";

type ReceptionistForm = {
  first_name: string;
  last_name: string;
  gender: string;
  phone_number: string;
  email: string;
  password: string;
  doctor_ids: number[];
};

type ReceptionistModalProps = {
  editingReceptionistId: number | null;
  filteredDoctorOptions: Doctor[];
  isAdmin: boolean;
  receptionistDoctorSearch: string;
  receptionistForm: ReceptionistForm;
  showReceptionistModal: boolean;
  resetReceptionistForm: () => void;
  setReceptionistDoctorSearch: React.Dispatch<React.SetStateAction<string>>;
  setReceptionistForm: React.Dispatch<React.SetStateAction<ReceptionistForm>>;
  submitReceptionist: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function ReceptionistModal({
  editingReceptionistId,
  filteredDoctorOptions,
  isAdmin,
  receptionistDoctorSearch,
  receptionistForm,
  showReceptionistModal,
  resetReceptionistForm,
  setReceptionistDoctorSearch,
  setReceptionistForm,
  submitReceptionist,
}: ReceptionistModalProps) {
  if (!showReceptionistModal || !isAdmin) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Equipo clínico</p>
            <h2>{editingReceptionistId ? "Editar recepcionista" : "Registrar recepcionista"}</h2>
          </div>
          <button type="button" className="secondary-button" onClick={resetReceptionistForm}>
            Cerrar
          </button>
        </div>
        <form className="form-card compact-form" onSubmit={submitReceptionist}>
          <div className="two-column-grid">
            <label>
              <RequiredLabel>Nombres</RequiredLabel>
              <input value={receptionistForm.first_name} onChange={(event) => setReceptionistForm((current) => ({ ...current, first_name: event.target.value }))} required />
            </label>
            <label>
              <RequiredLabel>Apellidos</RequiredLabel>
              <input value={receptionistForm.last_name} onChange={(event) => setReceptionistForm((current) => ({ ...current, last_name: event.target.value }))} required />
            </label>
            <label>
              <span>Género</span>
              <select value={receptionistForm.gender} onChange={(event) => setReceptionistForm((current) => ({ ...current, gender: event.target.value }))}>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <PhoneField
              label="Teléfono"
              value={receptionistForm.phone_number}
              onChange={(nextValue) => setReceptionistForm((current) => ({ ...current, phone_number: nextValue }))}
              placeholder="58420737"
            />
            <label>
              <RequiredLabel>Correo</RequiredLabel>
              <input type="email" value={receptionistForm.email} onChange={(event) => setReceptionistForm((current) => ({ ...current, email: event.target.value }))} required disabled={editingReceptionistId !== null} />
            </label>
            <label>
              <span>{editingReceptionistId ? "Nueva contraseña" : "Contraseña inicial"}</span>
              <input type="password" value={receptionistForm.password} onChange={(event) => setReceptionistForm((current) => ({ ...current, password: event.target.value }))} required={editingReceptionistId === null} />
            </label>
          </div>
          <div className="subsection">
            <strong>Doctores asignados</strong>
            <input
              className="search-input"
              placeholder="Filtrar doctores por nombre o especialidad"
              value={receptionistDoctorSearch}
              onChange={(event) => setReceptionistDoctorSearch(event.target.value)}
            />
            <div className="table-list">
              {filteredDoctorOptions.map((doctor) => (
                <label key={`receptionist-doctor-${doctor.id}`} className="simple-list-item">
                  <span>
                    <input
                      type="checkbox"
                      checked={receptionistForm.doctor_ids.includes(doctor.id)}
                      onChange={(event) =>
                        setReceptionistForm((current) => ({
                          ...current,
                          doctor_ids: event.target.checked
                            ? [...current.doctor_ids, doctor.id]
                            : current.doctor_ids.filter((doctorId) => doctorId !== doctor.id),
                        }))
                      }
                    />
                  </span>
                  <strong>Dr. {doctor.first_name} {doctor.last_name}</strong>
                  <span>{doctor.specialty ?? "Sin especialidad"}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="row-actions">
            <button type="button" className="secondary-button" onClick={resetReceptionistForm}>
              Cancelar
            </button>
            <button type="submit">{editingReceptionistId ? "Actualizar recepcionista" : "Registrar recepcionista"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
