import { useEffect, useState } from "react";
import { searchProductGroups, type Product, type ProductGroup } from "../db/products";
import type { Company } from "../lib/billNumber";
import { AddProductModal } from "./AddProductModal";

export function ProductPicker({
  company,
  onSelect,
}: {
  company: Company;
  onSelect: (product: Product) => void;
}) {
  const [term, setTerm] = useState("");
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [open, setOpen] = useState(false);
  // Set once a multi-pack-size name is clicked — switches the list into
  // "pick a pack size" mode for just that product.
  const [packStage, setPackStage] = useState<ProductGroup | null>(null);

  useEffect(() => {
    if (!open) return;
    searchProductGroups(term, company).then(setGroups);
    setPackStage(null);
  }, [term, company, open]);

  const exactMatch = groups.some((g) => g.name.toLowerCase() === term.trim().toLowerCase());

  function pickGroup(group: ProductGroup) {
    if (group.variants.length === 1) {
      onSelect(group.variants[0]);
      setTerm("");
      setOpen(false);
      return;
    }
    setPackStage(group);
  }

  function pickVariant(product: Product) {
    onSelect(product);
    setTerm("");
    setOpen(false);
    setPackStage(null);
  }

  return (
    <div className="picker">
      <input
        placeholder="Search or type product name..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && packStage && (
        <ul className="results">
          <li>
            <button className="pack-stage-back" onClick={() => setPackStage(null)}>
              ← {packStage.name}
            </button>
          </li>
          {packStage.variants.map((v) => (
            <li key={v.id}>
              <button onClick={() => pickVariant(v)}>
                <span className="pack-size-label">{v.pack_size ?? "—"}</span>
                <span className="pack-size-rates">
                  MRP ₹{v.mrp} / WS ₹{v.wholesale_rate}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !packStage && (
        <ul className="results">
          {groups.map((g) => {
            const single = g.variants.length === 1 ? g.variants[0] : null;
            return (
              <li key={g.name.toLowerCase()}>
                <button onClick={() => pickGroup(g)}>
                  <span>{g.name}</span>
                  {single ? (
                    <span className="pack-size-rates">
                      {single.pack_size ? `${single.pack_size} — ` : ""}
                      MRP ₹{single.mrp} / WS ₹{single.wholesale_rate}
                    </span>
                  ) : (
                    <span className="pack-size-rates">{g.variants.length} pack sizes ›</span>
                  )}
                </button>
              </li>
            );
          })}
          {term.trim() && !exactMatch && (
            <li>
              <button className="add-new" onClick={() => setShowAdd(true)}>
                + Add "{term.trim()}" as new product
              </button>
            </li>
          )}
        </ul>
      )}
      {showAdd && (
        <AddProductModal
          initialName={term.trim()}
          company={company}
          onClose={() => setShowAdd(false)}
          onCreated={(product) => {
            setShowAdd(false);
            setOpen(false);
            setTerm("");
            onSelect(product);
          }}
        />
      )}
    </div>
  );
}
