// packages/data-ops/config/auth.ts
import { createBetterAuth } from "../src/auth/setup";
import { initDatabase } from "../src/database/setup";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = createBetterAuth({
  database: drizzleAdapter(
    initDatabase(process.env.DATABASE_URL!),
    { provider: "pg" },
  ),
});
