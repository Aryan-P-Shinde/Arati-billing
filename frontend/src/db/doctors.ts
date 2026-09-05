import { apiFetch, PinRequiredError } from "./api";

export interface Doctor {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  gstin: string | null;
  notes: string | null;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface NewDoctor {
  name: string;
  address?: string;
  phone?: string;
  gstin?: string;
  notes?: string;
}

/** "avin" -> Dr. Avinash Jagtap, "jag" -> Dr. Avinash Jagtap (PRD sec.5/27). */
export async function searchDoctors(term: string, limit = 10): Promise<Doctor[]> {
  const params = new URLSearchParams({ q: term, limit: String(limit) });
  return apiFetch<Doctor[]>(`/api/doctors?${params}`);
}

export async function getDoctor(id: number): Promise<Doctor | undefined> {
  try {
    return await apiFetch<Doctor>(`/api/doctors/${id}`);
  } catch (err) {
    if (err instanceof PinRequiredError) throw err;
    return undefined; // 404 — no matching doctor
  }
}

/** "+ Add <name> as new doctor" -> "Save & Use" flow (PRD sec.5). */
export async function createDoctor(input: NewDoctor): Promise<Doctor> {
  return apiFetch<Doctor>("/api/doctors", { method: "POST", body: input });
}

export async function updateDoctor(id: number, input: Partial<NewDoctor>): Promise<void> {
  await apiFetch<Doctor>(`/api/doctors/${id}`, { method: "PUT", body: input });
}

export async function setDoctorActive(id: number, active: boolean): Promise<void> {
  await apiFetch<Doctor>(`/api/doctors/${id}/active`, { method: "POST", body: { active } });
}

/** How many bills reference this doctor — used to decide whether deleting them is safe. */
export async function countBillsForDoctor(id: number): Promise<number> {
  const { count } = await apiFetch<{ count: number }>(`/api/doctors/${id}/bill-count`);
  return count;
}

export async function deleteDoctor(id: number): Promise<void> {
  await apiFetch<void>(`/api/doctors/${id}`, { method: "DELETE" });
}
