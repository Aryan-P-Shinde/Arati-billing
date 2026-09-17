import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { BUSINESS_INFO } from "./businessInfo";
import { amountInWords } from "./numberToWords";
import type { PrintBillData, PrintBillItem } from "./types";

// Fixed footprint: ~400pt tall regardless of item count. Both the
// bill-size page and the A4 half-slot give ~409pt of usable content
// height, so this is used unscaled everywhere — extra vertical space
// with short item lists collects inside the flexGrow table area rather
// than shrinking the box.
const COPY_HEIGHT = 400;

const RULE = "0.6pt solid #000";

const styles = StyleSheet.create({
  copy: {
    height: COPY_HEIGHT,
    flexDirection: "column",
    border: "1pt solid #000",
    padding: 10,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#000",
  },
  header: { alignItems: "center", marginBottom: 4 },
  businessName: { fontSize: 17, fontFamily: "Helvetica-Bold" },
  businessLine: { fontSize: 8.5 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: RULE,
    borderBottom: RULE,
    paddingVertical: 2,
    marginTop: 4,
  },
  doctorRow: { marginTop: 3, marginBottom: 3 },
  doctorName: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  // flexGrow fills whatever vertical space is left after the item rows,
  // so a 1-item bill still occupies the full fixed height — the extra
  // space just sits blank beneath the last row, same as pre-printed
  // stationery.
  table: { marginTop: 2, flexGrow: 1 },
  tableHeaderRow: {
    flexDirection: "row",
    borderTop: RULE,
    borderBottom: RULE,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.4pt solid #999",
    paddingVertical: 2.5,
  },
  // Every column but the last carries a right-hand rule, so header and
  // body rows share the same vertical divider lines — a properly ruled
  // table rather than just spaced-out text.
  colNo: { width: "6%", paddingRight: 3, borderRight: RULE },
  colName: { width: "32%", paddingHorizontal: 4, borderRight: RULE },
  colPack: { width: "14%", paddingHorizontal: 4, borderRight: RULE },
  colQty: { width: "9%", textAlign: "right", paddingHorizontal: 4, borderRight: RULE },
  colMrp: { width: "12%", textAlign: "right", paddingHorizontal: 4, borderRight: RULE },
  colRate: { width: "12%", textAlign: "right", paddingHorizontal: 4, borderRight: RULE },
  colTotal: { width: "15%", textAlign: "right", paddingLeft: 4 },
  footerRow: {
    flexDirection: "row",
    marginTop: 6,
    borderTop: RULE,
    paddingTop: 6,
  },
  remarkBlock: { width: "58%", paddingRight: 10 },
  // The left-hand rule here is the vertical division between the remark
  // block and the totals block, sitting right against the totals side.
  totalsBlock: { width: "42%", borderLeft: RULE, paddingLeft: 10 },
  totalsLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  netLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: RULE,
    paddingTop: 3,
    marginTop: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  wordsLine: { fontSize: 8, marginTop: 3, fontStyle: "italic" },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
    borderTop: RULE,
    paddingTop: 5,
  },
  // Bank details + QR are grouped together so they sit tightly side by
  // side, instead of being spread apart by the row's own justification.
  bankAndQr: { flexDirection: "row", alignItems: "flex-end", width: "58%" },
  bankBlock: {},
  bankTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  bankLine: { fontSize: 9, color: "#222", lineHeight: 1.35 },
  qrBlock: { alignItems: "center", marginLeft: 10 },
  qrImage: { width: 50, height: 50 },
  qrLabel: { fontSize: 6.5, marginTop: 1, color: "#333" },
  // Two signature boxes side by side instead of stacked — each gets its
  // own rule-and-label directly beneath it.
  signGroup: { flexDirection: "row", width: "40%", justifyContent: "space-between" },
  signBoxWrap: { width: "48%" },
  signBox: {
    textAlign: "center",
    borderTop: RULE,
    paddingTop: 3,
    marginTop: 10,
    fontSize: 8,
  },
  continuedNote: { fontSize: 7.5, fontStyle: "italic", color: "#555", textAlign: "center" },
});

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function BillCopy({
  data,
  copyLabel,
  items,
  pageNumber = 1,
  totalPages = 1,
  isLastPage = true,
  qrDataUrl,
}: {
  data: PrintBillData;
  copyLabel?: string;
  /** The slice of items to render on this page. Defaults to all of them (single-page bill). */
  items?: PrintBillItem[];
  pageNumber?: number;
  totalPages?: number;
  /** Only the last page of a multi-page bill shows remark/totals/words/signatures. */
  isLastPage?: boolean;
  /** Pre-rendered UPI QR as a data URI (generated once per PDF, not per copy). */
  qrDataUrl?: string;
}) {
  const pageItems = items ?? data.items;
  const billNoDisplay =
    totalPages > 1
      ? `${data.billNumber ?? "________"}  (${pageNumber}/${totalPages})`
      : data.billNumber ?? "________";

  return (
    <View style={styles.copy}>
      <View style={styles.header}>
        <Text style={styles.businessName}>{BUSINESS_INFO.name}</Text>
        {BUSINESS_INFO.addressLines.map((line, i) => (
          <Text key={i} style={styles.businessLine}>{line}</Text>
        ))}
        <Text style={styles.businessLine}>Ph: {BUSINESS_INFO.phone}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text>Bill No: {billNoDisplay}</Text>
        {copyLabel && <Text>{copyLabel}</Text>}
        <Text>Date: {formatDate(data.billDate)}</Text>
      </View>

      <View style={styles.doctorRow}>
        <Text style={styles.doctorName}>To: Dr. {data.doctorName}</Text>
        {data.doctorAddress && <Text style={styles.businessLine}>{data.doctorAddress}</Text>}
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.colNo}>No</Text>
          <Text style={styles.colName}>Product Name</Text>
          <Text style={styles.colPack}>Pack Size</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colMrp}>MRP</Text>
          <Text style={styles.colRate}>Rate</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>
        {pageItems.map((item) => (
          <View style={styles.tableRow} key={item.slNo}>
            <Text style={styles.colNo}>{item.slNo}</Text>
            <Text style={styles.colName}>{item.productName}</Text>
            <Text style={styles.colPack}>{item.packSize ?? "-"}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colMrp}>{item.mrp.toFixed(2)}</Text>
            <Text style={styles.colRate}>{item.wholesaleRate.toFixed(2)}</Text>
            <Text style={styles.colTotal}>{item.totalRate.toFixed(2)}</Text>
          </View>
        ))}
        {!isLastPage && (
          <Text style={styles.continuedNote}>— continued on next page —</Text>
        )}
      </View>

      {isLastPage && (
        <>
          <View style={styles.footerRow}>
            <View style={styles.remarkBlock}>
              <Text>Remark: {data.remark ?? ""}</Text>
              <Text style={styles.wordsLine}>
                Rupees: {amountInWords(data.netAmount)}
              </Text>
            </View>
            <View style={styles.totalsBlock}>
              <View style={styles.totalsLine}>
                <Text>Gross</Text>
                <Text>{data.grossAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.totalsLine}>
                <Text>Add</Text>
                <Text>{data.addAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.totalsLine}>
                <Text>Less</Text>
                <Text>{data.lessAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.netLine}>
                <Text>NET AMT</Text>
                <Text>{data.netAmount.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.bankAndQr}>
              <View style={styles.bankBlock}>
                <Text style={styles.bankTitle}>Bank Details</Text>
                <Text style={styles.bankLine}>{BUSINESS_INFO.bank.name}</Text>
                <Text style={styles.bankLine}>{BUSINESS_INFO.bank.branchAddress}</Text>
                <Text style={styles.bankLine}>A/C: {BUSINESS_INFO.bank.accountNumber}</Text>
                <Text style={styles.bankLine}>IFSC: {BUSINESS_INFO.bank.ifsc}</Text>
              </View>

              {qrDataUrl && (
                <View style={styles.qrBlock}>
                  <Image src={qrDataUrl} style={styles.qrImage} />
                  <Text style={styles.qrLabel}>Pay using UPI</Text>
                </View>
              )}
            </View>

            <View style={styles.signGroup}>
              <View style={styles.signBoxWrap}>
                <Text style={styles.signBox}>Customer Signature</Text>
              </View>
              <View style={styles.signBoxWrap}>
                <Text style={styles.signBox}>For {BUSINESS_INFO.name}</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
