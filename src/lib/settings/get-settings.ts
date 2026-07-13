import { z } from "zod";
import { db } from "@/db";
import { settings } from "@/db/schema";

const settingsSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().nullable(),
});

export type Settings = z.infer<typeof settingsSchema>;

const DEFAULTS: Settings = { maintenanceMode: false, maintenanceMessage: null };

// A few seconds' staleness is acceptable for a flag that changes rarely
// and deliberately (research.md #2) -- avoids a Postgres round trip on
// every single request through proxy.ts.
const CACHE_TTL_MS = 5000;
let cache: { value: Settings; expiresAt: number } | null = null;

export async function getSettings(): Promise<Settings> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  const [row] = await db.select().from(settings).limit(1);
  const parsed = row ? settingsSchema.safeParse(row) : null;
  const value = parsed?.success ? parsed.data : DEFAULTS;

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

/** Test-only: forces the next getSettings() call to re-read the database. */
export function _resetSettingsCacheForTests(): void {
  cache = null;
}
