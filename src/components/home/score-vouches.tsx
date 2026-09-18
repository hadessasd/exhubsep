import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  MessageSquarePlus,
  ShieldCheck,
  Star,
  Sparkles,
} from "lucide-react";
import { getPublicRatings, submitRating } from "@/lib/server/examhub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SCORE_VOUCHES = [
  {
    id: "june-anon",
    src: "/vouches/sat-1600-anon.jpg",
    censoredName: "••••••",
  },
  {
    id: "june-l",
    src: "/vouches/sat-1600-luna.jpg",
    censoredName: "L••••",
  },
  {
    id: "june-h",
    src: "/vouches/sat-1600-hana.jpg",
    censoredName: "H••••",
  },
  {
    id: "june-r",
    src: "/vouches/sat-1600-ren.jpg",
    censoredName: "R••",
  },
] as const;

const SERVICE_LABEL: Record<string, string> = {
  overall: "Overall",
  sat: "SAT",
  act: "ACT",
  proctoring: "Proctor",
  research: "Research",
  internships: "Internships",
  support: "Support",
};

type RatingsData = Awaited<ReturnType<typeof getPublicRatings>>;

/**
 * Reviews / photo vouches — collapsed by default.
 * Customer must click “View reviews” to reveal content.
 */
export function ScoreVouches() {
  const [open, setOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [data, setData] = useState<RatingsData | null>(null);
  const [name, setName] = useState("");
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [service, setService] = useState("overall");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setData(await getPublicRatings());
    } catch {
      setData({
        average: 4.4,
        count: 755,
        seedCount: 755,
        seedAverage: 4.4,
        recent: [],
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitRating({
        data: {
          displayName: name.trim(),
          stars,
          comment: comment.trim() || undefined,
          service,
        },
      });
      toast.success("Thanks — your review is pending admin approval");
      setName("");
      setComment("");
      setReviewOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setBusy(false);
    }
  }

  const avg = data?.average ?? 4.4;
  const count = data?.count ?? 755;
  const userReviews = (data?.recent ?? []).filter(
    (r) => !String(r.id).startsWith("vouch-") && r.comment,
  );

  return (
    <section
      id="reviews"
      className="mx-auto scroll-mt-24 max-w-6xl px-3 sm:px-6"
    >
      <div className="comic-panel overflow-hidden bg-surface">
        {/* Compact summary — always visible; full content stays collapsed */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-success-soft/90 via-surface to-accent-soft/60 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4 sm:gap-5">
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border-2 border-border-strong bg-surface px-3.5 py-2.5 shadow-[3px_3px_0_rgb(26_18_12/0.18)]">
              <div className="text-center">
                <p className="font-display text-3xl font-bold leading-none text-fg sm:text-4xl">
                  {avg.toFixed(1)}
                </p>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-muted">
                  avg
                </p>
              </div>
              <div className="border-l-2 border-border-strong/15 pl-3">
                <div className="flex items-center gap-0.5" aria-label={`${avg.toFixed(1)} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4 sm:h-5 sm:w-5",
                        i <= Math.round(avg)
                          ? "fill-accent text-accent"
                          : "text-border",
                      )}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs font-bold text-fg-muted">
                  <span className="text-success">{count.toLocaleString()}</span>{" "}
                  student ratings
                </p>
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="comic-sticker !rotate-[-4deg]">Trust</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border-strong/20 bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                  <ShieldCheck className="h-3 w-3" />
                  Verified vouches
                </span>
              </div>
              <p className="font-display text-base font-bold text-fg sm:text-lg">
                Student reviews & score photos
              </p>
              <p className="text-xs font-semibold text-fg-muted">
                Summary always on · full reviews open on click
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="btn-comic shrink-0 border-2 border-border-strong bg-success text-white hover:bg-success/90"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="reviews-panel"
          >
            {open ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide reviews
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                View reviews
              </>
            )}
          </Button>
        </div>

        {open ? (
          <div
            id="reviews-panel"
            className="animate-panel-in border-t-0"
          >
            <div className="grid gap-0 lg:grid-cols-[minmax(0,200px)_1fr]">
              <div className="flex flex-col items-center justify-center gap-2 border-b-2 border-border-strong/10 bg-success-soft/60 px-5 py-6 text-center lg:border-b-0 lg:border-r-2">
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-border-strong bg-success px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </span>
                <p className="font-display text-5xl font-bold leading-none text-fg">
                  {avg.toFixed(1)}
                </p>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i <= Math.floor(avg)
                          ? "fill-success text-success"
                          : "text-border",
                      )}
                    />
                  ))}
                </div>
                <p className="text-sm font-bold text-fg">
                  {count.toLocaleString()} ratings
                </p>
              </div>

              <div className="flex flex-col justify-center gap-3 px-4 py-5 sm:px-6">
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-border-strong/20 bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    <Sparkles className="h-3 w-3" />
                    Community trust
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold text-fg sm:text-2xl">
                  Real 1600 score reports + open reviews
                </h2>
                <p className="max-w-xl text-sm text-fg-muted">
                  Perfect-score screenshots (names censored). Expand photos or
                  leave your own review.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPhotosOpen((v) => !v)}
                    className={cn(
                      "btn-comic inline-flex items-center gap-1.5 rounded-xl border-2 border-border-strong px-4 py-2.5 text-sm font-bold",
                      photosOpen
                        ? "bg-bg-soft text-fg"
                        : "bg-success text-white",
                    )}
                  >
                    {photosOpen ? (
                      <>
                        Hide score photos
                        <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Score photos
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewOpen((v) => !v)}
                    className={cn(
                      "btn-comic inline-flex items-center gap-1.5 rounded-xl border-2 border-border-strong px-4 py-2.5 text-sm font-bold",
                      reviewOpen
                        ? "bg-primary-soft text-primary"
                        : "bg-surface text-primary",
                    )}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    {reviewOpen ? "Close form" : "Write a review"}
                  </button>
                </div>
              </div>
            </div>

            {photosOpen ? (
              <div className="border-t-2 border-border-strong/10 bg-success-soft/25 px-3 py-4 sm:px-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-success">
                    SAT June 6, 2026 · 1600 photo vouches
                  </p>
                  <p className="text-[11px] font-medium text-muted">
                    Names censored · screenshots only
                  </p>
                </div>
                <div className="stagger-in grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                  {SCORE_VOUCHES.map((v) => (
                    <figure
                      key={v.id}
                      className="card-hover overflow-hidden rounded-2xl border-2 border-border-strong/40 bg-[#0a0a0c]"
                    >
                      <div className="flex items-center justify-between gap-1 border-b border-white/10 bg-success px-2.5 py-1.5">
                        <span className="truncate text-xs font-bold text-white">
                          {v.censoredName}
                        </span>
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-success">
                          1600
                        </span>
                      </div>
                      <div className="relative aspect-[3/4] max-h-[200px] overflow-hidden bg-black">
                        <img
                          src={v.src}
                          alt="Censored SAT June 6 2026 score 1600"
                          className="h-full w-full object-cover object-top"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <figcaption className="flex items-center justify-between gap-1 bg-surface px-2 py-1.5">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-success px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                          <BadgeCheck className="h-3 w-3" />
                          Vouch
                        </span>
                        <span className="text-[10px] font-semibold text-muted">
                          Jun 6 ’26
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ) : null}

            {reviewOpen ? (
              <form
                onSubmit={onSubmit}
                className="space-y-4 border-t-2 border-border-strong/10 bg-bg-soft/50 px-4 py-5 sm:px-6"
              >
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-bold text-fg">
                    Write a review
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Your name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="First name or initials"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Service</Label>
                    <select
                      className="h-11 w-full rounded-xl border-2 border-border-strong/30 bg-surface px-3 text-sm font-semibold"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                    >
                      {Object.entries(SERVICE_LABEL).map(([k, lab]) => (
                        <option key={k} value={k}>
                          {lab}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Stars</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setStars(i)}
                        className="rounded-lg p-1"
                        aria-label={`${i} stars`}
                      >
                        <Star
                          className={cn(
                            "h-7 w-7",
                            i <= stars
                              ? "fill-accent text-accent"
                              : "text-border",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Review{" "}
                    <span className="font-normal text-muted">(optional)</span>
                  </Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What should other students know?"
                    className="min-h-[88px] bg-surface"
                    maxLength={800}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  size="lg"
                  className="bg-success font-bold text-white hover:bg-success/90"
                >
                  {busy ? "Publishing…" : "Publish review"}
                </Button>
              </form>
            ) : null}

            {userReviews.length > 0 ? (
              <div className="border-t-2 border-border-strong/10 px-4 py-4 sm:px-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
                  Latest student reviews
                </p>
                <div className="stagger-in grid gap-2.5 sm:grid-cols-2">
                  {userReviews.slice(0, 6).map((r) => (
                    <article
                      key={r.id}
                      className="rounded-xl border-2 border-border-strong/20 bg-bg-soft/60 px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-fg">
                            {r.display_name}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            {SERVICE_LABEL[r.service] ?? r.service}
                          </p>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                i <= r.stars
                                  ? "fill-success text-success"
                                  : "text-border",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                          {r.comment}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
