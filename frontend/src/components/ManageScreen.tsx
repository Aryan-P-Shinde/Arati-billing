import { useEffect, useState } from "react";
import {
  searchDoctors,
  countBillsForDoctor,
  deleteDoctor,
  deleteAllDoctors,
  type Doctor,
} from "../db/doctors";
import { searchProducts, deleteProduct, deleteAllProducts, type Product } from "../db/products";
import { deleteAllBills } from "../db/bills";
import { COMPANY_LABELS, type Company } from "../lib/billNumber";

const COMPANIES: Company[] = ["sharangdhar", "leadgen"];

/**
 * Shared "type DELETE to confirm" flow for wiping an entire category at
 * once — same language/pattern as the Backup tab's "Reset app data", just
 * scoped to one table instead of everything.
 */
function ClearAllSection({
  label,
  warning,
  onClear,
  onCleared,
}: {
  label: string;
  warning: string;
  onClear: () => Promise<void>;
  onCleared: () => Promise<void> | void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState("");
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setClearing(true);
    setError(null);
    try {
      await onClear();
      setConfirming(false);
      setText("");
      await onCleared();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      {!confirming ? (
        <button className="link danger" onClick={() => setConfirming(true)}>
          Clear all {label}...
        </button>
      ) : (
        <div className="delete-confirm">
          <p className="error">
            {warning} Type <b>DELETE</b> below to confirm.
          </p>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type DELETE to confirm"
            style={{ marginBottom: 8 }}
          />
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button
              className="secondary"
              onClick={() => {
                setConfirming(false);
                setText("");
                setError(null);
              }}
              disabled={clearing}
            >
              Cancel
            </button>
            <button
              className="danger-btn"
              onClick={handleConfirm}
              disabled={clearing || text.trim() !== "DELETE"}
            >
              {clearing ? "Clearing..." : `Clear all ${label}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DoctorsPanel() {
  const [term, setTerm] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    searchDoctors(term, 200).then(setDoctors);
  }, [term]);

  async function refresh() {
    setDoctors(await searchDoctors(term, 200));
  }

  async function handleDeleteClick(doctor: Doctor) {
    setBlockedMessage(null);
    const billCount = await countBillsForDoctor(doctor.id);
    if (billCount > 0) {
      setBlockedMessage(
        `Can't delete ${doctor.name} — ${billCount} bill${billCount === 1 ? "" : "s"} still ` +
          `reference them. Delete those bills first (from the Bills tab) if you want this doctor gone too.`
      );
      return;
    }
    setConfirmId(doctor.id);
  }

  async function confirmDelete(id: number) {
    setBusyId(id);
    try {
      await deleteDoctor(id);
      setConfirmId(null);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">Doctors</div>
      <input
        placeholder="Search doctors..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      {blockedMessage && <p className="error">{blockedMessage}</p>}
      {doctors.length === 0 ? (
        <p className="hint">No doctors found.</p>
      ) : (
        <ul className="manage-list">
          {doctors.map((doctor) => (
            <li key={doctor.id}>
              <div className="manage-row">
                <div>
                  <div className="manage-row-title">{doctor.name}</div>
                  {doctor.phone && <div className="manage-row-sub">{doctor.phone}</div>}
                </div>
                {confirmId === doctor.id ? (
                  <div className="manage-row-confirm">
                    <button
                      className="danger-btn"
                      onClick={() => confirmDelete(doctor.id)}
                      disabled={busyId === doctor.id}
                    >
                      {busyId === doctor.id ? "Deleting..." : "Confirm"}
                    </button>
                    <button className="secondary" onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="link danger" onClick={() => handleDeleteClick(doctor)}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ClearAllSection
        label="doctors"
        warning="This permanently deletes every doctor. Blocked if any bills still exist — clear bills first if you need to wipe doctors too."
        onClear={deleteAllDoctors}
        onCleared={refresh}
      />
    </div>
  );
}

function ProductsPanel() {
  const [company, setCompany] = useState<Company>("sharangdhar");
  const [term, setTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    searchProducts(term, company, 500).then(setProducts);
  }, [term, company]);

  async function refresh() {
    setProducts(await searchProducts(term, company, 500));
  }

  async function confirmDelete(id: number) {
    setBusyId(id);
    try {
      await deleteProduct(id);
      setConfirmId(null);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">Products</div>
      <div className="company-toggle" style={{ marginBottom: 10 }}>
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
      <input
        placeholder="Search products..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      {products.length === 0 ? (
        <p className="hint">No products found.</p>
      ) : (
        <ul className="manage-list">
          {products.map((product) => (
            <li key={product.id}>
              <div className="manage-row">
                <div>
                  <div className="manage-row-title">{product.name}</div>
                  <div className="manage-row-sub">
                    {product.pack_size ? `${product.pack_size} — ` : ""}
                    MRP ₹{product.mrp} / WS ₹{product.wholesale_rate}
                  </div>
                </div>
                {confirmId === product.id ? (
                  <div className="manage-row-confirm">
                    <button
                      className="danger-btn"
                      onClick={() => confirmDelete(product.id)}
                      disabled={busyId === product.id}
                    >
                      {busyId === product.id ? "Deleting..." : "Confirm"}
                    </button>
                    <button className="secondary" onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="link danger" onClick={() => setConfirmId(product.id)}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ClearAllSection
        label="products"
        warning="This permanently deletes every product (in both companies' catalogs). Past bills keep their own snapshot of what was billed, so existing bill history is unaffected."
        onClear={deleteAllProducts}
        onCleared={refresh}
      />
    </div>
  );
}

function BillsPanel() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="panel" style={{ gridColumn: "1 / -1" }}>
      <div className="panel-title">Bills</div>
      <p className="hint" style={{ marginBottom: 4 }}>
        Individual bills are edited or deleted from the Bills tab. This clears every bill at once —
        useful for wiping test data before going live. Bill numbering restarts from #1 for each
        company afterwards.
      </p>
      {message && <p className="success">{message}</p>}
      <ClearAllSection
        label="bills"
        warning="This permanently deletes every bill and its line items. Bill numbering restarts from #1 for each company."
        onClear={deleteAllBills}
        onCleared={() => setMessage("All bills cleared.")}
      />
    </div>
  );
}

export function ManageScreen() {
  return (
    <div className="workspace manage-workspace">
      <DoctorsPanel />
      <ProductsPanel />
      <BillsPanel />
    </div>
  );
}
