// src/server.ts - TanStack Start Server Entry
import { setAuth } from "@repo/data-ops/auth/server";
import { initDatabase } from "@repo/data-ops/database/setup";
import handler from "@tanstack/react-start/server-entry";
import { env } from "cloudflare:workers";

export default {
  fetch(request: Request) {
    // Initialize database on each request
    const db = initDatabase(env.DATABASE_URL!);

    setAuth({
      secret: process.env.BETTER_AUTH_SECRET!,
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      },
      adapter: {
        drizzleDb: db,
        provider: "pg",
      },
    });

    return handler.fetch(request, {
      context: {
        fromFetch: true,
      },
    });
  },
};
