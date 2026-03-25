"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

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
  const pickerRef = useRef<HTMLInputElement | null>(null);

  const normalizeDateInput = (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  return (
    <label>
      {required ? <RequiredLabel>{label}</RequiredLabel> : <span>{label}</span>}
      <div className="date-field-shell">
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/MM/yyyy"
          value={value}
          onChange={(event) => onChange(normalizeDateInput(event.target.value))}
          onBlur={(event) => {
            const normalized = event.target.value.trim();
            const isoDate = parseDisplayDate(normalized);
            if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
              onChange(formatEditableDate(isoDate));
            }
          }}
          pattern="\d{2}/\d{2}/\d{4}"
          required={required}
        />
        <button
          type="button"
          className="date-field-picker-button"
          aria-label={`Seleccionar ${label.toLowerCase()} en calendario`}
          onClick={() => {
            const picker = pickerRef.current;
            if (!picker) {
              return;
            }
            if (typeof picker.showPicker === "function") {
              picker.showPicker();
              return;
            }
            picker.click();
          }}
        >
          Calendario
        </button>
        <input
          ref={pickerRef}
          className="date-field-native-picker"
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={parseDisplayDate(value)}
          onChange={(event) => onChange(formatEditableDate(event.target.value))}
        />
      </div>
    </label>
  );
}

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
};

export function SearchableSelect({
  clearLabel,
  disabled = false,
  emptyMessage = "No hay resultados para esa busqueda.",
  options,
  placeholder,
  required = false,
  searchPlaceholder = "Escribe para filtrar",
  value,
  onChange,
}: {
  clearLabel?: string;
  disabled?: boolean;
  emptyMessage?: string;
  options: SearchableSelectOption[];
  placeholder: string;
  required?: boolean;
  searchPlaceholder?: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const selectedOption = options.find((option) => option.value === value) ?? null;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) => {
      const searchableText = [option.label, option.description ?? "", ...(option.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }
    searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={`searchable-select${isOpen ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}>
      <input
        className="searchable-select-native-value"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={() => undefined}
        required={required}
      />
      <button
        type="button"
        className="searchable-select-trigger"
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current);
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
      >
        <span className={selectedOption ? "searchable-select-value" : "searchable-select-placeholder"}>
          {selectedOption?.label ?? placeholder}
        </span>
      </button>
      {isOpen ? (
        <div className="searchable-select-panel">
          <input
            ref={searchInputRef}
            className="searchable-select-search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setIsOpen(false);
              }
              if (event.key === "Enter" && filteredOptions[0]) {
                event.preventDefault();
                handleSelect(filteredOptions[0].value);
              }
            }}
          />
          <div className="searchable-select-options" role="listbox" id={listboxId}>
            {clearLabel ? (
              <button
                type="button"
                className={`searchable-select-option searchable-select-clear${value === "" ? " is-selected" : ""}`}
                onClick={() => handleSelect("")}
              >
                <span>{clearLabel}</span>
              </button>
            ) : null}
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`searchable-select-option${option.value === value ? " is-selected" : ""}`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span>{option.label}</span>
                  {option.description ? <small>{option.description}</small> : null}
                </button>
              ))
            ) : (
              <div className="searchable-select-empty">{emptyMessage}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
