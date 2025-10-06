
import React, { useState } from "react";
import { DynamicFormSchema, SimpleField } from "./types";
import FieldRenderer from "./FieldRenderer";

type FormData = Record<string, unknown>;

type Props = {
  schema: DynamicFormSchema;
  initialData?: FormData;

  /** Fires on any value change (both modes) */
  onChange?: (data: FormData) => void;

  /** Fires when submitted (standalone mode only) */
  onSubmit?: (data: FormData) => void;

  /** Submit button label (standalone mode) */
  submitLabel?: string;

  /** Render as fields-only (no inner <form>, no submit, no inner scroll) */
  mode?: "standalone" | "embedded";

  /** Hide the top title (schema.title) */
  hideTitle?: boolean;

  /** Hide specific section titles by exact match (case-insensitive) */
  hideSectionTitles?: string[];
};

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

function initialFromFields(fields: SimpleField[], seed: FormData = {}): FormData {
  const d: FormData = { ...seed };
  for (const f of fields) {
    if (f.type === "object") {
      const childSeed = (seed?.[f.sectionKey] as FormData) || {};
      d[f.sectionKey] = initialFromFields(f.fields || [], childSeed);
    } else if (f.type === "array") {
      d[f.sectionKey] = Array.isArray(seed?.[f.sectionKey]) ? (seed?.[f.sectionKey] as unknown[]) : [];
    } else if (f.type === "string") {
      d[f.sectionKey] = seed?.[f.sectionKey] ?? f.default ?? "";
    } else if (f.type === "number" || f.type === "integer") {
      d[f.sectionKey] = seed?.[f.sectionKey] ?? f.default ?? null;
    } else if (f.type === "boolean") {
      d[f.sectionKey] = seed?.[f.sectionKey] ?? Boolean(f.default ?? false);
    }
  }
  return d;
}

/** Safe getter by path */
function getAtPath(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

/** Safe setter by path (immutable) */
function setAtPath(root: FormData, path: string[], value: unknown): FormData {
  const next = clone(root);
  let cur: Record<string, unknown> = next;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    const child = cur[k];
    if (typeof child !== "object" || child === null || Array.isArray(child)) {
      const obj: Record<string, unknown> = {};
      cur[k] = obj;
      cur = obj;
    } else {
      cur = child as Record<string, unknown>;
    }
  }
  cur[path[path.length - 1]] = value;
  return next;
}

const DynamicForm: React.FC<Props> = ({
  schema,
  initialData,
  onChange,
  onSubmit,
  submitLabel = "Submit",
  mode = "standalone",
  hideTitle = false,
  hideSectionTitles = [],
}) => {
  const [data, setData] = useState<FormData>(() => initialFromFields(schema.fields, initialData));

  const sectionBlocklist = hideSectionTitles.map((t) => t.toLowerCase());
  const shouldShowTopTitle = !hideTitle && Boolean(schema.title?.trim());
  const shouldShowSectionTitle = (title?: string) =>
    Boolean(title) && !sectionBlocklist.includes(String(title).toLowerCase());

  const setValue = (keyPath: string[], val: unknown) => {
    const next = setAtPath(data, keyPath, val);
    setData(next);
    onChange?.(next);
  };

  const renderField = (field: SimpleField, parentKeyPath: string[] = []): React.ReactNode => {
    const keyPath = [...parentKeyPath, field.sectionKey];

    if (field.type === "object") {
      const objectValue = (getAtPath(data, keyPath) as FormData) ?? {};
      const setObjChild = (childKey: string, val: unknown) => {
        const updated = { ...(objectValue || {}), [childKey]: val } as FormData;
        setValue(keyPath, updated);
      };

      return (
        <div key={keyPath.join(".")} className="mb-4">
          {shouldShowSectionTitle(field.title) && (
            <div className="bg-gray-100 p-2 mb-2 font-semibold">{field.title}</div>
          )}
          {(field.fields || []).map((child) => (
            <div key={`${keyPath.join(".")}.${child.sectionKey}`}>
              {(child.type === "object" || child.type === "array")
                ? renderField(child, keyPath)
                : (
                  <FieldRenderer
                    field={child}
                    value={(objectValue as Record<string, unknown>)?.[child.sectionKey]}
                    onChange={(val) => setObjChild(child.sectionKey, val)}
                  />
                )}
            </div>
          ))}
        </div>
      );
    }

    if (field.type === "array") {
      const arrValUnknown = getAtPath(data, keyPath);
      const arrVal = Array.isArray(arrValUnknown) ? arrValUnknown as unknown[] : [];

      const setArray = (newArr: unknown[]) => setValue(keyPath, newArr);

      const itemSchema = field.items || (field.fields?.[0] ?? undefined);

      const addItem = () => {
        if (!itemSchema) return;
        if (itemSchema.type === "object") {
          const newObj = initialFromFields(itemSchema.fields || []);
          setArray([...(arrVal || []), newObj]);
        } else {
          const def =
            itemSchema.type === "string" ? itemSchema.default ?? "" :
            itemSchema.type === "boolean" ? Boolean(itemSchema.default ?? false) :
            itemSchema.default ?? null;
          setArray([...(arrVal || []), def]);
        }
      };

      const removeItem = (idx: number) => {
        const nextArr = [...arrVal];
        nextArr.splice(idx, 1);
        setArray(nextArr);
      };

      return (
        <div key={keyPath.join(".")} className="mb-4">
          {shouldShowSectionTitle(field.title) && (
            <div className="bg-gray-100 p-2 mb-2 font-semibold">{field.title}</div>
          )}
          <div className="space-y-3">
            {arrVal.map((item, idx) => {
              if (!itemSchema) return null;

              if (itemSchema.type === "object") {
                const itemObj = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
                return (
                  <div key={`${keyPath.join(".")}[${idx}]`} className="border rounded p-3">
                    {(itemSchema.fields || []).map((child) => (
                      <FieldRenderer
                        key={`${keyPath.join(".")}[${idx}].${child.sectionKey}`}
                        field={child}
                        value={itemObj[child.sectionKey]}
                        onChange={(val) => {
                          const nextArr = clone(arrVal);
                          const obj = (typeof nextArr[idx] === "object" && nextArr[idx] !== null
                            ? (nextArr[idx] as Record<string, unknown>)
                            : {}) as Record<string, unknown>;
                          obj[child.sectionKey] = val;
                          nextArr[idx] = obj;
                          setArray(nextArr);
                        }}
                      />
                    ))}
                    <button type="button" className="text-sm text-red-600 mt-1" onClick={() => removeItem(idx)}>
                      Remove
                    </button>
                  </div>
                );
              }

              // primitive item
              const primitive = (typeof item === "string" || typeof item === "number") ? item : "";
              return (
                <div key={`${keyPath.join(".")}[${idx}]`} className="flex items-center gap-2">
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    value={primitive as string | number | ""}
                    onChange={(e) => {
                      const nextArr = clone(arrVal);
                      nextArr[idx] = e.target.value;
                      setArray(nextArr);
                    }}
                  />
                  <button type="button" className="text-sm text-red-600" onClick={() => removeItem(idx)}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" className="mt-2 text-sm text-indigo-600" onClick={addItem}>
            + Add
          </button>
        </div>
      );
    }

    // primitive field
    const value = getAtPath(data, keyPath);
    return (
      <FieldRenderer
        key={keyPath.join(".")}
        field={field}
        value={value}
        onChange={(val) => setValue(keyPath, val)}
      />
    );
  };

  // ===== Render =====
  if (mode === "embedded") {
    // Fields-only: no inner form, no internal submit, no internal scroll
    return (
      <div role="group" className="flex flex-col">
        {shouldShowTopTitle && <h3 className="text-lg font-semibold mb-2">{schema.title}</h3>}
        {schema.description && <p className="text-sm text-gray-600 mb-3">{schema.description}</p>}
        <div className="flex-1">{schema.fields.map((f) => renderField(f))}</div>
      </div>
    );
  }

  // Standalone (default): includes its own form + submit + inner scroll
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(data);
      }}
      className="flex flex-col h-full"
    >
      {shouldShowTopTitle && <h3 className="text-lg font-semibold mb-2">{schema.title}</h3>}
      {schema.description && <p className="text-sm text-gray-600 mb-3">{schema.description}</p>}
      <div className="flex-1 overflow-y-auto pr-1">{schema.fields.map((f) => renderField(f))}</div>
      <div className="pt-3">
        <button type="submit" className="px-4 py-2 rounded bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export default DynamicForm;
