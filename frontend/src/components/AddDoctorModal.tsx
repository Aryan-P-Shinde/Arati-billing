import { useState } from "react";
import { Modal } from "./Modal";
import { createDoctor, type Doctor } from "../db/doctors";

export function AddDoctorModal({
  initialName,
  onClose,
  onCreated,
}: {
  initialName: string;
  onClose: () => void;
  onCreated: (doctor: Doctor) => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const doctor = await createDoctor({
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      gstin: gstin.trim() || undefined,
    });
    setSaving(false);
    onCreated(doctor);
  }

  return (
    <Modal title="Add new doctor" onClose={onClose}>
      <div className="form">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          Address
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label>
          GSTIN (optional)
          <input value={gstin} onChange={(e) => setGstin(e.target.value)} />
        </label>
        <div className="form-actions">
          <button onClick={onClose} className="secondary" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save & Use"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
