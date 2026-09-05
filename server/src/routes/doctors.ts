import { Router } from "express";
import {
  countBillsForDoctor,
  createDoctor,
  deleteDoctor,
  getDoctor,
  searchDoctors,
  setDoctorActive,
  updateDoctor,
} from "../db/doctors.js";

export const doctorsRouter = Router();

doctorsRouter.get("/", async (req, res) => {
  const term = typeof req.query.q === "string" ? req.query.q : "";
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await searchDoctors(term, limit));
});

doctorsRouter.get("/:id", async (req, res) => {
  const doctor = await getDoctor(Number(req.params.id));
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.json(doctor);
});

doctorsRouter.post("/", async (req, res) => {
  try {
    const doctor = await createDoctor(req.body);
    res.status(201).json(doctor);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create doctor" });
  }
});

doctorsRouter.put("/:id", async (req, res) => {
  try {
    await updateDoctor(Number(req.params.id), req.body);
    res.json(await getDoctor(Number(req.params.id)));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update doctor" });
  }
});

doctorsRouter.post("/:id/active", async (req, res) => {
  await setDoctorActive(Number(req.params.id), Boolean(req.body.active));
  res.json(await getDoctor(Number(req.params.id)));
});

doctorsRouter.get("/:id/bill-count", async (req, res) => {
  res.json({ count: await countBillsForDoctor(Number(req.params.id)) });
});

doctorsRouter.delete("/:id", async (req, res) => {
  try {
    await deleteDoctor(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Failed to delete doctor (likely still has bills)",
    });
  }
});
