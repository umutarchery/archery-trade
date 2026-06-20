// Kalıcı depo (SQLite). Bakiyeler restart'ta korunur.
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/ veya src/ neresinden çalışırsa çalışsın, db dosyası server kökünde dursun
const DB_PATH = path.resolve(__dirname, "..", "archerytrade.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    username   TEXT PRIMARY KEY,   -- lowercase
    display    TEXT NOT NULL,       -- orijinal yazım
    balance    INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ledger (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL,
    delta      INTEGER NOT NULL,
    reason     TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

console.log(`[db] SQLite hazır: ${DB_PATH}`);
