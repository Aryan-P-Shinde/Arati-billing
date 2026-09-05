import { query, transaction } from "./index.js";
import { formatBillNumber, type Company } from "../lib/billNumber.js";

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
  wholesale_rate: number; // may be overridden from the product's master rate at billing time
}

export interface CreateBillInput {
  doctor_id: number;
  company: Company;
  bill_date?: string; // defaults to today
  items: DraftBillItemInput[];
  add_amount?: number;
  reduction_percent?: number;
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

export function computeTotals(
  items: Pick<DraftBillItemInput, "quantity" | "wholesale_rate">[],
  add_amount: number,
  reduction_percent: number
): BillTotals {
  const gross_amount = items.reduce((sum, i) => sum + i.quantity * i.wholesale_rate, 0);
  const less_amount = (gross_amount * reduction_percent) / 100;
  const net_amount = gross_amount + add_amount - less_amount;
  return { gross_amount, less_amount, net_amount };
}

/**
 * Creates a bill and its line items atomically, including assigning the
 * next bill number in the chosen company's series (S-.../L-...). The
 * counter increment, the bill insert, and the item inserts all happen in
 * one Postgres transaction, so a crash mid-save can't hand out a number
 * that never gets used, or use a number twice — and with every device
 * talking to this one shared database, this is also what makes the
 * numbering safe across multiple devices.
 */
export async function createBill(input: CreateBillInput): Promise<CreatedBill> {
  if (input.items.length === 0) {
    throw new Error("A bill needs at least one item");
  }

  const add_amount = input.add_amount ?? 0;
  const reduction_percent = input.reduction_percent ?? 0;
  const { gross_amount, less_amount, net_amount } = computeTotals(
    input.items,
    add_amount,
    reduction_percent
  );
  const billDate = input.bill_date ?? new Date().toISOString().slice(0, 10);

  return transaction(async (client) => {
    await client.query(
      `INSERT INTO bill_number_counters (company, next_number) VALUES ($1, 1)
       ON CONFLICT (company) DO NOTHING`,
      [input.company]
    );

    const counterResult = await client.query(
      `SELECT next_number FROM bill_number_counters WHERE company = $1 FOR UPDATE`,
      [input.company]
    );
    const sequence = counterResult.rows[0].next_number as number;

    await client.query(
      `UPDATE bill_number_counters SET next_number = next_number + 1 WHERE company = $1`,
      [input.company]
    );

    const billNumber = formatBillNumber(input.company, sequence, billDate);

    const billResult = await client.query(
      `INSERT INTO bills
        (bill_number, company, bill_date, doctor_id, gross_amount, add_amount, reduction_percent, less_amount, net_amount, remark, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
       RETURNING id`,
      [
        billNumber,
        input.company,
        billDate,
        input.doctor_id,
        gross_amount,
        add_amount,
        reduction_percent,
        less_amount,
        net_amount,
        input.remark ?? null,
      ]
    );
    const billId = billResult.rows[0].id as number;

    for (let index = 0; index < input.items.length; index++) {
      const item = input.items[index];
      await client.query(
        `INSERT INTO bill_items
          (bill_id, product_id, product_name_snapshot, pack_size_snapshot, quantity, mrp_snapshot, wholesale_rate_snapshot, total_rate, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          billId,
          item.product_id,
          item.product_name,
          item.pack_size,
          item.quantity,
          item.mrp,
          item.wholesale_rate,
          item.quantity * item.wholesale_rate,
          index,
        ]
      );
    }

    return { id: billId, billNumber };
  });
}

export interface UpdateBillInput {
  items: DraftBillItemInput[];
  add_amount?: number;
  reduction_percent?: number;
  remark?: string;
}

/**
 * Replaces a bill's line items and totals in place. The bill_number and
 * bill_date are never touched by an edit — only what's on the bill
 * changes, not when it was issued or which number it holds. Old
 * bill_items are dropped and re-inserted from scratch (simpler and safer
 * than diffing) inside one transaction, so a mid-edit failure can't leave
 * a bill with mismatched items and totals.
 */
export async function updateBill(billId: number, input: UpdateBillInput): Promise<void> {
  if (input.items.length === 0) {
    throw new Error("A bill needs at least one item");
  }
  const add_amount = input.add_amount ?? 0;
  const reduction_percent = input.reduction_percent ?? 0;
  const { gross_amount, less_amount, net_amount } = computeTotals(
    input.items,
    add_amount,
    reduction_percent
  );

  await transaction(async (client) => {
    await client.query(`DELETE FROM bill_items WHERE bill_id = $1`, [billId]);

    for (let index = 0; index < input.items.length; index++) {
      const item = input.items[index];
      await client.query(
        `INSERT INTO bill_items
          (bill_id, product_id, product_name_snapshot, pack_size_snapshot, quantity, mrp_snapshot, wholesale_rate_snapshot, total_rate, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          billId,
          item.product_id,
          item.product_name,
          item.pack_size,
          item.quantity,
          item.mrp,
          item.wholesale_rate,
          item.quantity * item.wholesale_rate,
          index,
        ]
      );
    }

    await client.query(
      `UPDATE bills
       SET gross_amount = $1, add_amount = $2, reduction_percent = $3, less_amount = $4, net_amount = $5, remark = $6, updated_at = NOW()
       WHERE id = $7`,
      [gross_amount, add_amount, reduction_percent, less_amount, net_amount, input.remark ?? null, billId]
    );
  });
}

/** Removes a bill and its line items (ON DELETE CASCADE) permanently. */
export async function deleteBill(billId: number): Promise<void> {
  await transaction(async (client) => {
    await client.query(`DELETE FROM bills WHERE id = $1`, [billId]);
  });
}

export async function getBill(id: number): Promise<Bill | undefined> {
  const rows = await query<Bill>(`SELECT * FROM bills WHERE id = ?`, [id]);
  return rows[0];
}

export async function getBillItems(billId: number): Promise<BillItem[]> {
  return query<BillItem>(
    `SELECT * FROM bill_items WHERE bill_id = ? ORDER BY sort_order`,
    [billId]
  );
}

export async function listBillsForDoctor(doctorId: number, limit = 20): Promise<Bill[]> {
  return query<Bill>(
    `SELECT * FROM bills WHERE doctor_id = ? ORDER BY bill_date DESC, id DESC LIMIT ?`,
    [doctorId, limit]
  );
}
