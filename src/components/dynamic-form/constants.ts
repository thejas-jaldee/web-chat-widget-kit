// src/components/dynamic-form/constants.ts
import { OptionItem } from "./types";

export const INDIAN_STATES_LIST: OptionItem[] = [
  { displayName: "Karnataka", value: "KA" },
  { displayName: "Kerala", value: "KL" },
  { displayName: "Tamil Nadu", value: "TN" },
  { displayName: "Maharashtra", value: "MH" },
];

export const COUNTRIES_LIST: OptionItem[] = [
  { displayName: "India", value: "IN" },
  { displayName: "United States", value: "US" },
  { displayName: "United Kingdom", value: "GB" },
];

export function getOptionsForInput(input?: string, fallback?: OptionItem[]) {
  if (input === "state") return INDIAN_STATES_LIST;
  if (input === "country") return COUNTRIES_LIST;
  return fallback || [];
}
