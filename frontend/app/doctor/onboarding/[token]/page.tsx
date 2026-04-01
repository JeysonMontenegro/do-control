"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DateField, PhoneField, SearchableSelect, type SearchableSelectOption } from "@/features/module1/components/form-fields";
import { DoctorClinicMapPicker } from "@/features/module1/components/doctor-clinic-map-picker";
import { emptyDoctorClinic } from "@/features/module1/clinical-console-defaults";
import { formatPhoneForDisplay } from "@/features/module1/phone-utils";
import type { DoctorOnboardingCompleteResponse, DoctorOnboardingToken } from "@/features/module1/types";
import { apiGet, apiPost, apiPostForm } from "@/lib/api";

type OnboardingClinicForm = ReturnType<typeof emptyDoctorClinic>;

type OnboardingForm = {
  first_name: string;
  last_name: string;
  gender: string;
  doctor_title: string;
  date_of_birth: string;
  specialty: string;
  license_number: string;
  password: string;
  confirm_password: string;
  clinics: OnboardingClinicForm[];
};

const genderOptions: SearchableSelectOption[] = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
];

const doctorTitleOptions: SearchableSelectOption[] = [
  { value: "Dr.", label: "Dr." },
  { value: "Dra.", label: "Dra." },
  { value: "Lic.", label: "Lic." },
];

function createOnboardingForm(tokenData?: DoctorOnboardingToken | null): OnboardingForm {
  return {
    first_name: tokenData?.first_name ?? "",
    last_name: tokenData?.last_name ?? "",
    gender: "",
    doctor_title: "",
    date_of_birth: "",
    specialty: "",
    license_number: "",
    password: "",
    confirm_password: "",
    clinics: [{ ...emptyDoctorClinic(), is_primary: true }],
  };
}

function formatDateTimeForDoctor(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function suggestedDoctorTitle(gender: string) {
  if (gender === "female") {
    return "Dra.";
  }
  if (gender === "male") {
    return "Dr.";
  }
  return "Dr.";
}

export default function DoctorOnboardingPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";

  const [tokenData, setTokenData] = useState<DoctorOnboardingToken | null>(null);
  const [form, setForm] = useState<OnboardingForm>(() => createOnboardingForm());
  const [status, setStatus] = useState<"loading" | "ready" | "invalid" | "success">("loading");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<DoctorOnboardingCompleteResponse | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setMessage("El enlace de registro no es válido.");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setMessage("");

    apiGet<DoctorOnboardingToken>(`/api/doctor-onboarding/validate?token=${encodeURIComponent(token)}`)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setTokenData(payload);
        setForm(createOnboardingForm(payload));
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setStatus("invalid");
        setMessage(error instanceof Error ? error.message : "No se pudo validar el enlace.");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const stepTitles = useMemo(
    () => ["Tu identidad", "Perfil profesional", "Clínicas y acceso"],
    [],
  );

  const selectedTitleFallback = suggestedDoctorTitle(form.gender);
  const passwordChecks = useMemo(
    () => [
      { label: "Mínimo 8 caracteres", ok: form.password.length >= 8 },
      { label: "Incluye al menos una letra", ok: /[A-Za-z]/.test(form.password) },
      { label: "Incluye al menos un número", ok: /\d/.test(form.password) },
      { label: "La confirmación coincide", ok: !!form.confirm_password && form.password === form.confirm_password },
    ],
    [form.confirm_password, form.password],
  );

  useEffect(() => {
    setForm((current) => {
      if (current.doctor_title.trim()) {
        return current;
      }
      return {
        ...current,
        doctor_title: suggestedDoctorTitle(current.gender),
      };
    });
  }, [form.gender]);

  const uploadPhoto = async (file: File | null) => {
    if (!file) {
      return;
    }
    setIsUploadingPhoto(true);
    setMessage("");
    try {
      const payload = new FormData();
      payload.set("token", token);
      payload.set("file", file);
      const updated = await apiPostForm<DoctorOnboardingToken>("/api/doctor-onboarding/photo", payload);
      setTokenData(updated);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la foto.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const updateClinic = (index: number, field: keyof OnboardingClinicForm, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      clinics: current.clinics.map((clinic, clinicIndex) =>
        clinicIndex === index
          ? {
              ...clinic,
              [field]: value,
            }
          : clinic,
      ),
    }));
  };

  const setPrimaryClinic = (index: number) => {
    setForm((current) => ({
      ...current,
      clinics: current.clinics.map((clinic, clinicIndex) => ({
        ...clinic,
        is_primary: clinicIndex === index,
      })),
    }));
  };

  const addClinic = () => {
    setForm((current) => ({
      ...current,
      clinics: [...current.clinics, { ...emptyDoctorClinic(), is_primary: current.clinics.length === 0 }],
    }));
  };

  const removeClinic = (index: number) => {
    setForm((current) => {
      const nextClinics = current.clinics.filter((_, clinicIndex) => clinicIndex !== index);
      if (!nextClinics.length) {
        return { ...current, clinics: [{ ...emptyDoctorClinic(), is_primary: true }] };
      }
      if (!nextClinics.some((clinic) => clinic.is_primary)) {
        nextClinics[0] = { ...nextClinics[0], is_primary: true };
      }
      return { ...current, clinics: nextClinics };
    });
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!form.first_name.trim() || !form.last_name.trim()) {
        return "Completa nombre y apellido para continuar.";
      }
      return "";
    }
    if (step === 1) {
      if (!form.specialty.trim()) {
        return "Indica tu especialidad para continuar.";
      }
      return "";
    }
    const clinicsWithName = form.clinics.filter((clinic) => clinic.clinic_name.trim());
    if (!clinicsWithName.length) {
      return "Agrega al menos una clínica con nombre.";
    }
    if (!form.password.trim() || form.password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }
    if (form.password !== form.confirm_password) {
      return "La confirmación de contraseña no coincide.";
    }
    return "";
  };

  const goToNextStep = () => {
    const error = validateStep(currentStep);
    if (error) {
      setMessage(error);
      return;
    }
    setMessage("");
    setCurrentStep((current) => Math.min(current + 1, stepTitles.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToPreviousStep = () => {
    setMessage("");
    setCurrentStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const error = validateStep(stepTitles.length - 1);
    if (error) {
      setMessage(error);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const payload = await apiPost<DoctorOnboardingCompleteResponse>("/api/doctor-onboarding/complete", {
        token,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender || null,
        doctor_title: (form.doctor_title || selectedTitleFallback).trim(),
        date_of_birth: form.date_of_birth || null,
        specialty: form.specialty.trim() || null,
        license_number: form.license_number.trim() || null,
        password: form.password,
        clinics: form.clinics
          .filter((clinic) => clinic.clinic_name.trim())
          .map((clinic) => ({
            clinic_name: clinic.clinic_name.trim(),
            address: clinic.address.trim() || null,
            latitude: clinic.latitude.trim() ? Number(clinic.latitude) : null,
            longitude: clinic.longitude.trim() ? Number(clinic.longitude) : null,
            phone_number: clinic.phone_number.trim() || null,
            notes: clinic.notes.trim() || null,
            is_primary: clinic.is_primary,
          })),
      });
      setResult(payload);
      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar tu registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="doctor-onboarding-page">
        <section className="doctor-onboarding-shell doctor-onboarding-card">
          <div className="doctor-onboarding-hero">
            <span className="doctor-onboarding-eyebrow">Registro médico</span>
            <h1>Estamos preparando tu acceso</h1>
            <p>Validando tu invitación para completar el perfil profesional.</p>
          </div>
        </section>
      </main>
    );
  }

  if (status === "invalid") {
    return (
      <main className="doctor-onboarding-page">
        <section className="doctor-onboarding-shell doctor-onboarding-card">
          <div className="doctor-onboarding-hero">
            <span className="doctor-onboarding-eyebrow">Enlace no disponible</span>
            <h1>No pudimos abrir tu registro</h1>
            <p>{message || "El enlace ya venció, ya fue utilizado o no es válido."}</p>
          </div>
          <div className="doctor-onboarding-actions">
            <Link className="secondary-button" href="/">
              Volver a do-control
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (status === "success" && result) {
    return (
      <main className="doctor-onboarding-page">
        <section className="doctor-onboarding-shell doctor-onboarding-card">
          <div className="doctor-onboarding-hero">
            <span className="doctor-onboarding-eyebrow">Registro completado</span>
            <h1>Tu acceso ya está listo</h1>
            <p>
              Activamos tu cuenta para <strong>{result.email}</strong>. Ya puedes entrar a do-control con la contraseña que acabas de definir.
            </p>
          </div>
          <div className="doctor-onboarding-summary-grid">
            <div>
              <strong>Cuenta activada</strong>
              <span>Tu perfil médico quedó listo para iniciar sesión.</span>
            </div>
            <div>
              <strong>Próximo paso</strong>
              <span>Ingresa a la plataforma y revisa tu agenda, pacientes y configuración clínica.</span>
            </div>
          </div>
          <div className="doctor-onboarding-actions">
            <Link className="primary-button" href="/">
              Ir a do-control
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="doctor-onboarding-page">
      <section className="doctor-onboarding-shell">
        <div className="doctor-onboarding-hero">
          <span className="doctor-onboarding-eyebrow">Invitación médica</span>
          <h1>Completa tu registro en do-control</h1>
          <p>
            Este acceso fue creado para <strong>{tokenData?.email}</strong>. Completa tu perfil profesional una sola vez y deja lista tu cuenta.
          </p>
        </div>

        <div className="doctor-onboarding-progress">
          {stepTitles.map((stepTitle, index) => (
            <div key={stepTitle} className={`doctor-onboarding-step${index === currentStep ? " is-current" : ""}${index < currentStep ? " is-complete" : ""}`}>
              <span>{index + 1}</span>
              <strong>{stepTitle}</strong>
            </div>
          ))}
        </div>

        <section className="doctor-onboarding-card">
          <div className="doctor-onboarding-header-row">
            <div>
              <h2>{stepTitles[currentStep]}</h2>
              <p>Vence el {tokenData ? formatDateTimeForDoctor(tokenData.expires_at) : "pronto"} y el enlace solo funciona una vez.</p>
            </div>
            <div className="doctor-onboarding-meta">
              <span>{formatPhoneForDisplay(tokenData?.phone_number)}</span>
              <span>{tokenData?.email}</span>
            </div>
          </div>

          {message ? <div className="inline-banner inline-banner-danger"><strong>Revisa esto</strong><span>{message}</span></div> : null}

          {currentStep === 0 ? (
            <div className="doctor-onboarding-grid">
              <div className="doctor-onboarding-photo-card doctor-onboarding-grid-wide">
                <div className="doctor-onboarding-photo-preview">
                  {tokenData?.profile_photo_url ? (
                    <img src={tokenData.profile_photo_url} alt="Foto profesional" />
                  ) : (
                    <div className="doctor-onboarding-photo-placeholder">
                      {form.first_name.trim().slice(0, 1) || tokenData?.first_name.slice(0, 1) || "D"}
                    </div>
                  )}
                </div>
                <div className="doctor-onboarding-photo-copy">
                  <strong>Foto profesional</strong>
                  <span>Sube una imagen clara para que tu perfil médico quede completo desde el primer ingreso.</span>
                  <label className="secondary-button doctor-onboarding-upload-button">
                    <input
                      type="file"
                      accept="image/*"
                      name="doctor_onboarding_profile_photo"
                      onChange={(event) => void uploadPhoto(event.target.files?.[0] ?? null)}
                    />
                    {isUploadingPhoto ? "Subiendo foto..." : tokenData?.profile_photo_url ? "Cambiar foto" : "Subir foto"}
                  </label>
                </div>
              </div>
              <label>
                <span>Nombre</span>
                <input
                  id="doctor-onboarding-first-name"
                  name="doctor_onboarding_first_name"
                  value={form.first_name}
                  onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
                  placeholder="Nombre"
                />
              </label>
              <label>
                <span>Apellido</span>
                <input
                  id="doctor-onboarding-last-name"
                  name="doctor_onboarding_last_name"
                  value={form.last_name}
                  onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
                  placeholder="Apellido"
                />
              </label>
              <PhoneField
                id="doctor-onboarding-phone"
                name="doctor_onboarding_phone"
                label="Teléfono"
                value={tokenData?.phone_number ?? ""}
                onChange={() => undefined}
              />
              <label>
                <span>Correo</span>
                <input id="doctor-onboarding-email" name="doctor_onboarding_email" value={tokenData?.email ?? ""} readOnly />
              </label>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="doctor-onboarding-grid">
              <label>
                <span>Especialidad</span>
                <input
                  id="doctor-onboarding-specialty"
                  name="doctor_onboarding_specialty"
                  value={form.specialty}
                  onChange={(event) => setForm((current) => ({ ...current, specialty: event.target.value }))}
                  placeholder="Ej. Medicina interna"
                />
              </label>
              <label>
                <span>Número de colegiado o licencia</span>
                <input
                  id="doctor-onboarding-license"
                  name="doctor_onboarding_license"
                  value={form.license_number}
                  onChange={(event) => setForm((current) => ({ ...current, license_number: event.target.value }))}
                  placeholder="Colegiado o licencia"
                />
              </label>
              <label>
                <span>Trato profesional</span>
                <SearchableSelect
                  id="doctor-onboarding-title"
                  name="doctor_onboarding_title"
                  options={doctorTitleOptions}
                  placeholder="Selecciona el trato"
                  value={form.doctor_title}
                  onChange={(nextValue) => setForm((current) => ({ ...current, doctor_title: nextValue }))}
                />
              </label>
              <label>
                <span>Género</span>
                <SearchableSelect
                  id="doctor-onboarding-gender"
                  name="doctor_onboarding_gender"
                  options={genderOptions}
                  placeholder="Selecciona el género"
                  value={form.gender}
                  onChange={(nextValue) => setForm((current) => ({ ...current, gender: nextValue }))}
                />
              </label>
              <DateField
                id="doctor-onboarding-birth-date"
                name="doctor_onboarding_birth_date"
                label="Fecha de nacimiento"
                value={form.date_of_birth}
                onChange={(nextValue) => setForm((current) => ({ ...current, date_of_birth: nextValue }))}
              />
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="doctor-onboarding-stack">
              <div className="doctor-onboarding-section-copy">
                <strong>Clínicas donde atiendes</strong>
                <span>Puedes registrar una o varias clínicas. Marca una como principal para usarla como referencia por defecto.</span>
              </div>

              {form.clinics.map((clinic, index) => (
                <section key={`clinic-${index}`} className="doctor-onboarding-clinic-card">
                  <div className="doctor-onboarding-clinic-header">
                    <div>
                      <strong>Clínica {index + 1}</strong>
                      <span>{clinic.is_primary ? "Clínica principal" : "Clínica adicional"}</span>
                    </div>
                    <div className="doctor-onboarding-actions">
                      {!clinic.is_primary ? (
                        <button type="button" className="secondary-button compact-action-button" onClick={() => setPrimaryClinic(index)}>
                          Marcar principal
                        </button>
                      ) : null}
                      {form.clinics.length > 1 ? (
                        <button type="button" className="danger-button compact-action-button" onClick={() => removeClinic(index)}>
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="doctor-onboarding-grid">
                    <label>
                      <span>Nombre de la clínica</span>
                      <input
                        id={`doctor-onboarding-clinic-name-${index}`}
                        name={`doctor_onboarding_clinic_name_${index}`}
                        value={clinic.clinic_name}
                        onChange={(event) => updateClinic(index, "clinic_name", event.target.value)}
                        placeholder="Ej. Clínica zona 10"
                      />
                    </label>
                    <PhoneField
                      id={`doctor-onboarding-clinic-phone-${index}`}
                      name={`doctor_onboarding_clinic_phone_${index}`}
                      label="Teléfono de la clínica"
                      value={clinic.phone_number}
                      onChange={(nextValue) => updateClinic(index, "phone_number", nextValue)}
                    />
                    <label className="doctor-onboarding-grid-wide">
                      <span>Dirección</span>
                      <textarea
                        id={`doctor-onboarding-clinic-address-${index}`}
                        name={`doctor_onboarding_clinic_address_${index}`}
                        rows={3}
                        value={clinic.address}
                        onChange={(event) => updateClinic(index, "address", event.target.value)}
                        placeholder="Dirección exacta para que el paciente llegue sin dudas"
                      />
                    </label>
                    <label>
                      <span>Latitud</span>
                      <input
                        id={`doctor-onboarding-clinic-latitude-${index}`}
                        name={`doctor_onboarding_clinic_latitude_${index}`}
                        value={clinic.latitude}
                        onChange={(event) => updateClinic(index, "latitude", event.target.value)}
                        placeholder="14.000000"
                      />
                    </label>
                    <label>
                      <span>Longitud</span>
                      <input
                        id={`doctor-onboarding-clinic-longitude-${index}`}
                        name={`doctor_onboarding_clinic_longitude_${index}`}
                        value={clinic.longitude}
                        onChange={(event) => updateClinic(index, "longitude", event.target.value)}
                        placeholder="-90.000000"
                      />
                    </label>
                    <label className="doctor-onboarding-grid-wide">
                      <span>Notas de acceso</span>
                      <textarea
                        id={`doctor-onboarding-clinic-notes-${index}`}
                        name={`doctor_onboarding_clinic_notes_${index}`}
                        rows={2}
                        value={clinic.notes}
                        onChange={(event) => updateClinic(index, "notes", event.target.value)}
                        placeholder="Ej. Nivel 3, oficina 304, parqueo en sótano 2"
                      />
                    </label>
                  </div>

                  <DoctorClinicMapPicker
                    address={clinic.address}
                    latitude={clinic.latitude}
                    longitude={clinic.longitude}
                    onAddressChange={(address) => updateClinic(index, "address", address)}
                    onChange={(coordinates) => {
                      updateClinic(index, "latitude", coordinates.latitude);
                      updateClinic(index, "longitude", coordinates.longitude);
                    }}
                  />
                </section>
              ))}

              <div className="doctor-onboarding-actions">
                <button type="button" className="secondary-button" onClick={addClinic}>
                  Agregar otra clínica
                </button>
              </div>

              <div className="doctor-onboarding-section-copy">
                <strong>Contraseña para entrar</strong>
                <span>Esta será la contraseña con la que entrarás a do-control a partir de ahora.</span>
              </div>

              <div className="doctor-onboarding-grid">
                <label>
                  <span>Contraseña</span>
                  <input
                    id="doctor-onboarding-password"
                    name="doctor_onboarding_password"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                  />
                </label>
                <label>
                  <span>Confirmar contraseña</span>
                  <input
                    id="doctor-onboarding-confirm-password"
                    name="doctor_onboarding_confirm_password"
                    type="password"
                    value={form.confirm_password}
                    onChange={(event) => setForm((current) => ({ ...current, confirm_password: event.target.value }))}
                    placeholder="Repite la contraseña"
                  />
                </label>
              </div>

              <div className="doctor-onboarding-password-checks">
                {passwordChecks.map((check) => (
                  <div key={check.label} className={`doctor-onboarding-password-check${check.ok ? " is-ok" : ""}`}>
                    <span>{check.ok ? "OK" : "•"}</span>
                    <strong>{check.label}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="doctor-onboarding-actions doctor-onboarding-actions-between">
            <div>
              {currentStep > 0 ? (
                <button type="button" className="secondary-button" onClick={goToPreviousStep}>
                  Anterior
                </button>
              ) : null}
            </div>
            <div className="doctor-onboarding-actions">
              {currentStep < stepTitles.length - 1 ? (
                <button type="button" className="primary-button" onClick={goToNextStep}>
                  Continuar
                </button>
              ) : (
                <button type="button" className="primary-button" onClick={submit} disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Completar registro"}
                </button>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
