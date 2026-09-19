import { useEffect, useState } from "react";
import { getDb, setStoredPin, PinRequiredError } from "./db";
import { BillForm } from "./components/BillForm";
import { BillsScreen } from "./components/BillsScreen";
import { ImportProductsScreen } from "./components/ImportProductsScreen";
import { BackupScreen } from "./components/BackupScreen";
import { ManageScreen } from "./components/ManageScreen";
import { LedgerScreen } from "./components/LedgerScreen";
import "./App.css";

type Tab = "new" | "bills" | "ledger" | "products" | "manage" | "backup";

function PinScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    setStoredPin(pin.trim());
    try {
      await getDb();
      onUnlocked();
    } catch (err) {
      setError(err instanceof PinRequiredError ? "Wrong PIN — try again." : "Couldn't reach the server.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="content" style={{ maxWidth: 360, margin: "80px auto" }}>
      <div className="panel">
        <div className="panel-title">Enter PIN</div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            style={{ marginBottom: 10, width: "100%" }}
          />
          {error && <p className="error" style={{ marginBottom: 10 }}>{error}</p>}
          <button className="save-bill" type="submit" disabled={checking || !pin.trim()}>
            {checking ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("new");

  function checkReady() {
    getDb()
      .then(() => {
        setReady(true);
        setNeedsPin(false);
      })
      .catch((err) => {
        if (err instanceof PinRequiredError) {
          setNeedsPin(true);
        } else {
          console.error("Connection check failed:", err);
          setInitError(err instanceof Error ? err.message : String(err));
        }
      });
  }

  useEffect(() => {
    checkReady();
  }, []);

  if (needsPin) {
    return <PinScreen onUnlocked={checkReady} />;
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <span className="topbar-title">Arati Enterprises — Billing</span>
        <div className="tabs">
          <button className={tab === "new" ? "tab active" : "tab"} onClick={() => setTab("new")}>
            New Bill
          </button>
          <button className={tab === "bills" ? "tab active" : "tab"} onClick={() => setTab("bills")}>
            Bills
          </button>
          <button className={tab === "ledger" ? "tab active" : "tab"} onClick={() => setTab("ledger")}>
            Ledger
          </button>
          <button className={tab === "products" ? "tab active" : "tab"} onClick={() => setTab("products")}>
            Products
          </button>
          <button className={tab === "manage" ? "tab active" : "tab"} onClick={() => setTab("manage")}>
            Manage
          </button>
          <button className={tab === "backup" ? "tab active" : "tab"} onClick={() => setTab("backup")}>
            Backup
          </button>
        </div>
      </div>

      <div className="content">
        {initError ? (
          <p className="loading" style={{ color: "var(--danger)" }}>
            Couldn't reach the server: {initError}
            <br />
            Check the API URL and that the server is running.
          </p>
        ) : !ready ? (
          <p className="loading">Connecting...</p>
        ) : tab === "new" ? (
          <BillForm />
        ) : tab === "bills" ? (
          <BillsScreen />
        ) : tab === "ledger" ? (
          <LedgerScreen />
        ) : tab === "products" ? (
          <ImportProductsScreen />
        ) : tab === "manage" ? (
          <ManageScreen />
        ) : (
          <BackupScreen />
        )}
      </div>
    </div>
  );
}
