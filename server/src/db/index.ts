import pg from "pg";
import { SCHEMA_SQL } from "./schema.js";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set — point this at your Neon connection string.");
}

// Neon (and most managed Postgres) requires SSL; rejectUnauthorized:false
// matches Neon's own connection examples since it uses a public CA that
// Node's default bundle sometimes doesn't chain cleanly to.
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await pool.query(SCHEMA_SQL);
await migrate();

/** Brings an existing database up to date with schema changes added after it was first created. */
async function migrate(): Promise<void> {
  const hasColumn = async (table: string, column: string): Promise<boolean> => {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    return rows.length > 0;
  };

  if (!(await hasColumn("products", "company"))) {
    await pool.query("ALTER TABLE products ADD COLUMN company TEXT DEFAULT 'sharangdhar'");
  }
  if (!(await hasColumn("bills", "company"))) {
    await pool.query("ALTER TABLE bills ADD COLUMN company TEXT DEFAULT 'sharangdhar'");
  }
  // Idempotent — every statement in SCHEMA_SQL is IF NOT EXISTS.
  await pool.query(SCHEMA_SQL);
}

/**
 * doctors.ts/products.ts were written against SQLite's `?` positional
 * placeholders. Rather than rewrite every query to Postgres's `$1, $2...`
 * style, this translates the SQL string at call time — keeps those files
 * completely unchanged across the SQLite -> Postgres migration.
 */
function toPgPlaceholders(sql: string): string {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

/** Runs a SELECT and returns rows as plain objects keyed by column name. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const { rows } = await pool.query(toPgPlaceholders(sql), params);
  return rows as T[];
}

/** Runs a mutating statement (INSERT/UPDATE/DELETE) with bound params. */
export async function run(sql: string, params: unknown[] = []): Promise<void> {
  await pool.query(toPgPlaceholders(sql), params);
}

/**
 * Wraps multiple writes in a single Postgres transaction. The callback
 * gets a live client already inside BEGIN — see bills.ts for the
 * read-modify-write bill numbering logic that needs this.
 */
export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Wipes every row from every table but keeps the schema, so bill numbering
 * starts back at #1 for each company. Used to clear test/sample data
 * before going live.
 */
export async function clearAllData(): Promise<void> {
  await pool.query(`
    DELETE FROM bill_items;
    DELETE FROM bills;
    DELETE FROM bill_number_counters;
    DELETE FROM products;
    DELETE FROM doctors;
  `);
}

const BACKUP_TABLES = ["doctors", "products", "bill_number_counters", "bills", "bill_items"] as const;

/**
 * There's no single portable "database file" with Postgres the way there
 * was with SQLite, so backup/restore here is a full JSON snapshot of every
 * table instead of raw bytes. Used by the /api/backup/export route.
 */
export async function exportAllData(): Promise<Record<string, unknown[]>> {
  const snapshot: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) {
    const { rows } = await pool.query(`SELECT * FROM ${table}`);
    snapshot[table] = rows;
  }
  return snapshot;
}

/**
 * Replaces every table's contents with a previously exported snapshot,
 * inside one transaction. Restores in FK-safe order (parents before
 * children) and resets each table's auto-increment sequence to match the
 * restored data, so new rows created after a restore don't collide with
 * restored ids.
 */
export async function importAllData(snapshot: Record<string, unknown[]>): Promise<void> {
  await transaction(async (client) => {
    await client.query(
      `TRUNCATE bill_items, bills, bill_number_counters, products, doctors RESTART IDENTITY CASCADE`
    );

    for (const table of BACKUP_TABLES) {
      const rows = snapshot[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const columns = Object.keys(rows[0] as object);
      const columnList = columns.join(", ");
      for (const row of rows) {
        const values = columns.map((c) => (row as Record<string, unknown>)[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(`INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`, values);
      }

      if (columns.includes("id")) {
        await client.query(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
        );
      }
    }
  });
}
