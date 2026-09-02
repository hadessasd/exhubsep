import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import {
  listMyOrders,
  listMySellerApplications,
  submitSellerApplication,
  SELLER_TOS_TEXT,
} from "@/lib/server/examhub";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { formatUsd, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package, Store, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type OrdersSearch = {
  placed?: string;
  tab?: string;
};

export const Route = createFileRoute("/orders")({
  validateSearch: (s: Record<string, unknown>): OrdersSearch => ({
    placed: typeof s.placed === "string" ? s.placed : undefined,
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "My Dashboard | ExamHub" }],
  }),
});

type Order = Awaited<ReturnType<typeof listMyOrders>>[number];
type SellerApp = Awaited<ReturnType<typeof listMySellerApplications>>[number];

function statusVariant(status: string) {
  if (status === "completed" || status === "approved") return "success" as const;
  if (status === "cancelled" || status === "rejected") return "danger" as const;
  if (status === "paid" || status === "fulfilling" || status === "reviewing")
    return "accent" as const;
  return "warning" as const;
}

function DashboardPage() {
  const { isAdmin } = Route.useRouteContext();
  const { placed, tab: tabSearch } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [tab, setTab] = useState<"orders" | "seller">(
    tabSearch === "seller" ? "seller" : "orders",
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellers, setSellers] = useState<SellerApp[]>([]);
  const [loading, setLoading] = useState(true);

  // Seller form
  const [fullName, setFullName] = useState("");
  const [contactMethod, setContactMethod] = useState("discord");
  const [contactValue, setContactValue] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [sourceAccessNote, setSourceAccessNote] = useState("");
  const [agreedTos, setAgreedTos] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.removeItem("examhub.just-signed-in");
      sessionStorage.removeItem("examhub.auth-navigating");
    } catch { /* ignore */ }
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([listMyOrders(), listMySellerApplications()])
      .then(([o, s]) => {
        setOrders(o);
        setSellers(s);
      })
      .catch(() => {
        setOrders([]);
        setSellers([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  async function onSellerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreedTos) {
      toast.error("You must agree to the seller Terms of Service");
      return;
    }
    setBusy(true);
    try {
      await submitSellerApplication({
        data: {
          fullName,
          contactMethod,
          contactValue,
          productName,
          productDescription,
          sourceAccessNote,
          agreedTos: true,
        },
      });
      toast.success("Seller application submitted — admin will review");
      setProductName("");
      setProductDescription("");
      setSourceAccessNote("");
      setAgreedTos(false);
      const s = await listMySellerApplications();
      setSellers(s);
      setTab("seller");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return (
      <Shell isAdmin={isAdmin}>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="h-40 animate-pulse rounded-2xl bg-bg-soft" />
        </div>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell isAdmin={isAdmin}>
        <RedirectToSignIn />
      </Shell>
    );
  }

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-fg">
              My dashboard
            </h1>
            <p className="text-sm text-fg-muted">
              {user.primaryEmail ?? user.displayName ?? "Account"} · orders &
              seller requests
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">
              Browse catalog
            </Button>
          </Link>
        </div>

        <div className="mb-6 flex gap-2 rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setTab("orders")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              tab === "orders"
                ? "bg-primary text-primary-fg shadow"
                : "text-fg-muted hover:bg-bg-soft",
            )}
          >
            <Package className="h-4 w-4" />
            Orders
          </button>
          <button
            type="button"
            onClick={() => setTab("seller")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              tab === "seller"
                ? "bg-primary text-primary-fg shadow"
                : "text-fg-muted hover:bg-bg-soft",
            )}
          >
            <Store className="h-4 w-4" />
            Become a seller
          </button>
        </div>

        {placed && tab === "orders" ? (
          <div className="mb-4 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
            Order <span className="font-mono font-semibold">{placed}</span>{" "}
            submitted and pending verification.
          </div>
        ) : null}

        {tab === "orders" ? (
          loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl bg-bg-soft"
                />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <Package className="h-10 w-10 text-muted" />
                <p className="text-fg-muted">No orders yet.</p>
                <Link to="/">
                  <Button>Explore products</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <Card key={o.id}>
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-lg font-semibold text-fg">
                          {o.product_name}
                        </h2>
                        <Badge variant={statusVariant(o.status)}>
                          {o.status}
                        </Badge>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted">{o.id}</p>
                      <p className="mt-2 text-sm text-fg-muted">
                        {formatUsd(o.amount_usd)} ·{" "}
                        {o.payment_method === "gift_card"
                          ? "Gift card"
                          : `Crypto (${o.crypto_currency?.toUpperCase()})`}
                      </p>
                      <p className="text-sm text-fg-muted">
                        Contact: {o.contact_method} → {o.contact_value}
                      </p>
                      {o.crypto_tx_id ? (
                        <p className="mt-1 truncate font-mono text-xs text-muted">
                          TX: {o.crypto_tx_id}
                        </p>
                      ) : null}
                      {(o as { has_gift_card?: number }).has_gift_card ? (
                        <p className="mt-1 text-xs text-muted">
                          Gift card submitted — code visible to admin only
                        </p>
                      ) : null}
                      {(o as { crypto_rail?: string | null }).crypto_rail ? (
                        <p className="mt-1 text-xs text-muted">
                          Crypto rail:{" "}
                          {(o as { crypto_rail?: string }).crypto_rail}
                        </p>
                      ) : null}
                      {(o as { admin_message?: string | null }).admin_message ? (
                        <p className="mt-2 rounded-lg bg-primary-soft/50 px-2 py-1.5 text-xs text-fg">
                          Admin:{" "}
                          {(o as { admin_message?: string }).admin_message}
                        </p>
                      ) : null}
                      {(o as { delivery_links?: string | null }).delivery_links ? (
                        <div className="mt-2 space-y-1 rounded-lg border border-border bg-bg-soft px-2 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                            Files / links
                          </p>
                          {String(
                            (o as { delivery_links?: string }).delivery_links,
                          )
                            .split(/\n+/)
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line) =>
                              /^https?:\/\//i.test(line) ? (
                                <a
                                  key={line}
                                  href={line}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block truncate text-xs font-medium text-primary hover:underline"
                                >
                                  {line}
                                </a>
                              ) : (
                                <p key={line} className="text-xs text-fg-muted">
                                  {line}
                                </p>
                              ),
                            )}
                        </div>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-xs text-muted">
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div>
                  <h2 className="font-display text-xl font-semibold text-fg">
                    Become a seller
                  </h2>
                  <p className="mt-1 text-sm text-fg-muted">
                    Request to list a product on ExamHub. You must agree to our
                    seller ToS — good software only, no doxxing, no unsafe
                    methods, and source code access for ExamHub.
                  </p>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-bg-soft p-3 text-xs leading-relaxed whitespace-pre-wrap text-fg-muted">
                  {SELLER_TOS_TEXT}
                </div>

                <form onSubmit={onSellerSubmit} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Full name</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Product name</Label>
                      <Input
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                        placeholder="Tool or package name"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Contact via</Label>
                      <select
                        value={contactMethod}
                        onChange={(e) => setContactMethod(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                      >
                        <option value="discord">Discord</option>
                        <option value="email">Email</option>
                        <option value="telegram">Telegram</option>
                        <option value="instagram">Instagram</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Handle / email</Label>
                      <Input
                        value={contactValue}
                        onChange={(e) => setContactValue(e.target.value)}
                        required
                        placeholder="@you"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Product description</Label>
                    <Textarea
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      required
                      minLength={40}
                      placeholder="What does it do? Who is it for? How is it safe and legitimate?"
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Source code access</Label>
                    <Textarea
                      value={sourceAccessNote}
                      onChange={(e) => setSourceAccessNote(e.target.value)}
                      required
                      placeholder="How will you grant ExamHub access to the source (private repo invite, zip, etc.)?"
                      className="min-h-[72px]"
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3">
                    <input
                      type="checkbox"
                      checked={agreedTos}
                      onChange={(e) => setAgreedTos(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                      required
                    />
                    <span className="text-sm text-fg-muted">
                      I agree to the ExamHub Seller Terms: good software only,
                      no doxxing, no unsafe methods, and I will give ExamHub
                      access to the source code.
                    </span>
                  </label>

                  <Button type="submit" disabled={busy || !agreedTos}>
                    {busy ? "Submitting…" : "Submit seller request"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div>
              <h3 className="mb-3 font-display text-lg font-semibold text-fg">
                Your seller requests
              </h3>
              {sellers.length === 0 ? (
                <p className="text-sm text-fg-muted">No applications yet.</p>
              ) : (
                <div className="space-y-2">
                  {sellers.map((s) => (
                    <Card key={s.id}>
                      <CardContent className="flex items-start justify-between gap-3 p-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-fg">
                              {s.product_name}
                            </p>
                            <Badge variant={statusVariant(s.status)}>
                              {s.status}
                            </Badge>
                          </div>
                          {s.admin_notes ? (
                            <p className="mt-1 text-xs text-fg-muted">
                              Admin: {s.admin_notes}
                            </p>
                          ) : null}
                          <p className="mt-1 font-mono text-[11px] text-muted">
                            {s.id}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs text-muted">
                          {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-primary-soft/50 px-3 py-2.5 text-xs text-fg-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Approved sellers get a listing handoff from admin. Admin identity
                is locked and cannot be changed from this dashboard.
              </p>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
