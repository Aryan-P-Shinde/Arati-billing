import { query, run, transaction } from "./index.js";
import type { Company } from "../lib/billNumber.js";

export interface Product {
  id: number;
  name: string;
  company: Company;
  pack_size: string | null;
  mrp: number;
  wholesale_rate: number;
  hsn: string | null;
  tax_rate: number | null;
  notes: string | null;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface NewProduct {
  name: string;
  company: Company;
  pack_size?: string;
  mrp: number;
  wholesale_rate: number;
  hsn?: string;
  tax_rate?: number;
  notes?: string;
}

/** "shar" -> S. Sharlax, S. Sharcof (PRD sec.7/27). Scoped to one company's catalog. */
export async function searchProducts(term: string, company: Company, limit = 10): Promise<Product[]> {
  const trimmed = term.trim();
  if (!trimmed) {
    return query<Product>(
      `SELECT * FROM products WHERE active = 1 AND company = ? ORDER BY name LIMIT ?`,
      [company, limit]
    );
  }
  return query<Product>(
    `SELECT * FROM products
     WHERE active = 1 AND company = ? AND name ILIKE ?
     ORDER BY name LIMIT ?`,
    [company, `%${trimmed}%`, limit]
  );
}

export interface ProductGroup {
  name: string;
  variants: Product[];
}

/**
 * Same search as searchProducts, but collapses rows that share a name
 * (i.e. the same product across different pack sizes — see CSV import,
 * ACIDROX has 60/120/600/1200 TABS as 4 separate product rows) into one
 * group. Powers the two-stage picker: pick the name, then the pack size.
 * A name with only one pack size still comes back as a group of one, so
 * callers can auto-select it without a second step.
 */
export async function searchProductGroups(
  term: string,
  company: Company,
  limit = 10
): Promise<ProductGroup[]> {
  const trimmed = term.trim();
  const rows = trimmed
    ? await query<Product>(
        `SELECT * FROM products
         WHERE active = 1 AND company = ? AND name ILIKE ?
         ORDER BY name, pack_size`,
        [company, `%${trimmed}%`]
      )
    : await query<Product>(
        `SELECT * FROM products WHERE active = 1 AND company = ? ORDER BY name, pack_size`,
        [company]
      );

  const groups = new Map<string, ProductGroup>();
  for (const row of rows) {
    const key = row.name.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.variants.push(row);
    } else {
      groups.set(key, { name: row.name, variants: [row] });
    }
  }
  return Array.from(groups.values()).slice(0, limit);
}

export async function getProduct(id: number): Promise<Product | undefined> {
  const rows = await query<Product>(`SELECT * FROM products WHERE id = ?`, [id]);
  return rows[0];
}

/** Case-insensitive exact match within a company — used by CSV import to skip duplicates. */
export async function findProductByName(name: string, company: Company): Promise<Product | undefined> {
  const rows = await query<Product>(
    `SELECT * FROM products WHERE company = ? AND name ILIKE ? LIMIT 1`,
    [company, name]
  );
  return rows[0];
}

/** "+ Add <name>" -> "Save & Use" flow (PRD sec.8). */
export async function createProduct(input: NewProduct): Promise<Product> {
  await run(
    `INSERT INTO products (name, company, pack_size, mrp, wholesale_rate, hsn, tax_rate, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.company,
      input.pack_size ?? null,
      input.mrp,
      input.wholesale_rate,
      input.hsn ?? null,
      input.tax_rate ?? null,
      input.notes ?? null,
    ]
  );
  const rows = await query<Product>(`SELECT * FROM products ORDER BY id DESC LIMIT 1`);
  return rows[0];
}

/**
 * Updates the product's master rate. Per PRD sec.11 this NEVER touches
 * existing bill_items — those keep their own wholesale_rate_snapshot.
 */
export async function updateProduct(id: number, input: Partial<NewProduct>): Promise<void> {
  const existing = await getProduct(id);
  if (!existing) throw new Error(`Product ${id} not found`);
  await run(
    `UPDATE products
     SET name = ?, company = ?, pack_size = ?, mrp = ?, wholesale_rate = ?, hsn = ?, tax_rate = ?, notes = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      input.name ?? existing.name,
      input.company ?? existing.company,
      input.pack_size ?? existing.pack_size,
      input.mrp ?? existing.mrp,
      input.wholesale_rate ?? existing.wholesale_rate,
      input.hsn ?? existing.hsn,
      input.tax_rate ?? existing.tax_rate,
      input.notes ?? existing.notes,
      id,
    ]
  );
}

export async function setProductActive(id: number, active: boolean): Promise<void> {
  await run(`UPDATE products SET active = ?, updated_at = NOW() WHERE id = ?`, [
    active ? 1 : 0,
    id,
  ]);
}

/**
 * Deletes a product outright. Always safe: bill_items.product_id is
 * ON DELETE SET NULL, and every bill_item already carries its own
 * name/pack/rate snapshot, so past bills render exactly as they did
 * before — only the ability to pick this product on a *new* bill goes
 * away.
 */
export async function deleteProduct(id: number): Promise<void> {
  await run(`DELETE FROM products WHERE id = ?`, [id]);
}

/**
 * Deletes every product in one go. Always safe regardless of existing
 * bills — bill_items.product_id is ON DELETE SET NULL and every item
 * already carries its own name/pack/rate snapshot, so past bills are
 * unaffected either way.
 */
export async function deleteAllProducts(): Promise<void> {
  await run(`DELETE FROM products`);
}

/**
 * Inserts many products in a single transaction instead of one write per
 * row — matters once this is a 200+ row CSV import instead of a one-off add.
 */
export async function bulkCreateProducts(products: NewProduct[]): Promise<number> {
  return transaction(async (client) => {
    for (const p of products) {
      await client.query(
        `INSERT INTO products (name, company, pack_size, mrp, wholesale_rate, hsn, tax_rate, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          p.name,
          p.company,
          p.pack_size ?? null,
          p.mrp,
          p.wholesale_rate,
          p.hsn ?? null,
          p.tax_rate ?? null,
          p.notes ?? null,
        ]
      );
    }
    return products.length;
  });
}
