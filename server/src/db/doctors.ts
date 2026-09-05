import { query, run } from "./index.js";

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

/**
 * "avin" -> Dr. Avinash Jagtap, "jag" -> Dr. Avinash Jagtap (PRD sec.5/27).
 * Plain substring LIKE is sufficient at this scale (~200-300 doctors) —
 * no FTS5 needed.
 */
export async function searchDoctors(term: string, limit = 10): Promise<Doctor[]> {
  const trimmed = term.trim();
  if (!trimmed) {
    return query<Doctor>(
      `SELECT * FROM doctors WHERE active = 1 ORDER BY name LIMIT ?`,
      [limit]
    );
  }
  return query<Doctor>(
    `SELECT * FROM doctors
     WHERE active = 1 AND name ILIKE ?
     ORDER BY name LIMIT ?`,
    [`%${trimmed}%`, limit]
  );
}

export async function getDoctor(id: number): Promise<Doctor | undefined> {
  const rows = await query<Doctor>(`SELECT * FROM doctors WHERE id = ?`, [id]);
  return rows[0];
}

/**
 * Creates a doctor and returns the new row — used for the
 * "+ Add <name> as new doctor" -> "Save & Use" flow (PRD sec.5).
 */
export async function createDoctor(input: NewDoctor): Promise<Doctor> {
  await run(
    `INSERT INTO doctors (name, address, phone, gstin, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [input.name, input.address ?? null, input.phone ?? null, input.gstin ?? null, input.notes ?? null]
  );
  const rows = await query<Doctor>(
    `SELECT * FROM doctors ORDER BY id DESC LIMIT 1`
  );
  return rows[0];
}

export async function updateDoctor(id: number, input: Partial<NewDoctor>): Promise<void> {
  const existing = await getDoctor(id);
  if (!existing) throw new Error(`Doctor ${id} not found`);
  await run(
    `UPDATE doctors
     SET name = ?, address = ?, phone = ?, gstin = ?, notes = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      input.name ?? existing.name,
      input.address ?? existing.address,
      input.phone ?? existing.phone,
      input.gstin ?? existing.gstin,
      input.notes ?? existing.notes,
      id,
    ]
  );
}

export async function setDoctorActive(id: number, active: boolean): Promise<void> {
  await run(`UPDATE doctors SET active = ?, updated_at = NOW() WHERE id = ?`, [
    active ? 1 : 0,
    id,
  ]);
}

/** How many bills reference this doctor — used to decide whether deleting them is safe. */
export async function countBillsForDoctor(id: number): Promise<number> {
  const rows = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM bills WHERE doctor_id = ?`,
    [id]
  );
  return rows[0]?.count ?? 0;
}

/**
 * Deletes a doctor outright. bills.doctor_id has no ON DELETE clause, so
 * this fails at the SQLite level if any bill still references them —
 * callers should check countBillsForDoctor first and surface that instead
 * of a raw constraint error.
 */
export async function deleteDoctor(id: number): Promise<void> {
  await run(`DELETE FROM doctors WHERE id = ?`, [id]);
}
