import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  getUnreadNotificationCount,
  listMyNotifications,
  markNotificationsRead,
} from "@/lib/server/examhub";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type N = Awaited<ReturnType<typeof listMyNotifications>>[number];

export function NotificationBell() {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setUnread(0);
      return;
    }
    try {
      const [list, count] = await Promise.all([
        listMyNotifications(),
        getUnreadNotificationCount(),
      ]);
      setItems(list);
      setUnread(count.count);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    if (isPending || !user) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(id);
  }, [user, isPending, refresh]);

  if (!user || isPending) return null;

  async function openPanel() {
    setOpen((v) => !v);
    if (!open) {
      await refresh();
    }
  }

  async function markAll() {
    try {
      await markNotificationsRead({ data: {} });
      await refresh();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void openPanel()}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-fg-muted shadow-sm transition hover:border-primary/40 hover:text-primary"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-fg">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,340px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="text-sm font-semibold text-fg">Notifications</p>
              <button
                type="button"
                onClick={() => void markAll()}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted">
                  No notifications yet
                </p>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "border-b border-border/70 px-3 py-3 text-sm last:border-0",
                      !n.read_at && "bg-primary-soft/40",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="font-semibold text-fg">{n.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                          {n.body}
                        </p>
                        <p className="mt-1 text-[10px] text-muted">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                        {n.href ? (
                          <Link
                            to={n.href as "/orders"}
                            className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
                            onClick={() => setOpen(false)}
                          >
                            View
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border p-2">
              <Link to="/orders" search={{ placed: undefined, tab: undefined }}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  Open dashboard
                </Button>
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
