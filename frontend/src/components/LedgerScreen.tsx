import { useEffect, useMemo, useState } from "react";
import { listAllBills, setBillPaymentStatus, type BillWithDoctorName } from "../db/bills";

type Filter = "all" | "unpaid" | "paid";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function LedgerScreen() {
  const [bills, setBills] = useState<BillWithDoctorName[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBills(await listAllBills());
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "Failed to load bills."));
  }, []);

  const totals = useMemo(() => {
    const all = bills ?? [];
    const totalBilled = all.reduce((sum, b) => sum + b.net_amount, 0);
    const totalPaid = all
      .filter((b) => b.payment_status === "paid")
      .reduce((sum, b) => sum + b.net_amount, 0);
    return { totalBilled, totalPaid, totalPending: totalBilled - totalPaid };
  }, [bills]);

  const visibleBills = useMemo(() => {
    const all = bills ?? [];
    if (filter === "all") return all;
    return all.filter((b) => b.payment_status === filter);
  }, [bills, filter]);

  async function togglePaid(bill: BillWithDoctorName) {
    const next = bill.payment_status === "paid" ? "unpaid" : "paid";
    setBusyId(bill.id);
    // Optimistic update — the toggle should feel instant; re-fetching the
    // whole list on every tap would be wasteful.
    setBills((prev) =>
      prev ? prev.map((b) => (b.id === bill.id ? { ...b, payment_status: next } : b)) : prev
    );
    try {
      await setBillPaymentStatus(bill.id, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update payment status.");
      // Roll back on failure.
      setBills((prev) =>
        prev
          ? prev.map((b) => (b.id === bill.id ? { ...b, payment_status: bill.payment_status } : b))
          : prev
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">Ledger</div>

      <div className="ledger-summary">
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Total billed</span>
          <span className="ledger-summary-value">₹{totals.totalBilled.toFixed(2)}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Collected</span>
          <span className="ledger-summary-value ledger-good">₹{totals.totalPaid.toFixed(2)}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Yet to recover</span>
          <span className="ledger-summary-value ledger-bad">₹{totals.totalPending.toFixed(2)}</span>
        </div>
      </div>

      <div className="company-toggle" style={{ marginTop: 12, marginBottom: 10 }}>
        <button
          className={filter === "all" ? "company-option active" : "company-option"}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={filter === "unpaid" ? "company-option active" : "company-option"}
          onClick={() => setFilter("unpaid")}
        >
          Unpaid
        </button>
        <button
          className={filter === "paid" ? "company-option active" : "company-option"}
          onClick={() => setFilter("paid")}
        >
          Paid
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {bills === null ? (
        <p className="loading">Loading...</p>
      ) : visibleBills.length === 0 ? (
        <p className="hint">No bills{filter !== "all" ? ` marked ${filter}` : ""} yet.</p>
      ) : (
        <ul className="ledger-list">
          {visibleBills.map((bill) => (
            <li key={bill.id} className="ledger-item">
              <div className="ledger-item-main">
                <span className="ledger-doctor">{bill.doctor_name}</span>
                <span className="ledger-meta">
                  {bill.bill_number ?? "—"} · {formatDate(bill.bill_date)}
                </span>
              </div>
              <span className="ledger-amount">₹{bill.net_amount.toFixed(2)}</span>
              <button
                className={
                  bill.payment_status === "paid"
                    ? "ledger-status-toggle paid"
                    : "ledger-status-toggle unpaid"
                }
                onClick={() => togglePaid(bill)}
                disabled={busyId === bill.id}
              >
                {busyId === bill.id ? "..." : bill.payment_status === "paid" ? "Paid" : "Unpaid"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
