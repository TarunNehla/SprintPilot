// packages/data-ops/database/setup.ts
import { drizzle } from "drizzle-orm/neon-http";

let db: ReturnType<typeof drizzle>;

export function initDatabase(url?: string) {
  if (db) {
    return db;
  }
  const connectionString = url || process.env.DATABASE_URL!;
  db = drizzle(connectionString);
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
