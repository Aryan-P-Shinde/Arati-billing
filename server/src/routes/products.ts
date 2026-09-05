import { Router } from "express";
import {
  bulkCreateProducts,
  createProduct,
  deleteProduct,
  findProductByName,
  getProduct,
  searchProductGroups,
  searchProducts,
  setProductActive,
  updateProduct,
} from "../db/products.js";
import type { Company } from "../lib/billNumber.js";

export const productsRouter = Router();

function requireCompany(value: unknown): Company {
  if (value !== "sharangdhar" && value !== "leadgen") {
    throw new Error("company must be 'sharangdhar' or 'leadgen'");
  }
  return value;
}

productsRouter.get("/", async (req, res) => {
  try {
    const term = typeof req.query.q === "string" ? req.query.q : "";
    const company = requireCompany(req.query.company);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const grouped = req.query.grouped === "true";
    res.json(grouped ? await searchProductGroups(term, company, limit) : await searchProducts(term, company, limit));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid query" });
  }
});

productsRouter.get("/by-name", async (req, res) => {
  try {
    const company = requireCompany(req.query.company);
    const name = typeof req.query.name === "string" ? req.query.name : "";
    const product = await findProductByName(name, company);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid query" });
  }
});

productsRouter.get("/:id", async (req, res) => {
  const product = await getProduct(Number(req.params.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

productsRouter.post("/", async (req, res) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create product" });
  }
});

productsRouter.post("/bulk", async (req, res) => {
  try {
    const count = await bulkCreateProducts(req.body.products);
    res.status(201).json({ count });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Bulk import failed" });
  }
});

productsRouter.put("/:id", async (req, res) => {
  try {
    await updateProduct(Number(req.params.id), req.body);
    res.json(await getProduct(Number(req.params.id)));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update product" });
  }
});

productsRouter.post("/:id/active", async (req, res) => {
  await setProductActive(Number(req.params.id), Boolean(req.body.active));
  res.json(await getProduct(Number(req.params.id)));
});

productsRouter.delete("/:id", async (req, res) => {
  await deleteProduct(Number(req.params.id));
  res.status(204).send();
});
