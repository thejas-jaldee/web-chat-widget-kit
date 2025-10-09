// src/components/dynamic-form/schemaClient.ts

// Minimal types for the S3 JSON (adjust as needed in your project)
export type LeadSdkAction = {
  id: string;
  title: string;
  channel: {
    id: number;
    name: string;
    uid: string;            // chlead_...
    encodedUid: string;     // ch-...
    locationId: number;
  };
  product: string;
  template?: {
    uid: string;
    templateName: string;
    templateSchema?: unknown;
  };
};

export type LeadSdkJson = {
  generatedAt: string;
  source: string;
  accountId: number;
  count: number;
  actions: LeadSdkAction[];
};

// -------- Config --------
// If you want to move these to src/lib/env.ts, feel free.
const UIS3_BASE = "https://jaldeeuiscale.s3.ap-south-1.amazonaws.com";
// TODO: make this configurable if needed; matches your current setup
const LEAD_SDK_ACCOUNT_ID = 155523;

// -------- Internal cache (retained for widget lifetime) --------
let cachedLeadSdk: LeadSdkJson | null = null;
let inflight: Promise<LeadSdkJson> | null = null;

/**
 * Clear the in-memory cache (e.g., if you want to force refresh after a settings change).
 */
export function clearLeadSdkCache() {
  cachedLeadSdk = null;
  inflight = null;
}

/**
 * Generic fetcher by full S3 URL.
 */
export async function getLeadSdkJsonByUrl(url: string, signal?: AbortSignal): Promise<LeadSdkJson> {
  const res = await fetch(url, {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json",
    },
    credentials: "omit",
    mode: "cors",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Lead SDK JSON fetch failed (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as LeadSdkJson;
  return data;
}

/**
 * Fetches the Lead SDK JSON from S3.
 * - Fetches once, then returns cached data on subsequent calls.
 * - The `uniqueId` argument is accepted for future flexibility (not required for the S3 path).
 */
export async function getLeadSdkJson(uniqueId?: string, signal?: AbortSignal): Promise<LeadSdkJson> {
  if (cachedLeadSdk) return cachedLeadSdk;
  if (inflight) return inflight;

  // Build S3 path. If you later want per-tenant paths, swap LEAD_SDK_ACCOUNT_ID.
  const url = `${UIS3_BASE}/${encodeURIComponent(LEAD_SDK_ACCOUNT_ID)}/lead-sdk.json`;

  inflight = getLeadSdkJsonByUrl(url, signal)
    .then((data) => {
      cachedLeadSdk = data;
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
