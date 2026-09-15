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

const styles = StyleSheet.create({
  copy: {
    height: COPY_HEIGHT,
    flexDirection: "column",
    border: "1pt solid #000",
    padding: 10,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#000",
  },
  header: { alignItems: "center", marginBottom: 4 },
  businessName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  businessLine: { fontSize: 7.5 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "0.5pt solid #000",
    borderBottom: "0.5pt solid #000",
    paddingVertical: 2,
    marginTop: 4,
  },
  doctorRow: { marginTop: 3, marginBottom: 3 },
  doctorName: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  // flexGrow fills whatever vertical space is left after the item rows,
  // so a 1-item bill still occupies the full fixed height — the extra
  // space just sits blank beneath the last row, same as pre-printed
  // stationery.
  table: { marginTop: 2, flexGrow: 1 },
  tableHeaderRow: {
    flexDirection: "row",
    borderTop: "0.5pt solid #000",
    borderBottom: "0.5pt solid #000",
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.3pt solid #999",
    paddingVertical: 1.5,
  },
  colNo: { width: "6%" },
  colName: { width: "34%" },
  colPack: { width: "14%" },
  colQty: { width: "10%", textAlign: "right" },
  colMrp: { width: "12%", textAlign: "right" },
  colRate: { width: "12%", textAlign: "right" },
  colTotal: { width: "12%", textAlign: "right" },
  footerRow: { flexDirection: "row", marginTop: 4 },
  remarkBlock: { width: "60%" },
  totalsBlock: { width: "40%" },
  totalsLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1 },
  netLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "0.5pt solid #000",
    paddingTop: 2,
    marginTop: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  wordsLine: { fontSize: 7, marginTop: 3, fontStyle: "italic" },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
    borderTop: "0.5pt solid #000",
    paddingTop: 4,
  },
  bankBlock: { width: "38%" },
  bankTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  bankLine: { fontSize: 6.5, color: "#333" },
  qrBlock: { width: "20%", alignItems: "center" },
  qrImage: { width: 46, height: 46 },
  qrLabel: { fontSize: 5.5, marginTop: 1, color: "#333" },
  signBlock: { width: "38%" },
  signBox: {
    textAlign: "center",
    borderTop: "0.5pt solid #000",
    paddingTop: 2,
    marginTop: 8,
    fontSize: 7,
  },
  continuedNote: { fontSize: 7, fontStyle: "italic", color: "#555", textAlign: "center" },
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

            <View style={styles.signBlock}>
              <Text style={styles.signBox}>Customer Signature</Text>
              <Text style={styles.signBox}>For {BUSINESS_INFO.name}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
