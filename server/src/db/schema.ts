// Arati Enterprises Billing App — Schema v2 (Postgres / Neon)
// Ported from the original SQLite schema. Column types/defaults adapted
// to Postgres dialect; table/column names and constraints unchanged.

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS doctors (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  gstin       TEXT,
  notes       TEXT,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors (LOWER(name));

CREATE TABLE IF NOT EXISTS products (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  company         TEXT NOT NULL CHECK (company IN ('sharangdhar','leadgen')),
  pack_size       TEXT,
  mrp             REAL NOT NULL,
  wholesale_rate  REAL NOT NULL,
  hsn             TEXT,
  tax_rate        REAL,
  notes           TEXT,
  active          INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_products_company ON products (company);

CREATE TABLE IF NOT EXISTS bills (
  id                  SERIAL PRIMARY KEY,
  bill_number         TEXT UNIQUE,
  company             TEXT NOT NULL CHECK (company IN ('sharangdhar','leadgen')),
  bill_date           TEXT NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
  doctor_id           INTEGER NOT NULL REFERENCES doctors(id),
  gross_amount        REAL NOT NULL DEFAULT 0,
  add_amount          REAL NOT NULL DEFAULT 0,
  reduction_percent   REAL NOT NULL DEFAULT 0,
  less_amount         REAL NOT NULL DEFAULT 0,
  net_amount          REAL NOT NULL DEFAULT 0,
  remark              TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
  payment_status      TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_doctor ON bills (doctor_id);
CREATE INDEX IF NOT EXISTS idx_bills_date   ON bills (bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills (status);
CREATE INDEX IF NOT EXISTS idx_bills_company ON bills (company);

-- One row per company, tracking the next sequence number to hand out.
-- The counter never resets — S-259/2-25 is bill #259 in the Sharangdhar
-- series overall, with /2-25 just recording when it was issued.
CREATE TABLE IF NOT EXISTS bill_number_counters (
  company      TEXT PRIMARY KEY CHECK (company IN ('sharangdhar','leadgen')),
  next_number  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bill_items (
  id                        SERIAL PRIMARY KEY,
  bill_id                   INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id                INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot     TEXT NOT NULL,
  pack_size_snapshot        TEXT,
  quantity                  REAL NOT NULL,
  mrp_snapshot              REAL NOT NULL,
  wholesale_rate_snapshot   REAL NOT NULL,
  total_rate                REAL NOT NULL,
  sort_order                INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items (bill_id);
`;
