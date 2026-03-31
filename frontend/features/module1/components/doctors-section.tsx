"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import type { ICellRendererParams } from "ag-grid-community";

import { ClinicalDataGrid, type ClinicalGridColumn } from "@/features/module1/components/clinical-data-grid";
import { DateField, PhoneField, RequiredLabel } from "@/features/module1/components/form-fields";
import type { DoctorAdminForm, DoctorClinicForm, DoctorInviteForm } from "@/features/module1/clinical-console-defaults";
import { formatDate } from "@/features/module1/console-utils";
import { formatPhoneForDisplay } from "@/features/module1/phone-utils";
import type { Doctor } from "@/features/module1/types";

const DoctorClinicMapPicker = dynamic(
  () => import("@/features/module1/components/doctor-clinic-map-picker").then((mod) => mod.DoctorClinicMapPicker),
  { ssr: false },
);

type DoctorRosterTab = "activos" | "inactivos";

type DoctorsSectionProps = {
  activeDoctors: Doctor[];
  activePager: React.ReactNode;
  doctorAdminForm: DoctorAdminForm;
  doctorDirectorySearch: string;
  doctorInviteForm: DoctorInviteForm;
  doctorRosterTab: DoctorRosterTab;
  editingDoctorId: number | null;
  filteredActiveDoctorsCount: number;
  filteredInactiveDoctorsCount: number;
  inactiveDoctors: Doctor[];
  inactivePager: React.ReactNode;
  isAdmin: boolean;
  latestInvitationUrl: string;
  paginatedActiveDoctors: Doctor[];
  paginatedInactiveDoctors: Doctor[];
  addDoctorClinic: () => void;
  openDoctorModal: () => void;
  openDoctorInviteModal: () => void;
  onDoctorDirectorySearchChange: (value: string) => void;
  removeDoctorClinic: (index: number) => void;
  resetDoctorAdminForm: () => void;
  resetDoctorInviteForm: () => void;
  setDoctorAdminForm: React.Dispatch<React.SetStateAction<DoctorAdminForm>>;
  setDoctorInviteForm: React.Dispatch<React.SetStateAction<DoctorInviteForm>>;
  setDoctorRosterTab: React.Dispatch<React.SetStateAction<DoctorRosterTab>>;
  showDoctorModal: boolean;
  showDoctorInviteModal: boolean;
  startDoctorEdit: (doctor: Doctor) => void;
  submitDoctorAdmin: (event: React.FormEvent<HTMLFormElement>) => Promise<boolean>;
  submitDoctorInvitation: (event: React.FormEvent<HTMLFormElement>) => Promise<boolean>;
  toggleDoctorActive: (doctor: Doctor) => void;
  updateDoctorClinic: (index: number, field: keyof DoctorClinicForm, value: string | boolean) => void;
};

export function DoctorsSection({
  activeDoctors,
  activePager,
  doctorAdminForm,
  doctorDirectorySearch,
  doctorInviteForm,
  doctorRosterTab,
  editingDoctorId,
  filteredActiveDoctorsCount,
  filteredInactiveDoctorsCount,
  inactiveDoctors,
  inactivePager,
  isAdmin,
  latestInvitationUrl,
  paginatedActiveDoctors,
  paginatedInactiveDoctors,
  addDoctorClinic,
  openDoctorModal,
  openDoctorInviteModal,
  onDoctorDirectorySearchChange,
  removeDoctorClinic,
  resetDoctorAdminForm,
  resetDoctorInviteForm,
  setDoctorAdminForm,
  setDoctorInviteForm,
  setDoctorRosterTab,
  showDoctorModal,
  showDoctorInviteModal,
  startDoctorEdit,
  submitDoctorAdmin,
  submitDoctorInvitation,
  toggleDoctorActive,
  updateDoctorClinic,
}: DoctorsSectionProps) {
  if (!isAdmin) {
    return null;
  }

  const normalizedSearch = doctorDirectorySearch.trim().toLowerCase();
  const filteredActiveDoctors = useMemo(() => {
    if (!normalizedSearch) {
      return activeDoctors;
    }
    return activeDoctors.filter((doctor) =>
      `${doctor.first_name} ${doctor.last_name} ${doctor.specialty ?? ""} ${doctor.linked_user_email ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [activeDoctors, normalizedSearch]);
  const filteredInactiveDoctors = useMemo(() => {
    if (!normalizedSearch) {
      return inactiveDoctors;
    }
    return inactiveDoctors.filter((doctor) =>
      `${doctor.first_name} ${doctor.last_name} ${doctor.specialty ?? ""} ${doctor.linked_user_email ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [inactiveDoctors, normalizedSearch]);
  const doctorColumns = useMemo<ClinicalGridColumn<Doctor>[]>(
    () => [
      {
        headerName: "Doctor",
        minWidth: 220,
        flex: 1.2,
        valueGetter: ({ data }) => (data ? `${data.first_name} ${data.last_name}` : ""),
        exportValue: (row) => `${row.first_name} ${row.last_name}`,
      },
      {
        headerName: "Especialidad",
        field: "specialty",
        minWidth: 180,
        exportValue: (row) => row.specialty ?? "Sin especialidad",
      },
      {
        headerName: "Nacimiento",
        minWidth: 150,
        valueGetter: ({ data }) => (data?.date_of_birth ? formatDate(data.date_of_birth) : "No registrado"),
        exportValue: (row) => (row.date_of_birth ? formatDate(row.date_of_birth) : "No registrado"),
      },
      {
        headerName: "Teléfono",
        minWidth: 160,
        valueGetter: ({ data }) => formatPhoneForDisplay(data?.phone_numbers?.find((phone) => phone.is_primary)?.phone_number),
        exportValue: (row) => formatPhoneForDisplay(row.phone_numbers?.find((phone) => phone.is_primary)?.phone_number),
      },
      {
        headerName: "Correo",
        field: "linked_user_email",
        minWidth: 220,
        exportValue: (row) => row.linked_user_email ?? "Sin usuario de acceso",
      },
      {
        headerName: "Clínicas",
        minWidth: 260,
        flex: 1.4,
        valueGetter: ({ data }) =>
          data?.clinics?.length ? data.clinics.map((clinic) => clinic.clinic_name).join(" · ") : "Sin clínicas registradas",
        exportValue: (row) => (row.clinics?.length ? row.clinics.map((clinic) => clinic.clinic_name).join(" · ") : "Sin clínicas registradas"),
      },
      {
        headerName: "Acciones",
        minWidth: 200,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<Doctor>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              <button type="button" className="secondary-button" onClick={() => startDoctorEdit(data)}>
                Editar
              </button>
              <button type="button" className={data.is_active ? "danger-button" : "success-button"} onClick={() => toggleDoctorActive(data)}>
                {data.is_active ? "Desactivar" : "Activar"}
              </button>
            </div>
          ) : null;
        },
      },
    ],
    [startDoctorEdit, toggleDoctorActive],
  );

  return (
    <section className="tab-layout">
      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Equipo clínico</p>
            <h2>Doctores</h2>
          </div>
          <div className="row-actions">
            <button type="button" className="secondary-button" onClick={openDoctorInviteModal}>
              Invitar doctor
            </button>
            <button type="button" className="success-button" onClick={openDoctorModal}>
              Agregar doctor
            </button>
          </div>
        </div>
        {latestInvitationUrl ? (
          <div className="inline-banner">
            <strong>Último enlace de onboarding:</strong>
            <span>{latestInvitationUrl}</span>
          </div>
        ) : null}
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
            <ClinicalDataGrid<Doctor>
              columns={doctorColumns}
              emptyMessage="No hay doctores activos para ese filtro."
              exportFileName="doctores-activos"
              quickFilter={doctorDirectorySearch}
              rowData={filteredActiveDoctors}
            />
          </>
        ) : (
          <>
            <ClinicalDataGrid<Doctor>
              columns={doctorColumns}
              emptyMessage="No hay doctores inactivos para ese filtro."
              exportFileName="doctores-inactivos"
              quickFilter={doctorDirectorySearch}
              rowData={filteredInactiveDoctors}
            />
          </>
        )}
      </article>

      {showDoctorModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card doctor-modal-card">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Equipo clínico</p>
                <h2>{editingDoctorId ? "Editar doctor" : "Registrar doctor"}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={resetDoctorAdminForm}>
                Cerrar
              </button>
            </div>
            <form
              className="form-card compact-form"
              onSubmit={async (event) => {
                const saved = await submitDoctorAdmin(event);
                if (saved) {
                  resetDoctorAdminForm();
                }
              }}
            >
              <div className="three-column-grid">
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
                <label>
                  <span>Trato profesional</span>
                  <input
                    value={doctorAdminForm.doctor_title}
                    onChange={(event) => setDoctorAdminForm((current) => ({ ...current, doctor_title: event.target.value }))}
                    placeholder="Dr."
                  />
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
                <div className="doctor-clinic-grid">
                  {doctorAdminForm.clinics.map((clinic, index) => (
                    <div className="doctor-clinic-card" key={`doctor-clinic-form-${index}`}>
                      <div className="doctor-clinic-card-header">
                        <strong>Clínica {index + 1}</strong>
                        <button type="button" className="danger-button" onClick={() => removeDoctorClinic(index)}>
                          Quitar
                        </button>
                      </div>
                      <div className="stacked-fields">
                        <label>
                          <span>Nombre de clínica</span>
                          <input value={clinic.clinic_name} onChange={(event) => updateDoctorClinic(index, "clinic_name", event.target.value)} />
                        </label>
                        <label>
                          <span>Teléfono</span>
                          <input value={clinic.phone_number} onChange={(event) => updateDoctorClinic(index, "phone_number", event.target.value)} />
                        </label>
                        <label className="span-two">
                          <span>Dirección</span>
                          <input value={clinic.address} onChange={(event) => updateDoctorClinic(index, "address", event.target.value)} />
                        </label>
                        <div className="span-two">
                          <DoctorClinicMapPicker
                            address={clinic.address}
                            latitude={clinic.latitude}
                            longitude={clinic.longitude}
                            onAddressChange={(nextAddress) => updateDoctorClinic(index, "address", nextAddress)}
                            onChange={(coordinates) => {
                              updateDoctorClinic(index, "latitude", coordinates.latitude);
                              updateDoctorClinic(index, "longitude", coordinates.longitude);
                            }}
                          />
                        </div>
                        <label>
                          <span>Latitud Maps</span>
                          <input
                            inputMode="decimal"
                            placeholder="14.6349"
                            value={clinic.latitude}
                            onChange={(event) => updateDoctorClinic(index, "latitude", event.target.value)}
                          />
                        </label>
                        <label>
                          <span>Longitud Maps</span>
                          <input
                            inputMode="decimal"
                            placeholder="-90.5069"
                            value={clinic.longitude}
                            onChange={(event) => updateDoctorClinic(index, "longitude", event.target.value)}
                          />
                        </label>
                        <label className="span-two">
                          <span>Notas</span>
                          <input value={clinic.notes} onChange={(event) => updateDoctorClinic(index, "notes", event.target.value)} />
                        </label>
                      </div>
                      <label className="inline-check">
                        <input
                          type="checkbox"
                          checked={clinic.is_primary}
                          onChange={(event) => updateDoctorClinic(index, "is_primary", event.target.checked)}
                        />
                        <span>Sede principal</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={resetDoctorAdminForm}>
                  Cancelar
                </button>
                <button type="submit">{editingDoctorId ? "Actualizar doctor" : "Registrar doctor"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showDoctorInviteModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card doctor-modal-card">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Equipo clínico</p>
                <h2>Invitar doctor</h2>
              </div>
              <button type="button" className="secondary-button" onClick={resetDoctorInviteForm}>
                Cerrar
              </button>
            </div>
            <form
              className="form-card compact-form"
              onSubmit={async (event) => {
                const saved = await submitDoctorInvitation(event);
                if (saved) {
                  resetDoctorInviteForm();
                }
              }}
            >
              <p className="empty-state">
                El administrador solo registra nombre, correo y teléfono. El doctor completará el resto desde un enlace único.
              </p>
              <div className="three-column-grid">
                <label className="span-two">
                  <RequiredLabel>Nombre del doctor</RequiredLabel>
                  <input
                    value={doctorInviteForm.full_name}
                    onChange={(event) => setDoctorInviteForm((current) => ({ ...current, full_name: event.target.value }))}
                    placeholder="Nombre y apellido"
                    required
                  />
                </label>
                <label>
                  <RequiredLabel>Correo</RequiredLabel>
                  <input
                    type="email"
                    value={doctorInviteForm.email}
                    onChange={(event) => setDoctorInviteForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="doctor@correo.com"
                    required
                  />
                </label>
                <PhoneField
                  label="Teléfono"
                  value={doctorInviteForm.phone_number}
                  onChange={(nextValue) => setDoctorInviteForm((current) => ({ ...current, phone_number: nextValue }))}
                  placeholder="58420737"
                />
              </div>
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={resetDoctorInviteForm}>
                  Cancelar
                </button>
                <button type="submit">Enviar invitación</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
