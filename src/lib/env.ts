// src/lib/env.ts
export const JALDEE_BASE_URL =
  (import.meta.env.VITE_JALDEE_BASE_URL as string) || "https://scale.jaldee.com";

export const JALDEE_LOCATION =
  (import.meta.env.VITE_JALDEE_LOCATION as string) || "127837";

// If you need an auth token later (Keycloak, etc.)
export const JALDEE_AUTH_TOKEN =
  (import.meta.env.VITE_JALDEE_AUTH_TOKEN as string) || "";
