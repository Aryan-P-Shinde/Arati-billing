import { useEffect, useState } from "react";
import type { Doctor } from "../db/doctors";
import { listBillsForDoctor, getBillItems, type Bill, type BillItem } from "../db/bills";
import { billToPrintData } from "../pdf/fromBill";
import type { PrintBillData } from "../pdf/types";
import { COMPANY_PREFIXES } from "../lib/billNumber";
import { DoctorPicker } from "./DoctorPicker";
import { InvoicePrintControls } from "./InvoicePrintControls";
import { EditBillModal } from "./EditBillModal";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function BillsScreen() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedBillItems, setSelectedBillItems] = useState<BillItem[]>([]);
  const [printData, setPrintData] = useState<PrintBillData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!doctor) {
      setBills([]);
      return;
    }
    refreshBills(doctor.id);
  }, [doctor]);

  async function refreshBills(doctorId: number) {
    const list = await listBillsForDoctor(doctorId);
    setBills(list);
    return list;
  }

  async function openBill(bill: Bill) {
    if (!doctor) return;
    setLoading(true);
    setSelectedBill(bill);
    const items = await getBillItems(bill.id);
    setSelectedBillItems(items);
    setPrintData(billToPrintData(bill, doctor, items));
    setLoading(false);
  }

  async function handleSaved() {
    if (!doctor || !selectedBill) return;
    setEditing(false);
    const list = await refreshBills(doctor.id);
    const refreshed = list.find((b) => b.id === selectedBill.id);
    if (refreshed) {
      await openBill(refreshed);
    }
  }

  async function handleDeleted() {
    setEditing(false);
    setSelectedBill(null);
    setSelectedBillItems([]);
    setPrintData(null);
    if (doctor) await refreshBills(doctor.id);
  }

  return (
    <div className="workspace">
      <div className="panel">
        <div className="panel-title">Bills</div>
        <DoctorPicker
          selected={doctor}
          onSelect={(d) => {
            setDoctor(d);
            setSelectedBill(null);
            setSelectedBillItems([]);
            setPrintData(null);
          }}
        />

        {doctor && bills.length === 0 && (
          <p className="hint">No bills saved yet for {doctor.name}.</p>
        )}

        {doctor && bills.length > 0 && (
          <ul className="bill-list">
            {bills.map((bill) => (
              <li key={bill.id}>
                <button
                  className={`bill-list-item ${selectedBill?.id === bill.id ? "active" : ""}`}
                  onClick={() => openBill(bill)}
                >
                  <span>{formatDate(bill.bill_date)}</span>
                  <span>
                    <span className={`company-badge company-badge-${bill.company}`}>
                      {COMPANY_PREFIXES[bill.company]}
                    </span>{" "}
                    {bill.bill_number ?? `Draft #${bill.id}`}
                  </span>
                  <span className="num">₹{bill.net_amount.toFixed(2)}</span>
                  <span className={`status status-${bill.status}`}>{bill.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="summary-rail">
        <div className="panel">
          <div className="panel-title">Print</div>
          {loading && <p className="hint">Loading bill...</p>}
          {!loading && !printData && <p className="hint">Select a bill to print it.</p>}
          {printData && !loading && selectedBill && (
            <>
              <h3 className="print-heading">
                {selectedBill.bill_number ?? `Draft #${selectedBill.id}`} — {doctor?.name}
              </h3>
              <button className="save-bill secondary-btn" onClick={() => setEditing(true)}>
                Edit bill
              </button>
              <InvoicePrintControls data={printData} />
            </>
          )}
        </div>
      </div>

      {editing && selectedBill && (
        <EditBillModal
          bill={selectedBill}
          billItems={selectedBillItems}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
