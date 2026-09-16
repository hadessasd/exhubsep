import { createFileRoute } from "@tanstack/react-router";
import {
  clientIp,
  json,
  jsonError,
  listMachines,
  listMachinesByProductKey,
  listWhitelistPackages,
  requireAdminFromRequest,
  upsertMachine,
  GENERAL_WHITELIST_KEY,
} from "@/lib/server/whitelist";

export const Route = createFileRoute("/api/admin/whitelist/machines")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminFromRequest(request);
          const url = new URL(request.url);
          const productKey = url.searchParams.get("productKey")?.trim();
          const includePackages =
            url.searchParams.get("packages") === "1" ||
            url.searchParams.get("includePackages") === "1";

          const machines = productKey
            ? await listMachinesByProductKey(productKey)
            : await listMachines();

          if (includePackages) {
            return json({
              machines,
              packages: listWhitelistPackages(),
              generalKey: GENERAL_WHITELIST_KEY,
            });
          }
          // Backward compatible: bare array when not requesting packages
          if (productKey) {
            return json({
              machines,
              productKey,
              packages: listWhitelistPackages(),
              generalKey: GENERAL_WHITELIST_KEY,
            });
          }
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
            productKey?: string | null;
            os?: string | null;
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
            productKey: body.productKey ?? GENERAL_WHITELIST_KEY,
            os: body.os ?? undefined,
            source: "manual",
          });
          return json(machine);
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
