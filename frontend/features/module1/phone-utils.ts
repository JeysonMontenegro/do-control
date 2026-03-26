export type CountryPhoneOption = {
  code: string;
  label: string;
};

export const COUNTRY_PHONE_OPTIONS: CountryPhoneOption[] = [
  { code: "+502", label: "Guatemala" },
  { code: "+503", label: "El Salvador" },
  { code: "+504", label: "Honduras" },
  { code: "+505", label: "Nicaragua" },
  { code: "+506", label: "Costa Rica" },
  { code: "+507", label: "Panamá" },
  { code: "+52", label: "México" },
  { code: "+1", label: "Estados Unidos" },
];

export const DEFAULT_COUNTRY_DIAL_CODE = "+502";

export const getPhoneCountryCode = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return DEFAULT_COUNTRY_DIAL_CODE;
  }

  const matchingOption = COUNTRY_PHONE_OPTIONS
    .slice()
    .sort((left, right) => right.code.length - left.code.length)
    .find((option) => normalized.startsWith(option.code) || normalized.startsWith(option.code.slice(1)));

  return matchingOption?.code ?? DEFAULT_COUNTRY_DIAL_CODE;
};

export const getPhoneLocalNumber = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const countryCode = getPhoneCountryCode(normalized);
  if (normalized.startsWith(countryCode)) {
    return normalized.slice(countryCode.length);
  }

  const digitsOnlyCode = countryCode.slice(1);
  if (normalized.startsWith(digitsOnlyCode)) {
    return normalized.slice(digitsOnlyCode.length);
  }

  return normalized.startsWith("+") ? normalized.slice(1) : normalized;
};

export const buildPhoneNumber = (countryCode: string, localNumber: string) => {
  const digits = localNumber.replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }

  return `${countryCode}${digits}`;
};

export const normalizePhoneWithDefaultCountry = (value: string) =>
  buildPhoneNumber(getPhoneCountryCode(value), getPhoneLocalNumber(value));

const groupLocalDigits = (digits: string) => {
  if (!digits) {
    return "";
  }
  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return digits.replace(/(\d{3,4})(?=\d)/g, "$1 ").trim();
};

export const formatPhoneLocalInput = (countryCode: string, value: string) => {
  const localDigits = getPhoneLocalNumber(buildPhoneNumber(countryCode, value));
  return groupLocalDigits(localDigits);
};

export const formatPhoneForDisplay = (value: string | null | undefined, emptyLabel = "Sin teléfono") => {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return emptyLabel;
  }

  const countryCode = getPhoneCountryCode(normalized);
  const countryDigits = countryCode.replace("+", "");
  const localDigits = getPhoneLocalNumber(normalized).replace(/[^\d]/g, "");
  const groupedLocal = groupLocalDigits(localDigits);

  return groupedLocal ? `${countryDigits} ${groupedLocal}` : countryDigits;
};
