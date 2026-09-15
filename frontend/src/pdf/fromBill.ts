import type { Bill, BillItem } from "../db/bills";
import type { Doctor } from "../db/doctors";
import type { PrintBillData } from "./types";

export function billToPrintData(bill: Bill, doctor: Doctor, items: BillItem[]): PrintBillData {
  return {
    billNumber: bill.bill_number,
    billDate: bill.bill_date,
    doctorName: doctor.name,
    doctorAddress: doctor.address,
    items: items.map((item) => ({
      slNo: item.sort_order + 1,
      productName: item.product_name_snapshot,
      packSize: item.pack_size_snapshot,
      quantity: item.quantity,
      mrp: item.mrp_snapshot,
      wholesaleRate: item.wholesale_rate_snapshot,
      totalRate: item.total_rate,
    })),
    grossAmount: bill.gross_amount,
    addAmount: bill.add_amount,
    lessAmount: bill.less_amount,
    netAmount: bill.net_amount,
    remark: bill.remark,
  };
}
