import { Router } from "express";
import {
  createBill,
  deleteAllBills,
  deleteBill,
  getBill,
  getBillItems,
  listAllBills,
  listBillsForDoctor,
  setBillPaymentStatus,
  updateBill,
} from "../db/bills.js";

export const billsRouter = Router();

// Must come before DELETE /:id — otherwise "/all" would be captured as
// the :id parameter instead of hitting this route.
billsRouter.delete("/all", async (_req, res) => {
  try {
    await deleteAllBills();
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to clear bills" });
  }
});

/** Every bill across every doctor, joined with the doctor's name — powers the Ledger screen. */
billsRouter.get("/", async (_req, res) => {
  res.json(await listAllBills());
});

billsRouter.get("/:id", async (req, res) => {
  const bill = await getBill(Number(req.params.id));
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  const items = await getBillItems(bill.id);
  res.json({ ...bill, items });
});

billsRouter.get("/by-doctor/:doctorId", async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await listBillsForDoctor(Number(req.params.doctorId), limit));
});

billsRouter.post("/", async (req, res) => {
  try {
    const created = await createBill(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create bill" });
  }
});

billsRouter.post("/:id/payment-status", async (req, res) => {
  const status = req.body?.payment_status;
  if (status !== "paid" && status !== "unpaid") {
    res.status(400).json({ error: "payment_status must be 'paid' or 'unpaid'" });
    return;
  }
  await setBillPaymentStatus(Number(req.params.id), status);
  const bill = await getBill(Number(req.params.id));
  res.json(bill);
});

billsRouter.put("/:id", async (req, res) => {
  try {
    await updateBill(Number(req.params.id), req.body);
    const bill = await getBill(Number(req.params.id));
    const items = await getBillItems(Number(req.params.id));
    res.json({ ...bill, items });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update bill" });
  }
});

billsRouter.delete("/:id", async (req, res) => {
  await deleteBill(Number(req.params.id));
  res.status(204).send();
});
