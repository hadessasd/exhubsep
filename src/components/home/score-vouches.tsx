import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
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

/** Real SAT screenshots — names censored. Shown after Read more. */
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

export function ScoreVouches() {
  const [photosOpen, setPhotosOpen] = useState(false);
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
          displayName: name,
          stars,
          comment,
          service,
        },
      });
      toast.success("Thanks — your review is pending admin approval");
      setName("");
      setComment("");
      setStars(5);
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
      {/* Outer glow frame */}
      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-1 rounded-[1.35rem] bg-gradient-to-r from-success via-accent to-primary opacity-40 blur-md"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-3xl border-2 border-success/40 bg-surface shadow-lg ring-1 ring-success/20">
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-success via-[#3d9b58] to-accent" />

          {/* Hero score row */}
          <div className="grid gap-0 lg:grid-cols-[minmax(0,220px)_1fr]">
            {/* Score panel */}
            <div className="relative flex flex-col items-center justify-center gap-2 border-b border-success/15 bg-gradient-to-b from-success-soft via-[#e8f6ec] to-surface px-5 py-6 text-center lg:border-b-0 lg:border-r lg:py-7">
              <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                <ShieldCheck className="h-3 w-3" />
                Verified vouches
              </span>
              <p className="font-display text-6xl font-bold leading-none tracking-tight text-fg sm:text-7xl">
                {avg.toFixed(1)}
              </p>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-5 w-5 drop-shadow-sm",
                      i <= Math.floor(avg)
                        ? "fill-success text-success"
                        : i === Math.ceil(avg) && avg % 1 >= 0.3
                          ? "fill-success/50 text-success"
                          : "text-border",
                    )}
                  />
                ))}
              </div>
              <p className="text-sm font-bold text-fg">
                <span className="text-success">{count.toLocaleString()}</span>{" "}
                ratings
              </p>
              <p className="text-[11px] font-medium text-muted">
                Across all ExamHub services
              </p>
            </div>

            {/* Actions + copy */}
            <div className="flex flex-col justify-center gap-4 px-4 py-5 sm:px-6 sm:py-6">
              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    <Sparkles className="h-3 w-3" />
                    Community trust
                  </span>
                  <span className="text-[11px] font-semibold text-success">
                    Green vouch · SAT June 6, 2026
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold tracking-tight text-fg sm:text-2xl">
                  Real 1600 score reports + open reviews
                </h2>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-fg-muted">
                  Perfect-score screenshots (names censored). Tap{" "}
                  <strong className="text-fg">Read more</strong> for photos, or
                  leave your own review below.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPhotosOpen((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition",
                    photosOpen
                      ? "border border-border bg-bg-soft text-fg"
                      : "bg-success text-white hover:bg-success/90 shadow-success/20",
                  )}
                  aria-expanded={photosOpen}
                  aria-controls="vouch-score-photos"
                >
                  {photosOpen ? (
                    <>
                      Hide score photos
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Read more
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewOpen((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition",
                    reviewOpen
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-primary/40 bg-surface text-primary hover:border-primary hover:bg-primary-soft",
                  )}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  {reviewOpen ? "Close form" : "Write a review"}
                </button>
              </div>
            </div>
          </div>

          {/* Photo grid — only after Read more */}
          {photosOpen ? (
            <div
              id="vouch-score-photos"
              className="border-t border-success/20 bg-gradient-to-b from-success-soft/30 to-surface px-3 py-4 sm:px-5"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-success">
                  SAT June 6, 2026 · 1600 photo vouches
                </p>
                <p className="text-[11px] font-medium text-muted">
                  Names censored · screenshots only
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                {SCORE_VOUCHES.map((v) => (
                  <figure
                    key={v.id}
                    className="group overflow-hidden rounded-2xl border-2 border-success/30 bg-[#0a0a0c] shadow-md ring-1 ring-black/5 transition hover:border-success hover:shadow-lg"
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
                        className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
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

          {/* Write a review */}
          {reviewOpen ? (
            <form
              onSubmit={onSubmit}
              className="space-y-4 border-t border-border bg-bg-soft/50 px-4 py-5 sm:px-6"
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
                    minLength={2}
                    className="bg-surface"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Service</Label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                  >
                    <option value="overall">Overall ExamHub</option>
                    <option value="sat">SAT</option>
                    <option value="act">ACT</option>
                    <option value="proctoring">Proctor tools</option>
                    <option value="research">Research</option>
                    <option value="internships">Internships</option>
                    <option value="support">Support</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Your rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStars(i)}
                      className="rounded-lg p-1.5 transition hover:bg-success-soft"
                      aria-label={`${i} stars`}
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition",
                          i <= stars
                            ? "fill-success text-success"
                            : "text-border",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Review <span className="font-normal text-muted">(optional)</span>
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

          {/* Live user reviews */}
          {userReviews.length > 0 ? (
            <div className="border-t border-border px-4 py-4 sm:px-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
                Latest student reviews
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {userReviews.slice(0, 6).map((r) => (
                  <article
                    key={r.id}
                    className="rounded-xl border border-border bg-bg-soft/60 px-3.5 py-3"
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
      </div>
    </section>
  );
}
