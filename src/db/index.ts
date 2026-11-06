import postgres from "postgres";
import { drizzle, type PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://edutrack:edutrack_dev_password@localhost:5435/edutrack_lite";

declare global {
  // eslint-disable-next-line no-var
  var __edutrackPgClient: ReturnType<typeof postgres> | undefined;
}

const queryClient =
  globalThis.__edutrackPgClient ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__edutrackPgClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
/** Accepts both the root `db` and a transaction handle (`tx`). */
export type DbClient = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;
