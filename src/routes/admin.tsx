import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import {
  listAllOrders,
  listResearchRequests,
  listInternshipRequests,
  listBlogPosts,
  updateOrderStatus,
  fulfillOrder,
  updateResearchStatus,
  updateInternshipStatus,
  saveBlogPost,
  deleteBlogPost,
  generateBlogWithAi,
  generateSeoForProduct,
  getAdminStats,
  checkIsAdmin,
  listAllChatThreads,
  listChatMessages,
  sendChatMessage,
  closeChatThread,
  getSeoDirectoryForAdmin,
  listSellerApplications,
  updateSellerApplicationStatus,
  listAdminRatings,
  updateRatingStatus,
  deleteRating,
} from "@/lib/server/examhub";
import { PRODUCTS, ADMIN_EMAIL, SUPPORT_DISCORD } from "@/lib/data/catalog";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { formatUsd } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MachinesPanel } from "@/components/admin/machines-panel";
import { ProjectsPanel } from "@/components/admin/projects-panel";
import { DeliveryPanel } from "@/components/admin/delivery-panel";
import { SimulatePanel } from "@/components/admin/simulate-panel";
import { ReroutePanel } from "@/components/admin/reroute-panel";
import {
  LayoutDashboard,
  Package,
  FileText,
  Briefcase,
  Sparkles,
  Trash2,
  Wand2,
  MessageCircle,
  Copy,
  Link2,
  Send,
  Store,
  Lock,
  Cpu,
  FolderKanban,
  PackageOpen,
  FlaskConical,
  Network,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin Dashboard | ExamHub" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Tab =
  | "overview"
  | "orders"
  | "research"
  | "internships"
  | "sellers"
  | "blog"
  | "seo"
  | "chat"
  | "machines"
  | "projects"
  | "delivery"
  | "simulate"
  | "reroute"
  | "reviews";

function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://examhub.app";
}

function AdminFulfillForm({
  orderId,
  onDone,
}: {
  orderId: string;
  onDone: () => Promise<void> | void;
}) {
  const [links, setLinks] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-1.5 rounded-xl border border-border bg-bg-soft/60 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        Complete offer
      </p>
      <Input
        value={links}
        onChange={(e) => setLinks(e.target.value)}
        placeholder="File links (one per line)"
        className="h-8 text-xs"
      />
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message / contact note"
        className="h-8 text-xs"
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          className="h-8 flex-1 text-xs"
          disabled={busy || (!links.trim() && !message.trim())}
          onClick={() => {
            setBusy(true);
            void fulfillOrder({
              data: {
                id: orderId,
                deliveryLinks: links,
                adminMessage: message,
                closeOffer: true,
              },
            })
              .then(() => {
                toast.success("Offer closed · files sent · user notified");
                setLinks("");
                setMessage("");
                return onDone();
              })
              .catch((err) =>
                toast.error(err instanceof Error ? err.message : "Failed"),
              )
              .finally(() => setBusy(false));
          }}
        >
          Send & close
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          disabled={busy || (!links.trim() && !message.trim())}
          onClick={() => {
            setBusy(true);
            void fulfillOrder({
              data: {
                id: orderId,
                deliveryLinks: links,
                adminMessage: message,
                closeOffer: false,
              },
            })
              .then(() => {
                toast.success("Files attached");
                setLinks("");
                setMessage("");
                return onDone();
              })
              .catch((err) =>
                toast.error(err instanceof Error ? err.message : "Failed"),
              )
              .finally(() => setBusy(false));
          }}
        >
          Attach only
        </Button>
      </div>
    </div>
  );
}

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof getAdminStats>
  > | null>(null);
  const [orders, setOrders] = useState<
    Awaited<ReturnType<typeof listAllOrders>>
  >([]);
  const [research, setResearch] = useState<
    Awaited<ReturnType<typeof listResearchRequests>>
  >([]);
  const [interns, setInterns] = useState<
    Awaited<ReturnType<typeof listInternshipRequests>>
  >([]);
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof listBlogPosts>>>(
    [],
  );
  const [sellers, setSellers] = useState<
    Awaited<ReturnType<typeof listSellerApplications>>
  >([]);
  const [seoDir, setSeoDir] = useState<
    Awaited<ReturnType<typeof getSeoDirectoryForAdmin>>
  >([]);
  const [seoFilter, setSeoFilter] = useState("");
  const [chats, setChats] = useState<
    Awaited<ReturnType<typeof listAllChatThreads>>
  >([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatMsgs, setChatMsgs] = useState<
    Awaited<ReturnType<typeof listChatMessages>>
  >([]);
  const [chatReply, setChatReply] = useState("");
  const [blogTitle, setBlogTitle] = useState("");
  const [blogSlug, setBlogSlug] = useState("");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogBody, setBlogBody] = useState("");
  const [blogPublished, setBlogPublished] = useState(true);
  const [aiTopic, setAiTopic] = useState("");
  const [seoProductId, setSeoProductId] = useState(PRODUCTS[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [ratings, setRatings] = useState<
    Awaited<ReturnType<typeof listAdminRatings>>
  >([]);

  const refresh = useCallback(async () => {
    try {
      const [s, o, r, i, b, se, sd, ch, rate] = await Promise.all([
        getAdminStats(),
        listAllOrders(),
        listResearchRequests(),
        listInternshipRequests(),
        listBlogPosts({ data: { all: true } }),
        getSeoDirectoryForAdmin(),
        listSellerApplications(),
        listAllChatThreads(),
        listAdminRatings(),
      ]);
      setStats(s);
      setOrders(o);
      setResearch(r);
      setInterns(i);
      setPosts(b);
      setSeoDir(se);
      setSellers(sd);
      setChats(ch);
      setRatings(rate);
    } catch {
      /* not admin or network */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void checkIsAdmin().then((ok) => {
      if (ok) void refresh();
    });
  }, [user, refresh]);

  useEffect(() => {
    if (!activeChat) {
      setChatMsgs([]);
      return;
    }
    void listChatMessages({ data: { threadId: activeChat } }).then(setChatMsgs);
  }, [activeChat]);

  if (isPending) {
    return (
      <Shell isAdmin={false}>
        <div className="p-10 text-center text-fg-muted">Loading…</div>
      </Shell>
    );
  }

  if (!user) {
    return <RedirectToSignIn />;
  }

  if (user.primaryEmail?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return (
      <Shell isAdmin={false}>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <Lock className="mx-auto h-10 w-10 text-muted" />
          <h1 className="mt-4 font-display text-2xl font-bold">Admin only</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Signed in as {user.primaryEmail}. Owner inbox is {ADMIN_EMAIL}.
          </p>
          <Link to="/" className="mt-6 inline-block text-primary hover:underline">
            ← Home
          </Link>
        </div>
      </Shell>
    );
  }

  const origin = siteOrigin();
  const filteredSeo = seoDir.filter((row) => {
    if (!seoFilter.trim()) return true;
    const q = seoFilter.toLowerCase();
    return (
      row.name.toLowerCase().includes(q) ||
      row.path.toLowerCase().includes(q) ||
      row.seoTitle.toLowerCase().includes(q) ||
      row.category.toLowerCase().includes(q)
    );
  });

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "simulate", label: "Simulate", icon: FlaskConical },
    { id: "reroute", label: "AI Reroute", icon: Network },
    { id: "machines", label: "Machines", icon: Cpu },
    { id: "projects", label: "Progress", icon: FolderKanban },
    { id: "delivery", label: "Delivery", icon: PackageOpen },
    { id: "orders", label: "Orders", icon: Package },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "research", label: "Research", icon: FileText },
    { id: "internships", label: "Internships", icon: Briefcase },
    { id: "sellers", label: "Sellers", icon: Store },
    { id: "blog", label: "Blog", icon: FileText },
    { id: "seo", label: "SEO", icon: Sparkles },
    { id: "chat", label: "Chat", icon: MessageCircle },
  ];

  return (
    <Shell isAdmin>
      <div className="mx-auto w-full max-w-6xl min-w-0 px-3 py-6 sm:px-6 sm:py-8">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">
            Admin dashboard
          </h1>
          <p className="text-sm text-fg-muted">
            Locked owner · {ADMIN_EMAIL} · Discord @{SUPPORT_DISCORD}
          </p>
        </div>

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-bg-soft p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "bg-surface text-primary shadow-sm"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && stats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Orders", stats.orders],
                ["Open chat", stats.openChats],
                ["Research pending", stats.pendingResearch],
                ["Blog posts", stats.posts],
              ] as const
            ).map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {label}
                  </p>
                  <p className="font-display text-3xl font-bold text-fg">
                    {value}
                  </p>
                </CardContent>
              </Card>
            ))}
            <Card className="sm:col-span-2 lg:col-span-4">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-semibold text-fg">Quick test (no Stripe)</p>
                  <p className="text-sm text-fg-muted">
                    Use Simulate to fake a payment and whitelist, or open buyer
                    Activate flow.
                  </p>
                </div>
                <Button type="button" onClick={() => setTab("simulate")}>
                  <FlaskConical className="h-4 w-4" />
                  Open Simulate
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tab === "simulate" ? <SimulatePanel /> : null}

        {tab === "reroute" ? <ReroutePanel /> : null}

        {tab === "machines" ? <MachinesPanel /> : null}

        {tab === "projects" ? <ProjectsPanel /> : null}

        {tab === "delivery" ? <DeliveryPanel /> : null}

        {tab === "orders" ? (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-sm text-muted">No orders yet.</p>
            ) : (
              orders.map((o) => (
                <Card key={o.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-fg">
                          {o.product_name} · {formatUsd(Number(o.amount_usd))}
                        </p>
                        <p className="text-xs text-muted">
                          {o.id} · {o.status} · {o.payment_method}
                          {o.crypto_currency ? ` / ${o.crypto_currency}` : ""}
                        </p>
                        <p className="text-xs text-fg-muted">
                          Contact: {o.contact_method} → {o.contact_value}
                        </p>
                        {o.crypto_tx_id ? (
                          <p className="truncate font-mono text-xs text-muted">
                            TX: {o.crypto_tx_id}
                          </p>
                        ) : null}
                        {o.gift_card_key ? (
                          <p className="break-all rounded-lg border border-warning/30 bg-warning-soft/40 px-2 py-1 font-mono text-xs text-fg">
                            Gift card key (admin only): {o.gift_card_key}
                          </p>
                        ) : null}
                        {o.notes ? (
                          <p className="text-xs text-muted">Notes: {o.notes}</p>
                        ) : null}
                      </div>
                      <Select
                        value={o.status || "pending"}
                        onChange={(e) => {
                          void updateOrderStatus({
                            data: { id: o.id, status: e.target.value },
                          })
                            .then(() => {
                              toast.success("Status updated");
                              return refresh();
                            })
                            .catch((err) =>
                              toast.error(
                                err instanceof Error ? err.message : "Failed",
                              ),
                            );
                        }}
                        className="w-auto"
                      >
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="fulfilling">fulfilling</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="closed">closed</option>
                      </Select>
                    </div>
                    <AdminFulfillForm orderId={o.id} onDone={refresh} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : null}

        {tab === "reviews" ? (
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">
              New reviews stay pending until you publish. Delete removes them
              permanently.
            </p>
            {ratings.length === 0 ? (
              <p className="text-sm text-muted">No reviews yet.</p>
            ) : (
              ratings.map((rev) => (
                <Card key={rev.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-fg">
                          {rev.display_name} · {rev.stars}★ · {rev.service}
                        </p>
                        <p className="text-xs text-muted">
                          {rev.status} · {new Date(rev.created_at).toLocaleString()}
                        </p>
                        {rev.comment ? (
                          <p className="mt-1 text-sm text-fg-muted">{rev.comment}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rev.status !== "published" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              void updateRatingStatus({
                                data: { id: rev.id, status: "published" },
                              })
                                .then(() => {
                                  toast.success("Review published");
                                  return refresh();
                                })
                                .catch((err) =>
                                  toast.error(
                                    err instanceof Error ? err.message : "Failed",
                                  ),
                                );
                            }}
                          >
                            Approve
                          </Button>
                        ) : null}
                        {rev.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              void updateRatingStatus({
                                data: { id: rev.id, status: "rejected" },
                              }).then(refresh);
                            }}
                          >
                            Reject
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!confirm("Delete this review?")) return;
                            void deleteRating({ data: { id: rev.id } })
                              .then(() => {
                                toast.success("Review deleted");
                                return refresh();
                              })
                              .catch((err) =>
                                toast.error(
                                  err instanceof Error ? err.message : "Failed",
                                ),
                              );
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : null}

        {tab === "research" ? (
          <div className="space-y-3">
            {research.length === 0 ? (
              <p className="text-sm text-muted">
                Legacy research form requests. New Stripe buyers use Progress
                tab.
              </p>
            ) : (
              research.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <p className="font-semibold">{(r as any).subject || r.id}</p>
                      <p className="text-xs text-muted">
                        {(r as any).contact} · {(r as any).status}
                      </p>
                    </div>
                    <Select
                      value={(r as any).status || "new"}
                      onChange={(e) => {
                        void updateResearchStatus({
                          data: { id: r.id, status: e.target.value },
                        }).then(refresh);
                      }}
                      className="w-auto"
                    >
                      <option value="new">new</option>
                      <option value="in_progress">in_progress</option>
                      <option value="done">done</option>
                    </Select>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : null}

        {tab === "internships" ? (
          <div className="space-y-3">
            {interns.length === 0 ? (
              <p className="text-sm text-muted">
                Legacy internship form. New buyers use Progress tab after Stripe.
              </p>
            ) : (
              interns.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <p className="font-semibold">{(r as any).field || r.id}</p>
                      <p className="text-xs text-muted">
                        {(r as any).contact} · {(r as any).status}
                      </p>
                    </div>
                    <Select
                      value={(r as any).status || "new"}
                      onChange={(e) => {
                        void updateInternshipStatus({
                          data: { id: r.id, status: e.target.value },
                        }).then(refresh);
                      }}
                      className="w-auto"
                    >
                      <option value="new">new</option>
                      <option value="in_progress">in_progress</option>
                      <option value="done">done</option>
                    </Select>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : null}

        {tab === "sellers" ? (
          <div className="space-y-3">
            {sellers.length === 0 ? (
              <p className="text-sm text-muted">No seller applications.</p>
            ) : (
              sellers.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <p className="font-semibold">
                        {(s as any).name || (s as any).email}
                      </p>
                      <p className="text-xs text-muted">{(s as any).status}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() =>
                          void updateSellerApplicationStatus({
                            data: { id: s.id, status: "approved" },
                          }).then(refresh)
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void updateSellerApplicationStatus({
                            data: { id: s.id, status: "rejected" },
                          }).then(refresh)
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : null}

        {tab === "blog" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New post</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Title"
                  value={blogTitle}
                  onChange={(e) => {
                    setBlogTitle(e.target.value);
                    setBlogSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    );
                  }}
                />
                <Input
                  placeholder="slug"
                  value={blogSlug}
                  onChange={(e) => setBlogSlug(e.target.value)}
                />
                <Input
                  placeholder="Excerpt"
                  value={blogExcerpt}
                  onChange={(e) => setBlogExcerpt(e.target.value)}
                />
                <Textarea
                  className="min-h-[120px]"
                  placeholder="Body"
                  value={blogBody}
                  onChange={(e) => setBlogBody(e.target.value)}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={blogPublished}
                    onChange={(e) => setBlogPublished(e.target.checked)}
                  />
                  Published
                </label>
                <Button
                  disabled={busy || !blogTitle.trim()}
                  onClick={() => {
                    setBusy(true);
                    void saveBlogPost({
                      data: {
                        title: blogTitle,
                        slug: blogSlug,
                        seoTitle: blogTitle,
                        seoDescription: blogExcerpt || blogTitle,
                        htmlContent: blogBody || `<p>${blogExcerpt || blogTitle}</p>`,
                        status: blogPublished ? "published" : "draft",
                      },
                    })

                      .then(() => {
                        toast.success("Saved");
                        setBlogTitle("");
                        setBlogSlug("");
                        setBlogExcerpt("");
                        setBlogBody("");
                        return refresh();
                      })
                      .catch((e) =>
                        toast.error(e instanceof Error ? e.message : "Failed"),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Save post
                </Button>
                <div className="border-t border-border pt-3">
                  <Label>AI draft</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="Topic"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy || !aiTopic.trim()}
                      onClick={() => {
                        setBusy(true);
                        void generateBlogWithAi({ data: { topic: aiTopic } })
                          .then((d: any) => {
                            if (d?.title) setBlogTitle(d.title);
                            if (d?.slug) setBlogSlug(d.slug);
                            if (d?.excerpt) setBlogExcerpt(d.excerpt);
                            if (d?.body) setBlogBody(d.body);
                            toast.success("Draft filled");
                          })
                          .catch((e) =>
                            toast.error(
                              e instanceof Error ? e.message : "AI failed",
                            ),
                          )
                          .finally(() => setBusy(false));
                      }}
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {posts.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-start justify-between gap-2 p-4">
                    <div>
                      <p className="font-semibold">{(p as any).title}</p>
                      <p className="text-xs text-muted">
                        {(p as any).slug} ·{" "}
                        {(p as any).published ? "published" : "draft"}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() =>
                        void deleteBlogPost({ data: { id: p.id } }).then(
                          refresh,
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "seo" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select
                value={seoProductId}
                onChange={(e) => setSeoProductId(e.target.value)}
                className="max-w-xs"
              >
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Button
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void generateSeoForProduct({ data: { productId: seoProductId } })
                    .then(() => {
                      toast.success("SEO generated");
                      return refresh();
                    })
                    .catch((e) =>
                      toast.error(e instanceof Error ? e.message : "Failed"),
                    )
                    .finally(() => setBusy(false));
                }}
              >
                <Sparkles className="h-4 w-4" />
                Generate SEO
              </Button>
              <Input
                className="max-w-xs"
                placeholder="Filter…"
                value={seoFilter}
                onChange={(e) => setSeoFilter(e.target.value)}
              />
            </div>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {filteredSeo.map((row) => (
                  <div
                    key={row.path}
                    className="flex flex-wrap items-start justify-between gap-2 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-fg">{row.name}</p>
                      <p className="text-xs text-muted">{row.path}</p>
                      <p className="mt-1 text-sm">{row.seoTitle}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          void navigator.clipboard.writeText(
                            `${origin}${row.path}`,
                          );
                          toast.success("Copied");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <a href={row.path} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost">
                          <Link2 className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tab === "chat" ? (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {chats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveChat(c.id)}
                  className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                    activeChat === c.id
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-surface hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold">
                    {(c as any).user_email || (c as any).guest_name || "Chat"}
                  </p>
                  <p className="text-xs text-muted">{(c as any).status}</p>
                </button>
              ))}
            </div>
            <Card>
              <CardContent className="flex h-[60vh] flex-col p-4">
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {chatMsgs.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        (m as any).role === "admin"
                          ? "ml-auto bg-primary text-primary-fg"
                          : "bg-bg-soft text-fg"
                      }`}
                    >
                      {(m as any).body || (m as any).content}
                    </div>
                  ))}
                </div>
                {activeChat ? (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={chatReply}
                      onChange={(e) => setChatReply(e.target.value)}
                      placeholder="Reply…"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && chatReply.trim()) {
                          void sendChatMessage({
                            data: {
                              threadId: activeChat,
                              body: chatReply,
                              asAdmin: true,
                            },
                          }).then(() => {
                            setChatReply("");
                            return listChatMessages({
                              data: { threadId: activeChat },
                            }).then(setChatMsgs);
                          });
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={() => {
                        if (!chatReply.trim() || !activeChat) return;
                        void sendChatMessage({
                          data: {
                            threadId: activeChat,
                            body: chatReply,
                            asAdmin: true,
                          },
                        }).then(() => {
                          setChatReply("");
                          return listChatMessages({
                            data: { threadId: activeChat },
                          }).then(setChatMsgs);
                        });
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void closeChatThread({ data: { threadId: activeChat, status: "closed" } }).then(
                          refresh,
                        )
                      }
                    >
                      Close
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Select a thread</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
