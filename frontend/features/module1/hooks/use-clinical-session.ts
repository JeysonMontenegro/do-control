"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  createLoginForm,
  createProfileForm,
} from "@/features/module1/clinical-console-defaults";
import { API_URL, apiGet, apiPatch } from "@/lib/api";
import { normalizePhoneWithDefaultCountry, DEFAULT_COUNTRY_DIAL_CODE } from "@/features/module1/phone-utils";
import {
  clearStoredSession,
  persistLoginSession,
  persistProfilePhoto,
  persistProfileSession,
  readStoredSession,
} from "@/features/module1/session-storage";
import type { AuthProfile, LoginResponse } from "@/features/module1/types";

type UseClinicalSessionParams = {
  recaptchaSiteKey: string;
  setMessage: (message: string) => void;
  onLogout: () => void;
};

export function useClinicalSession({ recaptchaSiteKey, setMessage, onLogout }: UseClinicalSessionParams) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserFirstName, setCurrentUserFirstName] = useState("");
  const [currentUserLastName, setCurrentUserLastName] = useState("");
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string | null>(null);
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);
  const [currentUserPhoneNumber, setCurrentUserPhoneNumber] = useState<string | null>(null);
  const [currentUserProfilePhotoUrl, setCurrentUserProfilePhotoUrl] = useState<string | null>(null);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [loginForm, setLoginForm] = useState(createLoginForm);
  const [profileForm, setProfileForm] = useState(() => createProfileForm());
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

  useEffect(() => {
    const storedSession = readStoredSession();
    if (storedSession.token) {
      setIsAuthenticated(true);
    }
    setCurrentUserEmail(storedSession.email);
    setCurrentUserFirstName(storedSession.firstName);
    setCurrentUserLastName(storedSession.lastName);
    setCurrentUserDisplayName(storedSession.displayName);
    setCurrentUserGender(storedSession.gender);
    setCurrentUserPhoneNumber(storedSession.phoneNumber);
    setCurrentUserProfilePhotoUrl(storedSession.profilePhotoUrl);
    setCurrentRoles(storedSession.roles);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function refreshProfile() {
      try {
        const profile = await apiGet<AuthProfile>("/api/auth/me");
        setCurrentUserEmail(profile.user_email);
        setCurrentUserFirstName(profile.first_name);
        setCurrentUserLastName(profile.last_name);
        setCurrentUserDisplayName(profile.display_name ?? null);
        setCurrentUserGender(profile.gender ?? null);
        setCurrentUserPhoneNumber(profile.phone_number ?? null);
        setCurrentUserProfilePhotoUrl(profile.profile_photo_url ?? null);
        setCurrentRoles(profile.roles);
        persistProfileSession(profile);
      } catch {
        // Leave the locally restored session state in place if profile refresh fails.
      }
    }

    refreshProfile();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const defaultPhone =
      (currentRoles.includes("admin") || currentRoles.includes("doctor")) && !currentUserPhoneNumber
        ? DEFAULT_COUNTRY_DIAL_CODE
        : currentUserPhoneNumber ?? "";

    setProfileForm((current) => ({
      ...current,
      first_name: currentUserFirstName,
      last_name: currentUserLastName,
      display_name: currentUserDisplayName ?? "",
      gender: currentUserGender ?? "",
      phone_number: defaultPhone,
    }));
  }, [
    currentUserDisplayName,
    currentUserFirstName,
    currentUserGender,
    currentUserLastName,
    currentUserPhoneNumber,
    currentRoles,
    isAuthenticated,
  ]);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      let recaptchaToken: string | null = null;
      if (recaptchaSiteKey) {
        if (!window.grecaptcha) {
          throw new Error("reCAPTCHA no está listo todavía. Intenta de nuevo.");
        }
        recaptchaToken = await new Promise<string>((resolve, reject) => {
          window.grecaptcha?.ready(() => {
            window.grecaptcha
              ?.execute(recaptchaSiteKey, { action: "login" })
              .then(resolve)
              .catch(() => reject(new Error("No se pudo validar reCAPTCHA.")));
          });
        });
      }

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...loginForm,
          recaptcha_token: recaptchaToken,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as LoginResponse;
      persistLoginSession(payload);
      setIsAuthenticated(true);
      setCurrentUserEmail(payload.user_email);
      setCurrentUserFirstName(payload.first_name);
      setCurrentUserLastName(payload.last_name);
      setCurrentUserDisplayName(payload.display_name ?? null);
      setCurrentUserGender(payload.gender ?? null);
      setCurrentUserPhoneNumber(payload.phone_number ?? null);
      setCurrentUserProfilePhotoUrl(payload.profile_photo_url ?? null);
      setProfileForm({
        ...createProfileForm(payload.phone_number ?? ""),
        first_name: payload.first_name,
        last_name: payload.last_name,
        display_name: payload.display_name ?? "",
        gender: payload.gender ?? "",
      });
      setCurrentRoles(payload.roles);
      setMessage(`Sesión iniciada como ${payload.first_name} ${payload.last_name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    }
  }

  function logout() {
    clearStoredSession();
    setIsAuthenticated(false);
    setCurrentUserEmail("");
    setCurrentUserFirstName("");
    setCurrentUserLastName("");
    setCurrentUserDisplayName(null);
    setCurrentUserGender(null);
    setCurrentUserPhoneNumber(null);
    setCurrentUserProfilePhotoUrl(null);
    setProfileForm(createProfileForm());
    setProfilePhotoFile(null);
    setCurrentRoles([]);
    onLogout();
    setMessage("Sesión cerrada.");
  }

  async function updateCurrentProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      if (profileForm.new_password && profileForm.new_password !== profileForm.confirm_new_password) {
        throw new Error("La nueva contraseña y su confirmación no coinciden.");
      }

      const profile = await apiPatch<AuthProfile>("/api/auth/me", {
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        display_name: profileForm.display_name.trim() || null,
        gender: profileForm.gender || null,
        phone_number: profileForm.phone_number.trim() ? normalizePhoneWithDefaultCountry(profileForm.phone_number) : null,
        current_password: profileForm.current_password || null,
        new_password: profileForm.new_password || null,
      });

      setCurrentUserFirstName(profile.first_name);
      setCurrentUserLastName(profile.last_name);
      setCurrentUserDisplayName(profile.display_name ?? null);
      setCurrentUserGender(profile.gender ?? null);
      setCurrentUserPhoneNumber(profile.phone_number ?? null);
      setCurrentUserProfilePhotoUrl(profile.profile_photo_url ?? null);
      setProfileForm((current) => ({
        ...current,
        first_name: profile.first_name,
        last_name: profile.last_name,
        display_name: profile.display_name ?? "",
        gender: profile.gender ?? "",
        phone_number: profile.phone_number ?? "",
        current_password: "",
        new_password: "",
        confirm_new_password: "",
      }));
      persistProfileSession(profile);
      setMessage("Perfil actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
    }
  }

  async function uploadCurrentProfilePhoto() {
    if (!profilePhotoFile) {
      setMessage("Selecciona una foto de perfil.");
      return;
    }

    setMessage("");
    try {
      const { token } = readStoredSession();
      const payload = new FormData();
      payload.append("file", profilePhotoFile);
      const response = await fetch(`${API_URL}/api/auth/me/photo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: payload,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const profile = (await response.json()) as AuthProfile;
      setCurrentUserProfilePhotoUrl(profile.profile_photo_url ?? null);
      persistProfilePhoto(profile.profile_photo_url);
      setProfilePhotoFile(null);
      setMessage("Foto de perfil actualizada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir la foto de perfil.");
    }
  }

  return {
    currentRoles,
    currentUserDisplayName,
    currentUserEmail,
    currentUserFirstName,
    currentUserGender,
    currentUserLastName,
    currentUserPhoneNumber,
    currentUserProfilePhotoUrl,
    isAuthenticated,
    loginForm,
    logout,
    profileForm,
    profilePhotoFile,
    setCurrentRoles,
    setLoginForm,
    setProfileForm,
    setProfilePhotoFile,
    submitLogin,
    updateCurrentProfile,
    uploadCurrentProfilePhoto,
  };
}
