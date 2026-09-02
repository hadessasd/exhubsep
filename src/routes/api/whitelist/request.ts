import { createFileRoute } from "@tanstack/react-router";
import {
  clientIp,
  json,
  jsonError,
  requestVerification,
} from "@/lib/server/whitelist";

/** Public: machine asks to be verified (shows as pending for admin). */
export const Route = createFileRoute("/api/whitelist/request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            machineId?: string;
            keyName?: string;
            hostname?: string;
            note?: string;
            city?: string;
            country?: string;
            os?: string;
          };
          if (!body.machineId?.trim()) {
            return jsonError("machineId required", 400);
          }
          const machine = await requestVerification({
            machineId: body.machineId,
            keyName: body.keyName,
            hostname: body.hostname,
            note: body.note,
            lastIp: await clientIp(request),
            city: body.city,
            country: body.country,
            os: body.os,
          });
          return json({
            ok: true,
            status: machine.status,
            id: machine.id,
            keyName: machine.keyName,
            message:
              machine.status === "active"
                ? "Already active"
                : "Request submitted — wait for admin approval",
          });
        } catch (err) {
          return jsonError(err, 400);
        }
      },
    },
  },
});
