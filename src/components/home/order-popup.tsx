import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Package, X } from "lucide-react";
import { getMyOrderSummary } from "@/lib/server/examhub";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatUsd } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DISMISS_KEY = "examhub.order-popup-dismissed";

export function SingleOrderPopup() {
  const { user, isPending } = useCurrentUserState();
  const [order, setOrder] = useState<{
    id: string;
    product_name: string;
    status: string;
    amount_usd: number;
  } | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isPending || !user) {
      setShow(false);
      setOrder(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const dismissed = sessionStorage.getItem(DISMISS_KEY);
        if (dismissed === "1") return;
        const summary = await getMyOrderSummary();
        if (cancelled) return;
        if (summary.onlyOrder) {
          setOrder(summary.onlyOrder);
          setShow(true);
        } else {
          setOrder(null);
          setShow(false);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isPending]);

  if (!show || !order) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div className="fixed bottom-20 left-4 z-40 w-[min(100vw-2rem,340px)] animate-[fade-in-up_0.35s_ease-out] sm:bottom-6 sm:left-6">
      <div className="rounded-2xl border border-primary/30 bg-surface p-4 shadow-lg shadow-primary/10">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Package className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Active order
                </p>
                <p className="font-display text-base font-semibold text-fg">
                  {order.product_name}
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg p-1 text-muted hover:bg-bg-soft hover:text-fg"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{order.status}</Badge>
              <span className="text-xs text-fg-muted">
                {formatUsd(order.amount_usd)}
              </span>
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              Waiting for admin confirmation. Updates appear in notifications.
            </p>
            <Link to="/orders" search={{ placed: undefined, tab: undefined }}>
              <Button size="sm" className="mt-3" onClick={dismiss}>
                View order
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
