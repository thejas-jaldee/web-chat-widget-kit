// src/components/dynamic-form/schemaAdapter.ts
import { DynamicFormSchema, SimpleField, JsonNode } from "./types";

export function adaptToDynamicFormSchema(jsonSchema: JsonNode): DynamicFormSchema {
  const fields = extractFields(jsonSchema);
  return {
    title: (jsonSchema.title as string) || undefined,
    description: (jsonSchema.description as string) || undefined,
    type: "object",
    fields,
  };
}

function extractFields(schema: JsonNode): SimpleField[] {
  const out: SimpleField[] = [];

  // If root is a primitive (rare)
  if (schema?.type && schema.type !== "object" && !schema.properties) {
    out.push(toSimpleField("root", schema, Boolean(schema.required)));
    return out;
  }

  if (schema?.type === "object" && schema.properties) {
    const requiredList: string[] = Array.isArray(schema.required) ? schema.required : [];
    for (const [key, def] of Object.entries(schema.properties)) {
      const node = def as JsonNode;
      const required = requiredList.includes(key);
      const f = toSimpleField(key, node, required);

      if (node.type === "object") {
        f.fields = extractFields(node);
      } else if (node.type === "array" && node.items) {
        const items = node.items as JsonNode;
        if (items.type === "object") {
          f.items = { sectionKey: key, type: "object", fields: extractFields(items) };
        } else {
          f.items = toSimpleField(key, items, required);
        }
      }
      out.push(f);
    }
  }

  return out;
}

function toSimpleField(key: string, def: JsonNode, required: boolean): SimpleField {
  const f: SimpleField = {
    sectionKey: key,
    title: (def.title as string) || "",
    type: (def.type as SimpleField["type"]) || "string",
    itemType: def.itemType,
    inputType: def.inputType,
    required,
    description: (def.description as string) || "",
    placeholder: (def.placeholder as string) || "",
    default: def.default,
    minimum: toNum(def.minimum),
    maximum: toNum(def.maximum),
    maxLength: toNum(def.maxLength),
  };

  if (Array.isArray(def.options)) {
    f.options = def.options;
  } else if (Array.isArray(def.enum)) {
    f.options = def.enum.map((v) => ({ displayName: String(v), value: v }));
  }

  return f;
}

function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
