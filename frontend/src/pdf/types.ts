export interface PrintBillItem {
  slNo: number;
  productName: string;
  packSize: string | null;
  quantity: number;
  mrp: number;
  wholesaleRate: number;
  totalRate: number;
}

export interface PrintBillData {
  billNumber: string | null; // null until numbering scheme exists — prints as blank/dashes
  billDate: string; // ISO date, formatted for display in the component
  doctorName: string;
  doctorAddress: string | null;
  items: PrintBillItem[];
  grossAmount: number;
  addAmount: number;
  lessAmount: number;
  netAmount: number;
  remark: string | null;
}

/** Which physical page format to render the invoice onto. */
export type PageMode = "bill-size" | "a4-single" | "a4-double";
