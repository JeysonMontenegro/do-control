import type { AuthProfile, LoginResponse } from "@/features/module1/types";

const STORAGE_KEYS = {
  token: "docontrol_token",
  userEmail: "docontrol_user_email",
  userFirstName: "docontrol_user_first_name",
  userLastName: "docontrol_user_last_name",
  userDisplayName: "docontrol_user_display_name",
  userGender: "docontrol_user_gender",
  userPhoneNumber: "docontrol_user_phone_number",
  userProfilePhotoUrl: "docontrol_user_profile_photo_url",
  roles: "docontrol_roles",
} as const;

export type StoredSession = {
  token: string | null;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  gender: string | null;
  phoneNumber: string | null;
  profilePhotoUrl: string | null;
  roles: string[];
};

function setOptionalStorageItem(key: string, value: string | null | undefined) {
  if (value) {
    window.localStorage.setItem(key, value);
    return;
  }
  window.localStorage.removeItem(key);
}

export function readStoredSession(): StoredSession {
  const rawRoles = window.localStorage.getItem(STORAGE_KEYS.roles);
  let roles: string[] = [];

  if (rawRoles) {
    try {
      roles = JSON.parse(rawRoles) as string[];
    } catch {
      roles = [];
    }
  }

  return {
    token: window.localStorage.getItem(STORAGE_KEYS.token),
    email: window.localStorage.getItem(STORAGE_KEYS.userEmail) ?? "",
    firstName: window.localStorage.getItem(STORAGE_KEYS.userFirstName) ?? "",
    lastName: window.localStorage.getItem(STORAGE_KEYS.userLastName) ?? "",
    displayName: window.localStorage.getItem(STORAGE_KEYS.userDisplayName),
    gender: window.localStorage.getItem(STORAGE_KEYS.userGender),
    phoneNumber: window.localStorage.getItem(STORAGE_KEYS.userPhoneNumber),
    profilePhotoUrl: window.localStorage.getItem(STORAGE_KEYS.userProfilePhotoUrl),
    roles,
  };
}

export function persistLoginSession(payload: LoginResponse) {
  window.localStorage.setItem(STORAGE_KEYS.token, payload.access_token);
  window.localStorage.setItem(STORAGE_KEYS.userEmail, payload.user_email);
  window.localStorage.setItem(STORAGE_KEYS.userFirstName, payload.first_name);
  window.localStorage.setItem(STORAGE_KEYS.userLastName, payload.last_name);
  setOptionalStorageItem(STORAGE_KEYS.userDisplayName, payload.display_name);
  setOptionalStorageItem(STORAGE_KEYS.userGender, payload.gender);
  setOptionalStorageItem(STORAGE_KEYS.userPhoneNumber, payload.phone_number);
  setOptionalStorageItem(STORAGE_KEYS.userProfilePhotoUrl, payload.profile_photo_url);
  window.localStorage.setItem(STORAGE_KEYS.roles, JSON.stringify(payload.roles));
}

export function persistProfileSession(profile: AuthProfile) {
  window.localStorage.setItem(STORAGE_KEYS.userEmail, profile.user_email);
  window.localStorage.setItem(STORAGE_KEYS.userFirstName, profile.first_name);
  window.localStorage.setItem(STORAGE_KEYS.userLastName, profile.last_name);
  setOptionalStorageItem(STORAGE_KEYS.userDisplayName, profile.display_name);
  setOptionalStorageItem(STORAGE_KEYS.userGender, profile.gender);
  setOptionalStorageItem(STORAGE_KEYS.userPhoneNumber, profile.phone_number);
  setOptionalStorageItem(STORAGE_KEYS.userProfilePhotoUrl, profile.profile_photo_url);
  window.localStorage.setItem(STORAGE_KEYS.roles, JSON.stringify(profile.roles));
}

export function persistProfilePhoto(profilePhotoUrl: string | null | undefined) {
  setOptionalStorageItem(STORAGE_KEYS.userProfilePhotoUrl, profilePhotoUrl);
}

export function clearStoredSession() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    window.localStorage.removeItem(key);
  });
}
