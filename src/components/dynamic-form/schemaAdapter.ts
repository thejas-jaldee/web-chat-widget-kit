// src/components/dynamic-form/schemaAdapter.ts
import { DynamicFormSchema, SimpleField, JsonNode, JsonType } from "./types";

export function 
adaptToDynamicFormSchema(jsonSchema: JsonNode): DynamicFormSchema {
  const normalizedRoot = ensureType(jsonSchema);
  const fields = extractFields(normalizedRoot);
  return {
    title: (normalizedRoot.title as string) || undefined,
    description: (normalizedRoot.description as string) || undefined,
    type: "object",
    fields,
  };
}

/** Ensure node has a sensible type; default to "object" if it has properties */
function ensureType(node: JsonNode | undefined): JsonNode {
  const n: JsonNode = node ?? {};
  const t = normalizeType(n.type as string | undefined);
  if (!t && n.properties) return { ...n, type: "object" };
  if (!t) return { ...n, type: "string" };
  return { ...n, type: t };
}

function normalizeType(t?: string): JsonType | undefined {
  const known = ["string", "number", "integer", "boolean", "object", "array"] as const;
  return t && (known as readonly string[]).includes(t) ? (t as JsonType) : undefined;
}

function extractFields(schema: JsonNode): SimpleField[] {
  const out: SimpleField[] = [];

  const root = ensureType(schema);

  // Root is a primitive (rare)
  if (root.type !== "object" && !root.properties) {
    out.push(toSimpleField("root", root, false));
    return out;
  }

  if (root.type === "object" && root.properties) {
    const requiredList: string[] = Array.isArray(root.required) ? root.required : [];
    for (const [key, defRaw] of Object.entries(root.properties)) {
      const node = ensureType(defRaw as JsonNode);
      const isRequired = requiredList.includes(key);
      const f = toSimpleField(key, node, isRequired);

      if (node.type === "object") {
        // Recurse with the child's own required array
        f.fields = extractFields(node);
      } else if (node.type === "array" && node.items) {
        const itemsNode = ensureType(node.items);
        if (itemsNode.type === "object") {
          // Items are objects — build object field with its own requireds
          f.items = {
            sectionKey: `${key}__item`,
            type: "object",
            title: itemsNode.title,
            description: itemsNode.description,
            fields: extractFields(itemsNode),
          };
        } else {
          // Primitive items — do NOT pass parent's required to the item
          f.items = toSimpleField(`${key}__item`, itemsNode, false);
        }
      }

      out.push(f);
    }
  }

  return out;
}

function toSimpleField(key: string, defRaw: JsonNode, required: boolean): SimpleField {
  const def = ensureType(defRaw);

  const f: SimpleField = {
    sectionKey: key,
    title: (def.title as string) || "",
    type: (def.type as SimpleField["type"]) || "string",
    itemType: def.itemType,
    inputType: def.inputType,
    required: required || undefined, // only set when true
    description: (def.description as string) || "",
    placeholder: (def.placeholder as string) || "",
    default: def.default,
    minimum: toNum(def.minimum),
    maximum: toNum(def.maximum),
    maxLength: toNum(def.maxLength),
  };

  // options / enum
  if (Array.isArray(def.options)) {
    f.options = def.options;
  } else if (Array.isArray(def.enum)) {
    f.options = def.enum.map((v) => ({ displayName: String(v), value: v }));
  }

  return f;
}

function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
