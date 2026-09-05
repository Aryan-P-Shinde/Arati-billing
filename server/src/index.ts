import "dotenv/config";
import express from "express";
import cors from "cors";
import { requirePin } from "./middleware/auth.js";
import { doctorsRouter } from "./routes/doctors.js";
import { productsRouter } from "./routes/products.js";
import { billsRouter } from "./routes/bills.js";
import { backupRouter } from "./routes/backup.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Unauthenticated — lets you (or an uptime check) confirm the server's up
// without needing the PIN.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(requirePin);

app.use("/api/doctors", doctorsRouter);
app.use("/api/products", productsRouter);
app.use("/api/bills", billsRouter);
app.use("/api/backup", backupRouter);

app.listen(PORT, () => {
  console.log(`arati-billing-server listening on :${PORT}`);
  console.log('Database: connected via DATABASE_URL');
});
