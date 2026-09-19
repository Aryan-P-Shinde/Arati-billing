import { apiFetch } from "./api";
import type { Company } from "../lib/billNumber";

export interface Bill {
  id: number;
  bill_number: string | null;
  company: Company;
  bill_date: string;
  doctor_id: number;
  gross_amount: number;
  add_amount: number;
  reduction_percent: number;
  less_amount: number;
  net_amount: number;
  remark: string | null;
  status: "draft" | "finalized";
  payment_status: "unpaid" | "paid";
  created_at: string;
  updated_at: string;
}

export interface BillItem {
  id: number;
  bill_id: number;
  product_id: number | null;
  product_name_snapshot: string;
  pack_size_snapshot: string | null;
  quantity: number;
  mrp_snapshot: number;
  wholesale_rate_snapshot: number;
  total_rate: number;
  sort_order: number;
}

export interface DraftBillItemInput {
  product_id: number | null;
  product_name: string;
  pack_size: string | null;
  quantity: number;
  mrp: number;
  wholesale_rate: number;
}

export interface CreateBillInput {
  doctor_id: number;
  company: Company;
  bill_date?: string;
  items: DraftBillItemInput[];
  add_amount?: number;
  less_amount?: number;
  remark?: string;
}

export interface UpdateBillInput {
  items: DraftBillItemInput[];
  add_amount?: number;
  less_amount?: number;
  remark?: string;
}

export interface BillTotals {
  gross_amount: number;
  less_amount: number;
  net_amount: number;
}

export interface CreatedBill {
  id: number;
  billNumber: string;
}

/**
 * Kept as a pure client-side function, unchanged in shape — BillForm calls
 * this on every keystroke to show live totals before the bill is ever
 * saved, so it can't be a network round trip. The server recomputes the
 * same thing itself when the bill is actually created/updated, as the
 * source of truth.
 *
 * Reduction is a direct rupee amount, not a percentage — your father's
 * discounts are picked as an amount (often specifically to round the
 * final total), not a fixed percent of the bill.
 */
export function computeTotals(
  items: Pick<DraftBillItemInput, "quantity" | "wholesale_rate">[],
  add_amount: number,
  less_amount: number
): BillTotals {
  const gross_amount = items.reduce((sum, i) => sum + i.quantity * i.wholesale_rate, 0);
  const net_amount = gross_amount + add_amount - less_amount;
  return { gross_amount, less_amount, net_amount };
}

export async function createBill(input: CreateBillInput): Promise<CreatedBill> {
  return apiFetch<CreatedBill>("/api/bills", { method: "POST", body: input });
}

export async function updateBill(billId: number, input: UpdateBillInput): Promise<void> {
  await apiFetch<Bill & { items: BillItem[] }>(`/api/bills/${billId}`, { method: "PUT", body: input });
}

export async function deleteBill(billId: number): Promise<void> {
  await apiFetch<void>(`/api/bills/${billId}`, { method: "DELETE" });
}

export async function getBill(id: number): Promise<Bill | undefined> {
  try {
    const result = await apiFetch<Bill & { items: BillItem[] }>(`/api/bills/${id}`);
    return result;
  } catch {
    return undefined;
  }
}

export async function getBillItems(billId: number): Promise<BillItem[]> {
  const result = await apiFetch<Bill & { items: BillItem[] }>(`/api/bills/${billId}`);
  return result.items;
}

export async function listBillsForDoctor(doctorId: number, limit = 20): Promise<Bill[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiFetch<Bill[]>(`/api/bills/by-doctor/${doctorId}?${params}`);
}

export interface BillWithDoctorName extends Bill {
  doctor_name: string;
}

/**
 * Every bill across every doctor, newest first, with the doctor's name
 * joined in — powers the Ledger screen. Deliberately unbounded, so an
 * old unpaid bill never silently drops off a "recent N" cutoff.
 */
export async function listAllBills(): Promise<BillWithDoctorName[]> {
  return apiFetch<BillWithDoctorName[]>("/api/bills");
}

/** Marks a bill as paid or unpaid — the only thing the Ledger screen ever writes. */
export async function setBillPaymentStatus(id: number, paymentStatus: "unpaid" | "paid"): Promise<void> {
  await apiFetch<Bill>(`/api/bills/${id}/payment-status`, {
    method: "POST",
    body: { payment_status: paymentStatus },
  });
}

/** Deletes every bill and resets both companies' bill-number counters back to 1. */
export async function deleteAllBills(): Promise<void> {
  await apiFetch<void>("/api/bills/all", { method: "DELETE" });
}
