"use client";

import { formatEditableDate, parseDisplayDate } from "@/features/module1/console-utils";
import {
  buildPhoneNumber,
  COUNTRY_PHONE_OPTIONS,
  getPhoneCountryCode,
  getPhoneLocalNumber,
} from "@/features/module1/phone-utils";

export function PhoneField({
  label,
  value,
  onChange,
  required = false,
  placeholder = "Número",
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const countryCode = getPhoneCountryCode(value);
  const localNumber = getPhoneLocalNumber(value);

  return (
    <label>
      <span>
        {label}
        {required ? <strong className="required-mark">*</strong> : null}
      </span>
      <div className="phone-field-stack">
        <select value={countryCode} onChange={(event) => onChange(buildPhoneNumber(event.target.value, localNumber))}>
          {COUNTRY_PHONE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label} {option.code}
            </option>
          ))}
        </select>
        <input
          className="phone-local-input"
          value={localNumber}
          onChange={(event) => onChange(buildPhoneNumber(countryCode, event.target.value))}
          placeholder={placeholder}
          inputMode="numeric"
          required={required}
        />
      </div>
    </label>
  );
}

export function RequiredLabel({ children }: { children: string }) {
  return (
    <span>
      {children}
      <strong className="required-mark">*</strong>
    </span>
  );
}

export function DateField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  required?: boolean;
}) {
  return (
    <label>
      {required ? <RequiredLabel>{label}</RequiredLabel> : <span>{label}</span>}
      <input
        type="date"
        lang="en-GB"
        value={parseDisplayDate(value)}
        onChange={(event) => onChange(formatEditableDate(event.target.value))}
        required={required}
      />
    </label>
  );
}
