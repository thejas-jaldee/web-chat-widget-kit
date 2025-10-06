import React from "react";
import { OptionItem, SimpleField } from "./types";
import { getOptionsForInput } from "./constants";

type Props = {
  field: SimpleField;
  value: unknown;
  onChange: (newVal: unknown) => void;
};

/** Helpers to satisfy React's value types without using `any` */
function toStringVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}
function toNumberOrEmpty(v: unknown): number | "" {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}
function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}

const FieldRenderer: React.FC<Props> = ({ field, value, onChange }) => {
  const {
    title,
    type,
    itemType,
    inputType,
    placeholder,
    required,
    maxLength,
    minimum,
    maximum,
    description,
    options: fieldOptions,
  } = field;

  const options: OptionItem[] = getOptionsForInput(inputType, fieldOptions);

  /** Common label */
  const Label = title ? (
    <label className="block mb-1 font-medium">
      {title} {required && <span className="text-red-600">*</span>}
    </label>
  ) : null;

  /* ===================== STRING ===================== */
  if (type === "string") {
    // textarea
    if (itemType === "textArea") {
      return (
        <div className="mb-3">
          {Label}
          <textarea
            className="w-full border rounded px-3 py-2"
            value={toStringVal(value)}
            placeholder={placeholder || ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              onChange(e.target.value)
            }
            maxLength={maxLength}
            rows={3}
          />
          {description && <small className="text-gray-500">{description}</small>}
        </div>
      );
    }

    // single select (dropdown)
    if (itemType === "dropDown") {
      return (
        <div className="mb-3">
          {Label}
          <select
            className="w-full border rounded px-3 py-2"
            value={toStringVal(value)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onChange(e.target.value)
            }
          >
            <option value="">{placeholder || "Select..."}</option>
            {options.map((opt) => (
              <option key={`${opt.value}`} value={String(opt.value)}>
                {opt.displayName}
              </option>
            ))}
          </select>
          {description && <small className="text-gray-500">{description}</small>}
        </div>
      );
    }

    // multi select
    if (itemType === "multiSelect") {
      const selected = toStringArray(value);
      return (
        <div className="mb-3">
          {Label}
          <select
            multiple
            className="w-full border rounded px-3 py-2"
            value={selected}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
              onChange(vals);
            }}
          >
            {options.map((opt) => (
              <option key={`${opt.value}`} value={String(opt.value)}>
                {opt.displayName}
              </option>
            ))}
          </select>
          {description && <small className="text-gray-500">{description}</small>}
        </div>
      );
    }

    // radio
    if (itemType === "radioButton" && options.length) {
      const current = toStringVal(value);
      return (
        <div className="mb-3">
          {Label}
          <div className="flex flex-wrap gap-4 items-center">
            {options.map((opt) => {
              const valStr = String(opt.value);
              const checked = current === valStr;
              return (
                <label key={`${opt.value}`} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.sectionKey}
                    checked={checked}
                    onChange={() => onChange(valStr)}
                  />
                  <span>{opt.displayName}</span>
                </label>
              );
            })}
          </div>
          {description && <small className="block text-gray-500 mt-1">{description}</small>}
        </div>
      );
    }

    // text / email / date / time / dateTime / phone -> treat as text input
    const htmlType: React.HTMLInputTypeAttribute =
      inputType === "email"
        ? "email"
        : inputType === "date"
        ? "date"
        : inputType === "time"
        ? "time"
        : "text"; // dateTime/phone keep as text unless enhanced

    return (
      <div className="mb-3">
        {Label}
        <input
          type={htmlType}
          className="w-full border rounded px-3 py-2"
          value={toStringVal(value)}
          placeholder={placeholder || ""}
          maxLength={maxLength}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
        />
        {description && <small className="text-gray-500">{description}</small>}
      </div>
    );
  }

  /* ===================== NUMBER / INTEGER ===================== */
  if (type === "number" || type === "integer") {
    // number dropdown
    if (itemType === "dropDown") {
      return (
        <div className="mb-3">
          {Label}
          <select
            className="w-full border rounded px-3 py-2"
            value={toStringVal(value)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onChange(Number(e.target.value))
            }
          >
            <option value="">{placeholder || "Select..."}</option>
            {options.map((opt) => (
              <option key={`${opt.value}`} value={String(opt.value)}>
                {opt.displayName}
              </option>
            ))}
          </select>
          {description && <small className="text-gray-500">{description}</small>}
        </div>
      );
    }

    // number radio
    if (itemType === "radioButton" && options.length) {
      const currentNum =
        typeof value === "number" ? value : Number(toStringVal(value));
      return (
        <div className="mb-3">
          {Label}
          <div className="flex flex-wrap gap-4 items-center">
            {options.map((opt) => {
              const valNum = Number(opt.value);
              const checked = Number.isFinite(currentNum) && currentNum === valNum;
              return (
                <label key={`${opt.value}`} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.sectionKey}
                    checked={checked}
                    onChange={() => onChange(valNum)}
                  />
                  <span>{opt.displayName}</span>
                </label>
              );
            })}
          </div>
          {description && <small className="block text-gray-500 mt-1">{description}</small>}
        </div>
      );
    }

    // plain number input
    return (
      <div className="mb-3">
        {Label}
        <input
          type="number"
          className="w-full border rounded px-3 py-2"
          value={toNumberOrEmpty(value)}
          placeholder={placeholder || ""}
          min={minimum}
          max={maximum}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            onChange(raw === "" ? "" : Number(raw));
          }}
        />
        {description && <small className="text-gray-500">{description}</small>}
      </div>
    );
  }

  /* ===================== BOOLEAN ===================== */
  if (type === "boolean") {
    const checked = Boolean(value);
    return (
      <div className="mb-3 flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.checked)
          }
        />
        <span>{description || title}</span>
      </div>
    );
  }

  return null;
};

export default FieldRenderer;
