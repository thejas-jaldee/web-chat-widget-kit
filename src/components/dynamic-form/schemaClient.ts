const UIS3_BASE = "https://jaldeeuiscale.s3.ap-south-1.amazonaws.com";
const leadid=155523;
/**
 * Fetches the Lead SDK JSON from S3 instead of the Jaldee API.
 * @param uniqueId Account or tenant ID (e.g., "155523")
 * @param signal Optional AbortSignal for cancellation
 */
export async function getLeadSdkJson(uniqueId: string, signal?: AbortSignal) {
  const url = `${UIS3_BASE}/${encodeURIComponent(leadid)}/lead-sdk.json`;
  return getLeadSdkJsonByUrl(url, signal);
}

/**
 * Generic fetcher by full S3 URL.
 */
export async function getLeadSdkJsonByUrl(url: string, signal?: AbortSignal) {
  const res = await fetch(url, {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Lead SDK JSON fetch failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json(); // parsed JSON data
}
