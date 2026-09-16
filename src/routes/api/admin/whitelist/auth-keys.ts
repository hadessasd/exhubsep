import { createFileRoute } from "@tanstack/react-router";
import {
  createManualAuthKey,
  json,
  jsonError,
  listAuthKeys,
  maskAuthKey,
  requireAdminFromRequest,
  revokeManualAuthKey,
  SOFTWARE_WHITELIST_CATEGORIES,
} from "@/lib/server/whitelist";

/**
 * Admin: generate / list / revoke auth keys for software categories.
 * Clients authorize via POST /api/whitelist/verify (or /activate) with authKey only.
 */
export const Route = createFileRoute("/api/admin/whitelist/auth-keys")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const url = new URL(request.url);
          const category = url.searchParams.get("category")?.trim() || null;
          const keys = await listAuthKeys(category);
          return json({
            ok: true,
            categories: [...SOFTWARE_WHITELIST_CATEGORIES],
            keys,
          });
        } catch (err) {
          return jsonError(err, 403);
        }
      },
      POST: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const body = (await request.json()) as {
            action?: "create" | "revoke";
            category?: string;
            keyName?: string;
            note?: string;
            expiresAt?: string | null;
            id?: string;
          };
          const action = body.action || "create";

          if (action === "revoke") {
            if (!body.id?.trim()) return jsonError("id required", 400);
            await revokeManualAuthKey(body.id.trim());
            return json({ ok: true, revoked: true, id: body.id.trim() });
          }

          if (!body.category?.trim()) {
            return jsonError("category required (sat|act|gre|gmat|proctor)", 400);
          }

          const created = await createManualAuthKey({
            category: body.category,
            keyName: body.keyName,
            note: body.note,
            expiresAt: body.expiresAt,
          });

          console.info(
            "[admin/auth-keys] generated",
            created.category,
            maskAuthKey(created.authKey),
          );

          return json({
            ok: true,
            ...created,
            redeemHint:
              "Authorize with POST /api/whitelist/verify { authKey, category? }. Key stays active until revoked or expired.",
          });
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
