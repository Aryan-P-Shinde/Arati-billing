import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { InvoiceDocument } from "../pdf/InvoiceDocument";
import { BUSINESS_INFO } from "../pdf/businessInfo";
import type { PageMode, PrintBillData } from "../pdf/types";

const PAGE_MODE_OPTIONS: { value: PageMode; label: string; hint: string }[] = [
  { value: "bill-size", label: "Bill-size page", hint: "One page sized exactly to the bill (half-A4, landscape)" },
  { value: "a4-single", label: "A4 — one copy", hint: "Full A4 sheet, single bill on the top half" },
  { value: "a4-double", label: "A4 — two copies", hint: "Full A4 sheet, same bill twice — customer + office copy" },
];

export function InvoicePrintControls({ data }: { data: PrintBillData }) {
  const [pageMode, setPageMode] = useState<PageMode>("bill-size");
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    setGenerating(true);
    try {
      const upiUri = `upi://pay?pa=${encodeURIComponent(BUSINESS_INFO.upiId)}&pn=${encodeURIComponent(
        BUSINESS_INFO.name
      )}&am=${data.netAmount.toFixed(2)}&cu=INR`;
      const qrDataUrl = await QRCode.toDataURL(upiUri, { margin: 0, width: 200 });

      const blob = await pdf(
        <InvoiceDocument data={data} pageMode={pageMode} qrDataUrl={qrDataUrl} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bill-${data.billNumber ?? "draft"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="print-controls">
      <label>Page format</label>
      <div className="page-mode-options">
        {PAGE_MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`page-mode-option ${pageMode === opt.value ? "active" : ""}`}
            onClick={() => setPageMode(opt.value)}
            type="button"
          >
            <span className="pmo-label">{opt.label}</span>
            <span className="pmo-hint">{opt.hint}</span>
          </button>
        ))}
      </div>
      <button className="save-bill" onClick={handleDownload} disabled={generating}>
        {generating ? "Generating..." : "Download PDF"}
      </button>
    </div>
  );
}
