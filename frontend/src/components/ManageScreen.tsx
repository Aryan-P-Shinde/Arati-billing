import { useEffect, useState } from "react";
import { searchDoctors, countBillsForDoctor, deleteDoctor, type Doctor } from "../db/doctors";
import { searchProducts, deleteProduct, type Product } from "../db/products";
import { COMPANY_LABELS, type Company } from "../lib/billNumber";

const COMPANIES: Company[] = ["sharangdhar", "leadgen"];

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
    </div>
  );
}

export function ManageScreen() {
  return (
    <div className="workspace manage-workspace">
      <DoctorsPanel />
      <ProductsPanel />
    </div>
  );
}
