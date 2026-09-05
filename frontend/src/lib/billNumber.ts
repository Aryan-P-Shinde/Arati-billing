export type Company = "sharangdhar" | "leadgen";

export const COMPANY_LABELS: Record<Company, string> = {
  sharangdhar: "Sharangdhar",
  leadgen: "Leadgen",
};

export const COMPANY_PREFIXES: Record<Company, string> = {
  sharangdhar: "S",
  leadgen: "L",
};

/**
 * S-259/2-25 — prefix, running sequence number (never resets), then the
 * issue month/year (no leading zero on the month, 2-digit year) purely
 * as a record of when it was issued.
 */
export function formatBillNumber(company: Company, sequence: number, billDateIso: string): string {
  const [year, month] = billDateIso.split("-");
  const monthNoLeadingZero = String(Number(month));
  const year2 = year.slice(-2);
  return `${COMPANY_PREFIXES[company]}-${sequence}/${monthNoLeadingZero}-${year2}`;
}
