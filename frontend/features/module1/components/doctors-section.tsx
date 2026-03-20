"use client";

import { DateField, PhoneField, RequiredLabel } from "@/features/module1/components/form-fields";
import { formatDate } from "@/features/module1/console-utils";
import type { Doctor } from "@/features/module1/types";

type DoctorClinicForm = {
  clinic_name: string;
  address: string;
  phone_number: string;
  notes: string;
  is_primary: boolean;
};

export type DoctorAdminForm = {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  specialty: string;
  license_number: string;
  primary_phone: string;
  user_email: string;
  user_password: string;
  clinics: DoctorClinicForm[];
};

type DoctorRosterTab = "activos" | "inactivos";

type DoctorsSectionProps = {
  activeDoctors: Doctor[];
  activePager: React.ReactNode;
  doctorAdminForm: DoctorAdminForm;
  doctorDirectorySearch: string;
  doctorRosterTab: DoctorRosterTab;
  editingDoctorId: number | null;
  filteredActiveDoctorsCount: number;
  filteredInactiveDoctorsCount: number;
  inactiveDoctors: Doctor[];
  inactivePager: React.ReactNode;
  isAdmin: boolean;
  paginatedActiveDoctors: Doctor[];
  paginatedInactiveDoctors: Doctor[];
  addDoctorClinic: () => void;
  onDoctorDirectorySearchChange: (value: string) => void;
  removeDoctorClinic: (index: number) => void;
  resetDoctorAdminForm: () => void;
  setDoctorAdminForm: React.Dispatch<React.SetStateAction<DoctorAdminForm>>;
  setDoctorRosterTab: React.Dispatch<React.SetStateAction<DoctorRosterTab>>;
  startDoctorEdit: (doctor: Doctor) => void;
  submitDoctorAdmin: (event: React.FormEvent<HTMLFormElement>) => void;
  toggleDoctorActive: (doctor: Doctor) => void;
  updateDoctorClinic: (index: number, field: keyof DoctorClinicForm, value: string | boolean) => void;
};

export function DoctorsSection({
  activeDoctors,
  activePager,
  doctorAdminForm,
  doctorDirectorySearch,
  doctorRosterTab,
  editingDoctorId,
  filteredActiveDoctorsCount,
  filteredInactiveDoctorsCount,
  inactiveDoctors,
  inactivePager,
  isAdmin,
  paginatedActiveDoctors,
  paginatedInactiveDoctors,
  addDoctorClinic,
  onDoctorDirectorySearchChange,
  removeDoctorClinic,
  resetDoctorAdminForm,
  setDoctorAdminForm,
  setDoctorRosterTab,
  startDoctorEdit,
  submitDoctorAdmin,
  toggleDoctorActive,
  updateDoctorClinic,
}: DoctorsSectionProps) {
  if (!isAdmin) {
    return null;
  }

  return (
    <section className="tab-layout">
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Equipo clínico</p>
            <h2>{editingDoctorId ? "Editar doctor" : "Registrar doctor"}</h2>
          </div>
        </div>
        <form className="form-card compact-form" onSubmit={submitDoctorAdmin}>
          <div className="two-column-grid">
            <label>
              <RequiredLabel>Nombres</RequiredLabel>
              <input value={doctorAdminForm.first_name} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, first_name: event.target.value }))} required />
            </label>
            <label>
              <RequiredLabel>Apellidos</RequiredLabel>
              <input value={doctorAdminForm.last_name} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, last_name: event.target.value }))} required />
            </label>
            <label>
              <span>Género</span>
              <select value={doctorAdminForm.gender} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, gender: event.target.value }))}>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <DateField
              label="Fecha de nacimiento"
              value={doctorAdminForm.date_of_birth}
              onChange={(nextValue) => setDoctorAdminForm((current) => ({ ...current, date_of_birth: nextValue }))}
            />
            <PhoneField
              label="Teléfono principal"
              value={doctorAdminForm.primary_phone}
              onChange={(nextValue) => setDoctorAdminForm((current) => ({ ...current, primary_phone: nextValue }))}
              placeholder="58420737"
            />
            <label>
              <span>Especialidad</span>
              <input value={doctorAdminForm.specialty} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, specialty: event.target.value }))} />
            </label>
            <label>
              <span>Colegiado</span>
              <input value={doctorAdminForm.license_number} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, license_number: event.target.value }))} />
            </label>
            <label>
              <span>Correo de acceso</span>
              <input type="email" value={doctorAdminForm.user_email} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, user_email: event.target.value }))} disabled={editingDoctorId !== null} />
            </label>
            <label>
              <span>{editingDoctorId ? "Nueva contraseña" : "Contraseña inicial"}</span>
              <input type="password" value={doctorAdminForm.user_password} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, user_password: event.target.value }))} />
            </label>
          </div>
          <div className="stack-block">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Sedes</p>
                <h3>Clínicas del doctor</h3>
              </div>
              <button type="button" className="success-button" onClick={addDoctorClinic}>
                Agregar clínica
              </button>
            </div>
            <div className="table-list">
              {doctorAdminForm.clinics.map((clinic, index) => (
                <div className="simple-list-item" key={`doctor-clinic-form-${index}`}>
                  <div className="two-column-grid">
                    <label>
                      <span>Nombre de clínica</span>
                      <input value={clinic.clinic_name} onChange={(event) => updateDoctorClinic(index, "clinic_name", event.target.value)} />
                    </label>
                    <label>
                      <span>Teléfono</span>
                      <input value={clinic.phone_number} onChange={(event) => updateDoctorClinic(index, "phone_number", event.target.value)} />
                    </label>
                    <label>
                      <span>Dirección</span>
                      <input value={clinic.address} onChange={(event) => updateDoctorClinic(index, "address", event.target.value)} />
                    </label>
                    <label>
                      <span>Notas</span>
                      <input value={clinic.notes} onChange={(event) => updateDoctorClinic(index, "notes", event.target.value)} />
                    </label>
                  </div>
                  <div className="row-actions">
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={clinic.is_primary}
                        onChange={(event) => updateDoctorClinic(index, "is_primary", event.target.checked)}
                      />
                      <span>Sede principal</span>
                    </label>
                    <button type="button" className="danger-button" onClick={() => removeDoctorClinic(index)}>
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="row-actions">
            {editingDoctorId ? (
              <button type="button" className="secondary-button" onClick={resetDoctorAdminForm}>
                Cancelar edición
              </button>
            ) : null}
            <button type="submit">{editingDoctorId ? "Actualizar doctor" : "Registrar doctor"}</button>
          </div>
        </form>
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Equipo clínico</p>
            <h2>Listado de doctores</h2>
          </div>
        </div>
        <div className="chip-row">
          <button
            type="button"
            className={`filter-chip ${doctorRosterTab === "activos" ? "filter-chip-active" : ""}`}
            onClick={() => setDoctorRosterTab("activos")}
          >
            Activos ({activeDoctors.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${doctorRosterTab === "inactivos" ? "filter-chip-active" : ""}`}
            onClick={() => setDoctorRosterTab("inactivos")}
          >
            Inactivos ({inactiveDoctors.length})
          </button>
        </div>
        <label>
          <span>Buscar doctor</span>
          <input
            value={doctorDirectorySearch}
            onChange={(event) => onDoctorDirectorySearchChange(event.target.value)}
            placeholder="Filtrar por nombre, especialidad o correo"
          />
        </label>
        {doctorRosterTab === "activos" ? (
          <>
            <div className="table-list">
              {paginatedActiveDoctors.map((doctor) => (
                <div className="simple-list-item" key={`doctor-team-${doctor.id}`}>
                  <strong>{doctor.first_name} {doctor.last_name}</strong>
                  <span>{doctor.specialty ?? "Sin especialidad"}</span>
                  <span>{doctor.date_of_birth ? `Nacimiento: ${formatDate(doctor.date_of_birth)}` : "Nacimiento no registrado"}</span>
                  <span>{doctor.phone_numbers?.find((phone) => phone.is_primary)?.phone_number ?? "Sin teléfono"}</span>
                  <span>{doctor.linked_user_email ?? "Sin usuario de acceso"}</span>
                  <span>
                    {doctor.clinics?.length
                      ? doctor.clinics.map((clinic) => clinic.clinic_name).join(" · ")
                      : "Sin clínicas registradas"}
                  </span>
                  {doctor.clinics?.length ? (
                    <div className="detail-stack">
                      {doctor.clinics.map((clinic) => (
                        <span key={`doctor-clinic-${doctor.id}-${clinic.id}`}>
                          {clinic.is_primary ? "Principal" : "Sede"}: {clinic.clinic_name}
                          {clinic.address ? ` · ${clinic.address}` : ""}
                          {clinic.phone_number ? ` · ${clinic.phone_number}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="row-actions">
                    <button type="button" className="secondary-button" onClick={() => startDoctorEdit(doctor)}>Editar</button>
                    <button type="button" className="danger-button" onClick={() => toggleDoctorActive(doctor)}>
                      Desactivar
                    </button>
                  </div>
                </div>
              ))}
              {!filteredActiveDoctorsCount ? <p className="empty-state">No hay doctores activos para ese filtro.</p> : null}
            </div>
            {activePager}
          </>
        ) : (
          <>
            <div className="table-list">
              {paginatedInactiveDoctors.map((doctor) => (
                <div className="simple-list-item" key={`doctor-team-inactive-${doctor.id}`}>
                  <strong>{doctor.first_name} {doctor.last_name}</strong>
                  <span>{doctor.specialty ?? "Sin especialidad"}</span>
                  <span>{doctor.date_of_birth ? `Nacimiento: ${formatDate(doctor.date_of_birth)}` : "Nacimiento no registrado"}</span>
                  <span>{doctor.linked_user_email ?? "Sin usuario de acceso"}</span>
                  <span>
                    {doctor.clinics?.length
                      ? doctor.clinics.map((clinic) => clinic.clinic_name).join(" · ")
                      : "Sin clínicas registradas"}
                  </span>
                  {doctor.clinics?.length ? (
                    <div className="detail-stack">
                      {doctor.clinics.map((clinic) => (
                        <span key={`doctor-clinic-inactive-${doctor.id}-${clinic.id}`}>
                          {clinic.is_primary ? "Principal" : "Sede"}: {clinic.clinic_name}
                          {clinic.address ? ` · ${clinic.address}` : ""}
                          {clinic.phone_number ? ` · ${clinic.phone_number}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="row-actions">
                    <button type="button" className="secondary-button" onClick={() => startDoctorEdit(doctor)}>Editar</button>
                    <button type="button" className="success-button" onClick={() => toggleDoctorActive(doctor)}>Activar</button>
                  </div>
                </div>
              ))}
              {!filteredInactiveDoctorsCount ? <p className="empty-state">No hay doctores inactivos para ese filtro.</p> : null}
            </div>
            {inactivePager}
          </>
        )}
      </article>
    </section>
  );
}
