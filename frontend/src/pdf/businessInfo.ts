/**
 * Letterhead + bank details shown on every invoice. Pulled from the
 * existing sample invoice (Bill_S-259/2-25, Avinash Jagtap).
 */
export const BUSINESS_INFO = {
  name: "ARATI ENTERPRISES",
  addressLines: ["Sinhagad Road, Pune-51"],
  phone: "8087445017",
  bank: {
    name: "Janaseva Sahakari Bank Ltd.",
    branchAddress: "Manikbaug, Pune-51",
    accountNumber: "13021002718",
    ifsc: "JANA0000013",
    phonepe: "7745845480",
  },
  // GUESS, NOT CONFIRMED: PhonePe VPAs are commonly <number>@ybl, but this
  // varies by linked bank/app. Verify the real UPI ID before this QR is
  // used on any invoice that's actually handed to a customer — a wrong
  // VPA sends the payment nowhere useful.
  upiId: "7745845480@ybl",
};
