import { useEffect, useState } from "react";
import { searchDoctors, type Doctor } from "../db/doctors";
import { AddDoctorModal } from "./AddDoctorModal";

export function DoctorPicker({
  selected,
  onSelect,
}: {
  selected: Doctor | null;
  onSelect: (doctor: Doctor) => void;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Doctor[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    searchDoctors(term).then(setResults);
  }, [term, open]);

  const exactMatch = results.some((d) => d.name.toLowerCase() === term.trim().toLowerCase());

  if (selected && !open) {
    return (
      <div className="picker">
        <label>Doctor</label>
        <div className="picker-selected">
          <span>{selected.name}</span>
          <button className="link" onClick={() => setOpen(true)}>
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="picker">
      <label>Doctor</label>
      <input
        placeholder="Search or type doctor name..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => setOpen(true)}
        autoFocus={open}
      />
      {open && (
        <ul className="results">
          {results.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => {
                  onSelect(d);
                  setOpen(false);
                }}
              >
                {d.name}
                {d.phone ? ` — ${d.phone}` : ""}
              </button>
            </li>
          ))}
          {term.trim() && !exactMatch && (
            <li>
              <button className="add-new" onClick={() => setShowAdd(true)}>
                + Add "{term.trim()}" as new doctor
              </button>
            </li>
          )}
        </ul>
      )}
      {showAdd && (
        <AddDoctorModal
          initialName={term.trim()}
          onClose={() => setShowAdd(false)}
          onCreated={(doctor) => {
            setShowAdd(false);
            setOpen(false);
            onSelect(doctor);
          }}
        />
      )}
    </div>
  );
}
