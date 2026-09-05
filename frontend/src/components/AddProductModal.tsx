import { useState } from "react";
import { Modal } from "./Modal";
import { createProduct, type Product } from "../db/products";
import { COMPANY_LABELS, type Company } from "../lib/billNumber";

export function AddProductModal({
  initialName,
  company,
  onClose,
  onCreated,
}: {
  initialName: string;
  company: Company;
  onClose: () => void;
  onCreated: (product: Product) => void;
}) {
  const [name, setName] = useState(initialName);
  const [packSize, setPackSize] = useState("");
  const [mrp, setMrp] = useState("");
  const [wholesaleRate, setWholesaleRate] = useState("");
  const [hsn, setHsn] = useState("");
  const [saving, setSaving] = useState(false);

  const mrpNum = Number(mrp);
  const wholesaleNum = Number(wholesaleRate);
  const valid = name.trim() && mrp !== "" && !Number.isNaN(mrpNum) && wholesaleRate !== "" && !Number.isNaN(wholesaleNum);

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    const product = await createProduct({
      name: name.trim(),
      company,
      pack_size: packSize.trim() || undefined,
      mrp: mrpNum,
      wholesale_rate: wholesaleNum,
      hsn: hsn.trim() || undefined,
    });
    setSaving(false);
    onCreated(product);
  }

  return (
    <Modal title={`Add new product — ${COMPANY_LABELS[company]}`} onClose={onClose}>
      <div className="form">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label>
          Pack size
          <input
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            placeholder="e.g. 10x10 tab"
          />
        </label>
        <div className="form-row-2">
          <label>
            MRP (₹)
            <input
              type="number"
              inputMode="decimal"
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
            />
          </label>
          <label>
            Wholesale rate (₹)
            <input
              type="number"
              inputMode="decimal"
              value={wholesaleRate}
              onChange={(e) => setWholesaleRate(e.target.value)}
            />
          </label>
        </div>
        <label>
          HSN (optional)
          <input value={hsn} onChange={(e) => setHsn(e.target.value)} />
        </label>
        <div className="form-actions">
          <button onClick={onClose} className="secondary" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !valid}>
            {saving ? "Saving..." : "Save & Use"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
