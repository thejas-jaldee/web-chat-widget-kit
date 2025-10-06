const JALDEE_BASE = "https://scale.jaldee.com";

export async function getSchema(channelId: string, signal?: AbortSignal) {
  const url = `${JALDEE_BASE}/v1/rest/consumer/crm/lead/template/channel/${encodeURIComponent(
    channelId
  )}`;

  const res = await fetch(url, {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json",
      // Authorization: `Bearer ${YOUR_TOKEN}`, // <-- add if needed
    },
    // mode: "cors", // default; keep if you proxy through Vite you can omit
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jaldee schema fetch failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json(); // raw schema; adapter will shape it
}