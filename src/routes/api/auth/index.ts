import { createFileRoute } from "@tanstack/react-router";
import {
  handleDaemonAuthRequest,
  isDaemonAuthRequest,
  json,
} from "@/lib/server/whitelist";
import { auth } from "@/lib/auth/server";

/**
 * Exact path: GET /api/auth?machineId=…  (ExamHub Daemon)
 * Also handles trailing-slash form. Better Auth sign-in lives under /api/auth/*.
 */
export const Route = createFileRoute("/api/auth/")({
  server: {
    handlers: {
      OPTIONS: async () => json({ ok: true }),
      GET: async ({ request }) => {
        if (isDaemonAuthRequest(request)) {
          return handleDaemonAuthRequest(request);
        }
        // Non-daemon GET on /api/auth → Better Auth (session probe etc.)
        return auth.handler(request);
      },
      POST: async ({ request }) => auth.handler(request),
    },
  },
});
