import { useEffect, useState } from "react";
import { Star, MessageSquarePlus, BadgeCheck } from "lucide-react";
import { getPublicRatings, submitRating } from "@/lib/server/examhub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RatingsData = Awaited<ReturnType<typeof getPublicRatings>>;

/**
 * Compact rating form only — June SAT photo vouches live in ScoreVouches at top.
 * No text review cards / user quotes here.
 */
export function RatingsSection() {
  const [data, setData] = useState<RatingsData | null>(null);
  const [name, setName] = useState("");
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [service, setService] = useState("overall");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void getPublicRatings()
      .then(setData)
      .catch(() =>
        setData({
          average: 4.4,
          count: 755,
          seedCount: 755,
          seedAverage: 4.4,
          recent: [],
        }),
      );
  }, []);

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
      setComment("");
      setShowForm(false);
      const r = await getPublicRatings();
      setData(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save rating");
    } finally {
      setBusy(false);
    }
  }

  const avg = data?.average ?? 4.4;
  const count = data?.count ?? 755;

  return (
    <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-border bg-surface/90 p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-success-soft">
            <span className="font-display text-2xl font-bold text-fg">
              {avg.toFixed(1)}
            </span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-2.5 w-2.5",
                    i <= Math.round(avg)
                      ? "fill-success text-success"
                      : "text-border",
                  )}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-success">
              <BadgeCheck className="h-3.5 w-3.5" />
              Community score
            </p>
            <p className="font-display text-lg font-semibold text-fg">
              {count.toLocaleString()} ratings across all services
            </p>
            <p className="text-xs text-fg-muted">
              Photo vouches are shown above · add your score anytime
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="border-success/30 bg-success-soft text-success hover:bg-success hover:text-white"
          onClick={() => setShowForm((v) => !v)}
        >
          <MessageSquarePlus className="h-4 w-4" />
          {showForm ? "Hide form" : "Add a rating"}
        </Button>
      </div>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className="mt-4 space-y-3 rounded-2xl border border-success/25 bg-success-soft/40 p-4"
        >
          <p className="text-sm font-semibold text-fg">Leave a rating</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Display name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name or initials"
                required
                minLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Service</Label>
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
            <Label className="text-xs">Stars</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStars(i)}
                  className="rounded-lg p-1 transition hover:bg-success-soft"
                  aria-label={`${i} stars`}
                >
                  <Star
                    className={cn(
                      "h-7 w-7",
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
            <Label className="text-xs">Optional note</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional — not shown as a public review card"
              className="min-h-[64px]"
              maxLength={800}
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="bg-success text-white hover:bg-success/90"
          >
            {busy ? "Saving…" : "Submit rating"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
