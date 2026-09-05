import { useMemo, useState } from "react";
import { parseCsvFile, type ParsedCsv } from "../lib/csv";
import { findProductByName, bulkCreateProducts, type NewProduct } from "../db/products";
import { COMPANY_LABELS, type Company } from "../lib/billNumber";

const COMPANIES: Company[] = ["sharangdhar", "leadgen"];

interface FieldMapping {
  name: string;
  packSize: string;
  mrp: string;
  wholesaleRate: string;
  hsn: string;
}

const EMPTY_MAPPING: FieldMapping = { name: "", packSize: "", mrp: "", wholesaleRate: "", hsn: "" };

function guessColumn(headers: string[], keywords: string[]): string {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return headers[idx];
  }
  return "";
}

function guessMapping(headers: string[]): FieldMapping {
  return {
    name: guessColumn(headers, ["product name", "name", "item"]),
    packSize: guessColumn(headers, ["pack size", "pack", "size"]),
    mrp: guessColumn(headers, ["mrp"]),
    wholesaleRate: guessColumn(headers, ["wholesale", "rate", "price"]),
    hsn: guessColumn(headers, ["hsn"]),
  };
}

interface ImportResult {
  imported: number;
  skippedDuplicate: number;
  skippedInvalid: number;
}

export function ImportProductsScreen() {
  const [company, setCompany] = useState<Company>("sharangdhar");
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<FieldMapping>(EMPTY_MAPPING);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mappingValid = mapping.name && mapping.mrp && mapping.wholesaleRate;

  const preview = useMemo(() => {
    if (!csv) return [];
    return csv.rows.slice(0, 5).map((row) => ({
      name: mapping.name ? row[mapping.name] : "",
      packSize: mapping.packSize ? row[mapping.packSize] : "",
      mrp: mapping.mrp ? row[mapping.mrp] : "",
      wholesaleRate: mapping.wholesaleRate ? row[mapping.wholesaleRate] : "",
    }));
  }, [csv, mapping]);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const parsed = await parseCsvFile(file);
      setCsv(parsed);
      setMapping(guessMapping(parsed.headers));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read CSV");
    }
  }

  async function handleImport() {
    if (!csv || !mappingValid) return;
    setImporting(true);
    setError(null);
    try {
      const candidates: NewProduct[] = [];
      let skippedInvalid = 0;
      let skippedDuplicate = 0;

      for (const row of csv.rows) {
        const name = (row[mapping.name] ?? "").trim();
        const mrp = Number(row[mapping.mrp]);
        const wholesaleRate = Number(row[mapping.wholesaleRate]);

        if (!name || !Number.isFinite(mrp) || !Number.isFinite(wholesaleRate)) {
          skippedInvalid++;
          continue;
        }

        const existing = await findProductByName(name, company);
        if (existing) {
          skippedDuplicate++;
          continue;
        }

        candidates.push({
          name,
          company,
          pack_size: mapping.packSize ? row[mapping.packSize]?.trim() || undefined : undefined,
          mrp,
          wholesale_rate: wholesaleRate,
          hsn: mapping.hsn ? row[mapping.hsn]?.trim() || undefined : undefined,
        });
      }

      const imported = await bulkCreateProducts(candidates);
      setResult({ imported, skippedDuplicate, skippedInvalid });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="workspace">
      <div className="panel">
        <div className="panel-title">Import products from CSV</div>

        <label>Import into</label>
        <div className="company-toggle">
          {COMPANIES.map((c) => (
            <button
              key={c}
              type="button"
              className={c === company ? "company-option active" : "company-option"}
              onClick={() => setCompany(c)}
            >
              {COMPANY_LABELS[c]}
            </button>
          ))}
        </div>

        <label>
          CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>

        {csv && (
          <>
            <div className="panel-title" style={{ marginTop: 8 }}>Column mapping</div>
            <div className="mapping-grid">
              {(
                [
                  ["name", "Product name *"],
                  ["packSize", "Pack size"],
                  ["mrp", "MRP *"],
                  ["wholesaleRate", "Wholesale rate *"],
                  ["hsn", "HSN"],
                ] as [keyof FieldMapping, string][]
              ).map(([field, label]) => (
                <label key={field}>
                  {label}
                  <select
                    value={mapping[field]}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value }))}
                  >
                    <option value="">— not mapped —</option>
                    {csv.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="panel-title" style={{ marginTop: 8 }}>
              Preview ({csv.rows.length} rows total)
            </div>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Pack</th>
                  <th>MRP</th>
                  <th>Wholesale</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td>{row.name || "—"}</td>
                    <td>{row.packSize || "—"}</td>
                    <td className="num">{row.mrp || "—"}</td>
                    <td className="num">{row.wholesaleRate || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {error && <p className="error">{error}</p>}
            {result && (
              <p className="success">
                Imported {result.imported}. Skipped {result.skippedDuplicate} duplicate
                {result.skippedDuplicate === 1 ? "" : "s"}, {result.skippedInvalid} invalid row
                {result.skippedInvalid === 1 ? "" : "s"}.
              </p>
            )}

            <button className="save-bill" onClick={handleImport} disabled={!mappingValid || importing}>
              {importing ? "Importing..." : `Import into ${COMPANY_LABELS[company]}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
