import { useMemo, useState } from "react";
import type { Doctor } from "../db/doctors";
import type { Product } from "../db/products";
import { createBill, computeTotals, type DraftBillItemInput } from "../db/bills";
import { COMPANY_LABELS, type Company } from "../lib/billNumber";
import { DoctorPicker } from "./DoctorPicker";
import { ProductPicker } from "./ProductPicker";
import { InvoicePrintControls } from "./InvoicePrintControls";
import type { PrintBillData } from "../pdf/types";

interface LineItem extends DraftBillItemInput {
  key: string;
}

const COMPANIES: Company[] = ["sharangdhar", "leadgen"];

export function BillForm() {
  const [company, setCompany] = useState<Company>("sharangdhar");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [addAmount, setAddAmount] = useState("0");
  const [lessAmount, setLessAmount] = useState("0");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedBillNumber, setSavedBillNumber] = useState<string | null>(null);
  const [printData, setPrintData] = useState<PrintBillData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () => computeTotals(items, Number(addAmount) || 0, Number(lessAmount) || 0),
    [items, addAmount, lessAmount]
  );

  function switchCompany(next: Company) {
    if (next === company) return;
    // Products are scoped per company — a line item from one company's
    // catalog isn't valid on the other's bill number series.
    setCompany(next);
    setItems([]);
  }

  function addProductAsLine(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        key: `${product.id}-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        pack_size: product.pack_size,
        quantity: 1,
        mrp: product.mrp,
        wholesale_rate: product.wholesale_rate,
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeLine(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  async function handleSave() {
    setError(null);
    if (!doctor) {
      setError("Select a doctor first.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one item.");
      return;
    }
    setSaving(true);
    try {
      const { billNumber } = await createBill({
        doctor_id: doctor.id,
        company,
        items,
        add_amount: Number(addAmount) || 0,
        less_amount: Number(lessAmount) || 0,
        remark: remark.trim() || undefined,
      });
      setSavedBillNumber(billNumber);
      setPrintData({
        billNumber,
        billDate: new Date().toISOString().slice(0, 10),
        doctorName: doctor.name,
        doctorAddress: doctor.address,
        items: items.map((item, i) => ({
          slNo: i + 1,
          productName: item.product_name,
          packSize: item.pack_size,
          quantity: item.quantity,
          mrp: item.mrp,
          wholesaleRate: item.wholesale_rate,
          totalRate: item.quantity * item.wholesale_rate,
        })),
        grossAmount: totals.gross_amount,
        addAmount: Number(addAmount) || 0,
        lessAmount: totals.less_amount,
        netAmount: totals.net_amount,
        remark: remark.trim() || null,
      });
      setItems([]);
      setAddAmount("0");
      setLessAmount("0");
      setRemark("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="workspace">
      <div className="panel">
        <div className="panel-title">Bill details</div>

        <label>Company</label>
        <div className="company-toggle">
          {COMPANIES.map((c) => (
            <button
              key={c}
              type="button"
              className={c === company ? "company-option active" : "company-option"}
              onClick={() => switchCompany(c)}
            >
              {COMPANY_LABELS[c]}
            </button>
          ))}
        </div>

        <DoctorPicker selected={doctor} onSelect={setDoctor} />

        <div className="picker">
          <label>Add item</label>
          <ProductPicker company={company} onSelect={addProductAsLine} />
        </div>

        {items.length > 0 ? (
          <table className="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Pack</th>
                <th>Qty</th>
                <th>Rate (₹)</th>
                <th>Total (₹)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key}>
                  <td data-label="Product">{item.product_name}</td>
                  <td data-label="Pack">{item.pack_size ?? "—"}</td>
                  <td data-label="Qty">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={item.quantity}
                      onChange={(e) =>
                        updateLine(item.key, { quantity: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td data-label="Rate (₹)">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={item.wholesale_rate}
                      onChange={(e) =>
                        updateLine(item.key, { wholesale_rate: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="num" data-label="Total (₹)">
                    ₹{(item.quantity * item.wholesale_rate).toFixed(2)}
                  </td>
                  <td data-label="">
                    <button className="link danger" onClick={() => removeLine(item.key)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="hint">No items added yet.</p>
        )}
      </div>

      <div className="summary-rail">
        <div className="panel">
          <div className="panel-title">Summary</div>
          <p className="hint" style={{ marginBottom: 10 }}>
            {COMPANY_LABELS[company]} · {doctor ? doctor.name : "No doctor selected"} ·{" "}
            {items.length} item{items.length === 1 ? "" : "s"}
          </p>

          <div className="totals-block">
            <label className="inline">
              Add (₹)
              <input
                type="number"
                inputMode="decimal"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
              />
            </label>
            <label className="inline">
              Reduction (₹)
              <input
                type="number"
                inputMode="decimal"
                value={lessAmount}
                onChange={(e) => setLessAmount(e.target.value)}
              />
            </label>
            <div className="totals-summary">
              <div>
                <span>Gross</span>
                <span>₹{totals.gross_amount.toFixed(2)}</span>
              </div>
              <div>
                <span>Less</span>
                <span>₹{totals.less_amount.toFixed(2)}</span>
              </div>
              <div className="net">
                <span>Net</span>
                <span>₹{totals.net_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <label>
            Remark
            <input value={remark} onChange={(e) => setRemark(e.target.value)} />
          </label>

          {error && <p className="error">{error}</p>}
          {savedBillNumber !== null && (
            <p className="success">Saved as bill {savedBillNumber}.</p>
          )}

          <button className="save-bill" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save bill"}
          </button>
        </div>

        {printData && (
          <div className="panel">
            <div className="panel-title">Print</div>
            <InvoicePrintControls data={printData} />
          </div>
        )}
      </div>
    </div>
  );
}
