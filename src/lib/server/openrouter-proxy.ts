import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";

export const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ProxyLog = {
  id: string;
  createdAt: string;
  clientIp: string | null;
  requestBody: string;
  apiKeyHint: string | null;
  upstreamStatus: number | null;
  success: boolean;
  durationMs: number | null;
  errorText: string | null;
};

function uid() {
  return `or_${randomBytes(10).toString("hex")}`;
}

function keyHint(key: string) {
  const clean = key.trim();
  if (!clean) return null;
  if (clean.length <= 10) return `${clean.slice(0, 3)}…`;
  return `${clean.slice(0, 7)}…${clean.slice(-4)}`;
}

function rowToLog(r: Record<string, unknown>): ProxyLog {
  return {
    id: String(r.id),
    createdAt: new Date(r.created_at as string).toISOString(),
    clientIp: (r.client_ip as string) ?? null,
    requestBody: String(r.request_body ?? ""),
    apiKeyHint: (r.api_key_hint as string) ?? null,
    upstreamStatus: r.upstream_status == null ? null : Number(r.upstream_status),
    success: Boolean(r.success),
    durationMs: r.duration_ms == null ? null : Number(r.duration_ms),
    errorText: (r.error_text as string) ?? null,
  };
}

export async function logOpenRouterRequest(input: {
  clientIp?: string;
  requestBody: string;
  apiKey: string;
  upstreamStatus?: number | null;
  success: boolean;
  durationMs?: number | null;
  errorText?: string | null;
}) {
  const sql = await getSql();
  const id = uid();
  await sql`
    INSERT INTO openrouter_proxy_logs (
      id, client_ip, request_body, api_key_hint, upstream_status,
      success, duration_ms, error_text
    ) VALUES (
      ${id}, ${input.clientIp ?? null}, ${input.requestBody}, ${keyHint(input.apiKey)},
      ${input.upstreamStatus ?? null}, ${input.success}, ${input.durationMs ?? null},
      ${input.errorText ?? null}
    )
  `;
}

export async function listOpenRouterLogs(limit = 200): Promise<ProxyLog[]> {
  const sql = await getSql();
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT * FROM openrouter_proxy_logs ORDER BY created_at DESC LIMIT $1`,
    [safeLimit],
  );
  return rows.map(rowToLog);
}

export async function clearOpenRouterLogs(): Promise<void> {
  const sql = await getSql();
  await sql`DELETE FROM openrouter_proxy_logs`;
}
