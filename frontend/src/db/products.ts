import { apiFetch, PinRequiredError } from "./api";
import type { Company } from "../lib/billNumber";

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

export interface ProductGroup {
  name: string;
  variants: Product[];
}

/** "shar" -> S. Sharlax, S. Sharcof (PRD sec.7/27). Scoped to one company's catalog. */
export async function searchProducts(term: string, company: Company, limit = 10): Promise<Product[]> {
  const params = new URLSearchParams({ q: term, company, limit: String(limit) });
  return apiFetch<Product[]>(`/api/products?${params}`);
}

/**
 * Same search as searchProducts, but grouped by name (multiple pack sizes
 * per product collapse into one entry) — powers the two-stage picker.
 */
export async function searchProductGroups(
  term: string,
  company: Company,
  limit = 10
): Promise<ProductGroup[]> {
  const params = new URLSearchParams({ q: term, company, limit: String(limit), grouped: "true" });
  return apiFetch<ProductGroup[]>(`/api/products?${params}`);
}

export async function getProduct(id: number): Promise<Product | undefined> {
  try {
    return await apiFetch<Product>(`/api/products/${id}`);
  } catch (err) {
    if (err instanceof PinRequiredError) throw err;
    return undefined;
  }
}

/** Case-insensitive exact match within a company — used by CSV import to skip duplicates. */
export async function findProductByName(name: string, company: Company): Promise<Product | undefined> {
  const params = new URLSearchParams({ name, company });
  try {
    return await apiFetch<Product>(`/api/products/by-name?${params}`);
  } catch (err) {
    if (err instanceof PinRequiredError) throw err;
    return undefined;
  }
}

/** "+ Add <name>" -> "Save & Use" flow (PRD sec.8). */
export async function createProduct(input: NewProduct): Promise<Product> {
  return apiFetch<Product>("/api/products", { method: "POST", body: input });
}

/**
 * Updates the product's master rate. Per PRD sec.11 this NEVER touches
 * existing bill_items — those keep their own wholesale_rate_snapshot
 * (enforced server-side, unchanged from before).
 */
export async function updateProduct(id: number, input: Partial<NewProduct>): Promise<void> {
  await apiFetch<Product>(`/api/products/${id}`, { method: "PUT", body: input });
}

export async function setProductActive(id: number, active: boolean): Promise<void> {
  await apiFetch<Product>(`/api/products/${id}/active`, { method: "POST", body: { active } });
}

export async function deleteProduct(id: number): Promise<void> {
  await apiFetch<void>(`/api/products/${id}`, { method: "DELETE" });
}

/** Deletes every product in one go. Always safe — past bills keep their own item snapshots. */
export async function deleteAllProducts(): Promise<void> {
  await apiFetch<void>("/api/products/all", { method: "DELETE" });
}

/** Bulk CSV import (PRD sec.9) — one request instead of one per row. */
export async function bulkCreateProducts(products: NewProduct[]): Promise<number> {
  const { count } = await apiFetch<{ count: number }>("/api/products/bulk", {
    method: "POST",
    body: { products },
  });
  return count;
}
