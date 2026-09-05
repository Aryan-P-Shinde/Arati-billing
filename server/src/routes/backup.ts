import { Router } from "express";
import { clearAllData, exportAllData, importAllData } from "../db/index.js";

export const backupRouter = Router();

backupRouter.get("/export", async (_req, res) => {
  try {
    const snapshot = await exportAllData();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", 'attachment; filename="arati-billing-backup.json"');
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Export failed" });
  }
});

backupRouter.post("/import", async (req, res) => {
  try {
    await importAllData(req.body);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Restore failed" });
  }
});

backupRouter.post("/clear", async (_req, res) => {
  try {
    await clearAllData();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Clear failed" });
  }
});
