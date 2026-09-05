import { Fragment } from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { BillCopy } from "./BillCopy";
import type { PageMode, PrintBillData, PrintBillItem } from "./types";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const HALF_HEIGHT = A4_HEIGHT / 2; // 420.945 — matches "bill is half of A4 vertically"

// The bill-size page IS that half-A4 footprint, laid out landscape
// (wider than tall) so it prints edge-to-edge on pre-cut half-sheets.
const BILL_SIZE_PAGE: [number, number] = [A4_WIDTH, HALF_HEIGHT];

// Conservative row budget for the fixed half-A4 layout. Once a bill's
// items exceed this, it spills onto an additional page in the same
// format rather than shrinking or breaking the layout.
const MAX_ITEMS_PER_PAGE = 10;

const styles = StyleSheet.create({
  billSizePage: { width: A4_WIDTH, height: HALF_HEIGHT, padding: 6 },
  a4Page: { width: A4_WIDTH, height: A4_HEIGHT, padding: 6 },
  half: { height: HALF_HEIGHT - 12 },
  cutLine: {
    borderTop: "0.75pt dashed #666",
    marginVertical: 4,
    flexDirection: "row",
    justifyContent: "center",
  },
  cutLabel: { fontSize: 6, color: "#666", marginTop: -5, backgroundColor: "#fff", paddingHorizontal: 4 },
});

function paginate(items: PrintBillItem[]): PrintBillItem[][] {
  if (items.length === 0) return [[]];
  const pages: PrintBillItem[][] = [];
  for (let i = 0; i < items.length; i += MAX_ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + MAX_ITEMS_PER_PAGE));
  }
  return pages;
}

export function InvoiceDocument({
  data,
  pageMode,
  qrDataUrl,
}: {
  data: PrintBillData;
  pageMode: PageMode;
  /** Pre-rendered UPI QR as a data URI, generated once for the whole document. */
  qrDataUrl?: string;
}) {
  const chunks = paginate(data.items);
  const totalPages = chunks.length;

  if (pageMode === "bill-size") {
    return (
      <Document>
        {chunks.map((chunk, i) => (
          <Page key={i} size={BILL_SIZE_PAGE} style={styles.billSizePage}>
            <BillCopy
              data={data}
              items={chunk}
              pageNumber={i + 1}
              totalPages={totalPages}
              isLastPage={i === totalPages - 1}
              qrDataUrl={qrDataUrl}
            />
          </Page>
        ))}
      </Document>
    );
  }

  if (pageMode === "a4-single") {
    return (
      <Document>
        {chunks.map((chunk, i) => (
          <Page key={i} size={[A4_WIDTH, A4_HEIGHT]} style={styles.a4Page}>
            <View style={styles.half}>
              <BillCopy
                data={data}
                items={chunk}
                pageNumber={i + 1}
                totalPages={totalPages}
                isLastPage={i === totalPages - 1}
                qrDataUrl={qrDataUrl}
              />
            </View>
          </Page>
        ))}
      </Document>
    );
  }

  // a4-double: every physical page carries the same chunk twice — top
  // for the customer, bottom for office records. Totals appear on both
  // copies of the final page only, same as single-copy mode.
  return (
    <Document>
      {chunks.map((chunk, i) => {
        const isLast = i === totalPages - 1;
        return (
          <Page key={i} size={[A4_WIDTH, A4_HEIGHT]} style={styles.a4Page}>
            <Fragment>
              <View style={styles.half}>
                <BillCopy
                  data={data}
                  items={chunk}
                  copyLabel="Customer Copy"
                  pageNumber={i + 1}
                  totalPages={totalPages}
                  isLastPage={isLast}
                  qrDataUrl={qrDataUrl}
                />
              </View>
              <View style={styles.cutLine}>
                <Text style={styles.cutLabel}>✂ cut here</Text>
              </View>
              <View style={styles.half}>
                <BillCopy
                  data={data}
                  items={chunk}
                  copyLabel="Office Copy"
                  pageNumber={i + 1}
                  totalPages={totalPages}
                  isLastPage={isLast}
                  qrDataUrl={qrDataUrl}
                />
              </View>
            </Fragment>
          </Page>
        );
      })}
    </Document>
  );
}
