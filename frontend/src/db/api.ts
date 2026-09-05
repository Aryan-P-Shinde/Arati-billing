const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const PIN_KEY = "arati-billing-pin";

export function getStoredPin(): string | null {
  return localStorage.getItem(PIN_KEY);
}

export function setStoredPin(pin: string): void {
  localStorage.setItem(PIN_KEY, pin);
}

export function clearStoredPin(): void {
  localStorage.removeItem(PIN_KEY);
}

/** Thrown on a 401 — the PIN is missing/wrong. App.tsx catches this to show the PIN screen. */
export class PinRequiredError extends Error {
  constructor() {
    super("PIN required or incorrect");
    this.name = "PinRequiredError";
  }
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** For endpoints that send/receive raw bytes (backup export/import) instead of JSON. */
  raw?: boolean;
}

/**
 * Every doctors.ts/products.ts/bills.ts call goes through here. Adds the
 * PIN header, serializes JSON bodies, and turns non-2xx responses into
 * thrown errors (PinRequiredError for 401, Error with the server's
 * message otherwise) so callers can just `await` and try/catch.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const pin = getStoredPin();
  const headers: Record<string, string> = { "x-app-pin": pin ?? "" };
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    if (options.raw) {
      body = options.body as BodyInit;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });

  if (res.status === 401) {
    throw new PinRequiredError();
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (options.raw) {
    return (await res.blob()) as T;
  }

  return (await res.json()) as T;
}

/** Verifies the stored PIN actually works, by hitting any authenticated endpoint. */
export async function verifyPin(): Promise<boolean> {
  try {
    await apiFetch("/api/doctors?limit=1");
    return true;
  } catch (err) {
    if (err instanceof PinRequiredError) return false;
    throw err;
  }
}
