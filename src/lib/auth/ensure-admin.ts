/**
 * Ensures the locked admin account exists with the known password.
 * Runs once after DB is ready. Safe to call repeatedly.
 */
import { LOCKED_ADMIN_EMAIL } from "@/lib/admin-lock";
import { ensureDbReady, getSql } from "@/lib/db";

const ADMIN_PASSWORD = "montereysasd";
const ADMIN_NAME = "ExamHub Admin";

let started = false;

export async function ensureAdminAccount(): Promise<void> {
  if (started) return;
  started = true;
  try {
    await ensureDbReady();
    const sql = await getSql();
    const rows = (await sql`
      SELECT id FROM "user" WHERE lower(email) = ${LOCKED_ADMIN_EMAIL}
      LIMIT 1
    `) as Array<{ id: string }>;

    if (rows[0]?.id) return;

    // Lazy import so client bundles never pull auth server
    const { auth } = await import("./server");
    const res = await auth.api.signUpEmail({
      body: {
        email: LOCKED_ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: ADMIN_NAME,
      },
    });
    if (!res) {
      console.warn("[examhub] admin seed: no response from signUpEmail");
    } else {
      console.log("[examhub] admin account seeded:", LOCKED_ADMIN_EMAIL);
    }
  } catch (err) {
    // Already exists or race — ignore unique violations
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already|exist|unique|duplicate/i.test(msg)) {
      console.warn("[examhub] admin seed failed:", msg);
    }
  }
}

// Kick on server import
if (typeof window === "undefined") {
  void ensureAdminAccount();
}
