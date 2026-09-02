/**
 * HARD-LOCKED admin identity for ExamHub.
 *
 * This is the ONLY source of truth for who can access admin. It cannot be
 * changed via query params, request body, env vars, or client UI. Server
 * checks always compare against this frozen constant.
 *
 * Do not re-export a mutable copy. Do not accept an admin email from the client.
 */
export const LOCKED_ADMIN_EMAIL = Object.freeze(
  "minjunnios@gmail.com" as const,
);

/** Canonical admin email — frozen string, always lowercase-compare. */
export function getLockedAdminEmail(): string {
  return LOCKED_ADMIN_EMAIL;
}

/**
 * Constant-time-ish email compare (length + char walk). Only true for the
 * single locked admin address. Never trust a client-supplied "isAdmin" flag.
 */
export function isLockedAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email || typeof email !== "string") return false;
  const a = email.trim().toLowerCase();
  const b = LOCKED_ADMIN_EMAIL;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
