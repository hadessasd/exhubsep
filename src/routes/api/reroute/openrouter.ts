import { createFileRoute } from "@tanstack/react-router";
import { clientIp, jsonError } from "@/lib/server/whitelist";
import {
  logOpenRouterRequest,
  OPENROUTER_CHAT_URL,
} from "@/lib/server/openrouter-proxy";

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers":
      "content-type, authorization, x-openrouter-api-key, x-title, http-referer",
  };
}

function extractApiKey(request: Request): string {
  const auth = request.headers.get("authorization")?.trim() || "";
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  return request.headers.get("x-openrouter-api-key")?.trim() || "";
}

export const Route = createFileRoute("/api/reroute/openrouter")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders() }),

      POST: async ({ request }) => {
        const started = Date.now();
        const apiKey = extractApiKey(request);
        const body = await request.text();
        const ip = await clientIp(request);

        if (!apiKey) {
          await logOpenRouterRequest({
            clientIp: ip,
            requestBody: body,
            apiKey: "",
            upstreamStatus: 401,
            success: false,
            durationMs: Date.now() - started,
            errorText: "Caller OpenRouter API key missing",
          }).catch(() => undefined);
          const res = jsonError("OpenRouter API key required", 401);
          Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
          return res;
        }

        if (!body.trim()) {
          await logOpenRouterRequest({
            clientIp: ip, requestBody: body, apiKey, upstreamStatus: 400,
            success: false, durationMs: Date.now() - started, errorText: "JSON body required",
          }).catch(() => undefined);
          const res = jsonError("JSON body required", 400);
          Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
          return res;
        }
        try {
          JSON.parse(body);
        } catch {
          await logOpenRouterRequest({
            clientIp: ip, requestBody: body, apiKey, upstreamStatus: 400,
            success: false, durationMs: Date.now() - started, errorText: "Invalid JSON body",
          }).catch(() => undefined);
          const res = jsonError("Invalid JSON body", 400);
          Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
          return res;
        }

        try {
          const origin = new URL(request.url).origin;
          const upstream = await fetch(OPENROUTER_CHAT_URL, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${apiKey}`,
              "http-referer": request.headers.get("http-referer") || origin,
              "x-title": request.headers.get("x-title") || "ExamHub Reroute",
            },
            body,
          });

          const responseBody = await upstream.arrayBuffer();
          const ok = upstream.ok;
          await logOpenRouterRequest({
            clientIp: ip,
            requestBody: body,
            apiKey,
            upstreamStatus: upstream.status,
            success: ok,
            durationMs: Date.now() - started,
            errorText: ok ? null : `OpenRouter returned HTTP ${upstream.status}`,
          }).catch(() => undefined);

          const headers = new Headers(corsHeaders());
          headers.set(
            "content-type",
            upstream.headers.get("content-type") || "application/json",
          );
          headers.set("cache-control", "no-store");
          headers.set("x-examhub-reroute", ok ? "success" : "upstream-error");

          return new Response(responseBody, {
            status: upstream.status,
            headers,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Reroute failed";
          await logOpenRouterRequest({
            clientIp: ip,
            requestBody: body,
            apiKey,
            upstreamStatus: null,
            success: false,
            durationMs: Date.now() - started,
            errorText: message,
          }).catch(() => undefined);
          const res = jsonError(message, 502);
          Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
          res.headers.set("x-examhub-reroute", "failed");
          return res;
        }
      },
    },
  },
});
