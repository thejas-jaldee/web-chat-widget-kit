// src/components/dynamic-form/types.ts
export type PrimitiveType = "string" | "number" | "integer" | "boolean";
export type ComplexType = "object" | "array";
export type JsonType = PrimitiveType | ComplexType;

export type InputType =
  | "text"
  | "email"
  | "date"
  | "time"
  | "dateTime"
  | "phone"
  | "number"
  | "float"
  | "state"
  | "country";

export type ItemType =
  | "textBox"
  | "textArea"
  | "dropDown"
  | "multiSelect"
  | "radioButton"
  | "toggle";

export interface OptionItem {
  displayName: string;
  value: string | number | boolean;
}

export interface SimpleField {
  sectionKey: string;
  title?: string;
  type: JsonType;
  itemType?: ItemType;
  inputType?: InputType;
  required?: boolean;
  description?: string;
  placeholder?: string;
  default?: unknown;          // no-explicit-any fix
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  enum?: Array<string | number>;
  options?: OptionItem[];
  fields?: SimpleField[];
  items?: SimpleField;        // for arrays
}

export interface DynamicFormSchema {
  title?: string;
  description?: string;
  type: "object";
  fields: SimpleField[];
}

/** Loose JSON-schema-ish node used by the adapter */
export interface JsonNode {
  type?: JsonType | string;
  title?: string;
  description?: string;
  placeholder?: string;
  default?: unknown;
  itemType?: ItemType;
  inputType?: InputType;

  // object
  properties?: Record<string, JsonNode>;
  required?: string[];

  // array
  items?: JsonNode;

  // validation / choices
  enum?: Array<string | number>;
  options?: OptionItem[];

  minimum?: number | string;
  maximum?: number | string;
  maxLength?: number | string;

  // arbitrary stuff we don't care about should be allowed
  [k: string]: unknown;
}
