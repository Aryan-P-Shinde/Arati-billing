import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { ProductPicker } from "./ProductPicker";
import { updateBill, deleteBill, computeTotals, type Bill, type BillItem, type DraftBillItemInput } from "../db/bills";
import type { Product } from "../db/products";
import { COMPANY_LABELS } from "../lib/billNumber";

interface LineItem extends DraftBillItemInput {
  key: string;
}

function itemsFromBillItems(items: BillItem[]): LineItem[] {
  return items.map((item) => ({
    key: `${item.id}`,
    product_id: item.product_id,
    product_name: item.product_name_snapshot,
    pack_size: item.pack_size_snapshot,
    quantity: item.quantity,
    mrp: item.mrp_snapshot,
    wholesale_rate: item.wholesale_rate_snapshot,
  }));
}

export function EditBillModal({
  bill,
  billItems,
  onClose,
  onSaved,
  onDeleted,
}: {
  bill: Bill;
  billItems: BillItem[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [items, setItems] = useState<LineItem[]>(() => itemsFromBillItems(billItems));
  const [addAmount, setAddAmount] = useState(String(bill.add_amount));
  const [reductionPercent, setReductionPercent] = useState(String(bill.reduction_percent));
  const [remark, setRemark] = useState(bill.remark ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () => computeTotals(items, Number(addAmount) || 0, Number(reductionPercent) || 0),
    [items, addAmount, reductionPercent]
  );

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
    if (items.length === 0) {
      setError("A bill needs at least one item.");
      return;
    }
    setSaving(true);
    try {
      await updateBill(bill.id, {
        items,
        add_amount: Number(addAmount) || 0,
        reduction_percent: Number(reductionPercent) || 0,
        remark: remark.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteBill(bill.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bill");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Edit bill ${bill.bill_number ?? `#${bill.id}`} — ${COMPANY_LABELS[bill.company]}`}
      onClose={onClose}
      wide
    >
      <div className="picker">
        <label>Add item</label>
        <ProductPicker company={bill.company} onSelect={addProductAsLine} />
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
                <td>{item.product_name}</td>
                <td>{item.pack_size ?? "—"}</td>
                <td>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={item.quantity}
                    onChange={(e) => updateLine(item.key, { quantity: Number(e.target.value) || 0 })}
                  />
                </td>
                <td>
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
                <td className="num">₹{(item.quantity * item.wholesale_rate).toFixed(2)}</td>
                <td>
                  <button className="link danger" onClick={() => removeLine(item.key)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="hint">No items on this bill.</p>
      )}

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
          Reduction (%)
          <input
            type="number"
            inputMode="decimal"
            value={reductionPercent}
            onChange={(e) => setReductionPercent(e.target.value)}
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

      {confirmingDelete ? (
        <div className="delete-confirm">
          <p className="error">Delete this bill permanently? This can't be undone.</p>
          <div className="form-actions">
            <button className="secondary" onClick={() => setConfirmingDelete(false)} disabled={saving}>
              Cancel
            </button>
            <button className="danger-btn" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Yes, delete bill"}
            </button>
          </div>
        </div>
      ) : (
        <div className="form-actions">
          <button className="secondary danger-text" onClick={() => setConfirmingDelete(true)} disabled={saving}>
            Delete bill
          </button>
          <button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}
    </Modal>
  );
}
