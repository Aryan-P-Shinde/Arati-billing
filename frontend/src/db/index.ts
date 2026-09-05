import { apiFetch, getStoredPin, verifyPin, PinRequiredError } from "./api";

export { PinRequiredError, getStoredPin, setStoredPin, clearStoredPin } from "./api";

/**
 * Replaces the old sql.js bootstrap. "Ready" now means: we have a PIN
 * stored, and the server accepts it. Throws PinRequiredError (caught by
 * App.tsx) if there's no PIN yet or the server rejects it, so the app can
 * show the PIN entry screen instead of the bill-entry UI.
 */
export async function getDb(): Promise<void> {
  if (!getStoredPin()) {
    throw new PinRequiredError();
  }
  const ok = await verifyPin();
  if (!ok) {
    throw new PinRequiredError();
  }
}

/** Downloads a full JSON snapshot of the server's database (PRD sec.32 — "export database"). */
export async function exportDatabase(): Promise<Blob> {
  return apiFetch<Blob>("/api/backup/export", { raw: true });
}

/** Uploads a previously exported .json snapshot to replace everything on the server. */
export async function importDatabase(file: File): Promise<void> {
  const text = await file.text();
  const snapshot = JSON.parse(text);
  await apiFetch<void>("/api/backup/import", { method: "POST", body: snapshot });
}

/** Wipes every doctor, product, bill and bill_item on the server. Bill numbering restarts at #1. */
export async function clearAllData(): Promise<void> {
  await apiFetch<void>("/api/backup/clear", { method: "POST" });
}
