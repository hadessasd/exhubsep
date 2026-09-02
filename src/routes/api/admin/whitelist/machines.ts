import { createFileRoute } from "@tanstack/react-router";
import {
  clientIp,
  json,
  jsonError,
  listMachines,
  requireAdminFromRequest,
  upsertMachine,
} from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/admin/whitelist/machines")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const machines = await listMachines();
          return json(machines);
        } catch (err) {
          return jsonError(err, 403);
        }
      },
      POST: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const body = (await request.json()) as {
            id?: string;
            keyName?: string;
            machineInput?: string;
            hostname?: string;
            note?: string;
            status?: string;
            forever?: boolean;
            expiresAt?: string | null;
          };
          if (!body.keyName?.trim()) {
            return jsonError("Enter a key name", 400);
          }
          const machine = await upsertMachine({
            id: body.id || undefined,
            keyName: body.keyName,
            machineInput: body.machineInput,
            hostname: body.hostname,
            note: body.note,
            status: body.status || "active",
            forever: body.forever !== false && !body.expiresAt,
            expiresAt: body.expiresAt ?? null,
            lastIp: await clientIp(request),
          });
          return json(machine);
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
