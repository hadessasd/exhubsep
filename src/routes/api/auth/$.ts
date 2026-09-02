import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import {
  handleDaemonAuthRequest,
  isDaemonAuthRequest,
  json,
} from "@/lib/server/whitelist";

/**
 * Better Auth catch-all: /api/auth/sign-in/email, get-session, etc.
 * If a client hits /api/auth/<anything>?machineId=… we still honor Daemon auth.
 */
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      OPTIONS: async () => json({ ok: true }),
      GET: async ({ request }) => {
        if (isDaemonAuthRequest(request)) {
          return handleDaemonAuthRequest(request);
        }
        return auth.handler(request);
      },
      POST: async ({ request }) => {
        if (isDaemonAuthRequest(request)) {
          return handleDaemonAuthRequest(request);
        }
        return auth.handler(request);
      },
    },
  },
});
