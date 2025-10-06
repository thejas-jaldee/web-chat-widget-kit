// src/components/lead/LeadSubmit.ts
export interface LeadSubmitPayload {
  channelEncUid: string;
  crmLeadConsumer: {
    firstName: string;
    countryCode: string; 
    phone: string;
    lastName?: string;
    email?: string;
  };
  templateSchemaValue: Record<string, unknown>;
}

export interface LeadSubmitOptions {
  
  baseUrl?: string;
  /** location id or encUid for the query param `location` */
  location: string | number;
  /** optional Authorization bearer token */
  authToken?: string;
  /** request timeout in ms (default 15000) */
  timeoutMs?: number;
  /** include cookies for same-site sessions */
  includeCredentials?: boolean;
}

/** Server may return any JSON shape; keep it flexible */
export type LeadSubmitResponse = unknown;

export async function submitLead(
  payload: LeadSubmitPayload,
  {
    baseUrl = "https://scale.jaldee.com",
    location,
    authToken,
    timeoutMs = 15000,
    includeCredentials = true,
  }: LeadSubmitOptions
): Promise<LeadSubmitResponse> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const url = `${baseUrl.replace(/\/$/, "")}/v1/rest/consumer/crm/lead?location=${encodeURIComponent(
    String(location)
  )}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: includeCredentials ? "include" : "same-origin",
      mode: "cors",
    });

    // Try to parse JSON; if not JSON, fall back to text.
    const text = await res.text();
    const data = safeJson(text);

    if (!res.ok) {
      const err = new Error(
        `Lead submit failed (${res.status} ${res.statusText})`
      ) as Error & { name: string; status?: number; details?: unknown };
      err.name = "LeadSubmitError";
      err.status = res.status;
      err.details = data ?? text;
      throw err;
    }

    return data;
  } catch (err) {
  if (isAbortError(err)) {
    const e = new Error("Lead submit timed out") as Error & { name: string };
    e.name = "LeadSubmitError";
    throw e;
  }
  throw err;
}
 finally {
    clearTimeout(t);
  }
}
function isAbortError(e: unknown): e is { name: string } {
  return typeof e === "object" && e !== null && "name" in e && typeof (e as { name?: unknown }).name === "string" && (e as { name: string }).name === "AbortError";
}
function safeJson(input: string) {
  try {
    return input ? JSON.parse(input) : null;
  } catch {
    return input;
  }
}
