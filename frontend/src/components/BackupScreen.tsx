import { useRef, useState } from "react";
import { exportDatabase, importDatabase, clearAllData } from "../db";

function timestampForFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}`;
}

export function BackupScreen() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);

  async function handleExport() {
    setMessage(null);
    setExporting(true);
    try {
      const blob = await exportDatabase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arati-billing-backup-${timestampForFilename()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ kind: "success", text: "Backup file downloaded." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Export failed." });
    } finally {
      setExporting(false);
    }
  }

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  }

  async function confirmRestore() {
    if (!pendingFile) return;
    setMessage(null);
    setImporting(true);
    try {
      await importDatabase(pendingFile);
      // The in-memory DB instance has been swapped out; every screen's
      // cached state (doctor lists, product search, open bill, etc.) is
      // now stale, so reload the app fresh rather than trying to patch
      // every component's state individually.
      window.location.reload();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Restore failed." });
      setImporting(false);
      setPendingFile(null);
    }
  }

  async function confirmClear() {
    setClearing(true);
    try {
      await clearAllData();
      window.location.reload();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Clear failed." });
      setClearing(false);
    }
  }

  return (
    <div className="workspace backup-workspace">
      <div className="panel">
        <div className="panel-title">Backup</div>
        <p className="hint" style={{ marginBottom: 12 }}>
          Download the entire database — doctors, products and every bill — as a single file you
          can keep safe or move to another computer.
        </p>
        <button className="save-bill" onClick={handleExport} disabled={exporting}>
          {exporting ? "Preparing..." : "Download backup"}
        </button>
        {message && (
          <p className={message.kind === "success" ? "success" : "error"} style={{ marginTop: 10 }}>
            {message.text}
          </p>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">Restore</div>
        <p className="hint" style={{ marginBottom: 12 }}>
          Replace everything currently in this app with the contents of a backup file. Use this to
          recover data or to bring bills over from another computer.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFilePicked}
        />
        <button
          className="save-bill secondary-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          Choose backup file...
        </button>

        {pendingFile && (
          <div className="delete-confirm" style={{ marginTop: 10 }}>
            <p className="error">
              This will permanently replace all current data with "{pendingFile.name}". This can't
              be undone.
            </p>
            <div className="form-actions">
              <button
                className="secondary"
                onClick={() => setPendingFile(null)}
                disabled={importing}
              >
                Cancel
              </button>
              <button className="danger-btn" onClick={confirmRestore} disabled={importing}>
                {importing ? "Restoring..." : "Yes, restore this file"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-title">Reset app data</div>
        <p className="hint" style={{ marginBottom: 12 }}>
          Permanently deletes every doctor, product and bill currently saved — use this to clear
          out test or sample data before entering real data. Bill numbering restarts from #1 for
          each company afterwards. Consider downloading a backup first if you're not sure.
        </p>
        {!confirmingClear ? (
          <button
            className="save-bill danger-btn"
            onClick={() => setConfirmingClear(true)}
          >
            Clear all data...
          </button>
        ) : (
          <div className="delete-confirm">
            <p className="error">
              This deletes ALL doctors, products and bills, permanently. Type <b>DELETE</b> below
              to confirm.
            </p>
            <input
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              style={{ marginBottom: 10 }}
            />
            <div className="form-actions">
              <button
                className="secondary"
                onClick={() => {
                  setConfirmingClear(false);
                  setClearConfirmText("");
                }}
                disabled={clearing}
              >
                Cancel
              </button>
              <button
                className="danger-btn"
                onClick={confirmClear}
                disabled={clearing || clearConfirmText.trim() !== "DELETE"}
              >
                {clearing ? "Clearing..." : "Permanently clear everything"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
