import { useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Q = {
  id: number;
  passage?: string;
  prompt: string;
  choices: string[];
  answer: number;
  hint: string;
};

const QUESTIONS: Q[] = [
  {
    id: 1,
    passage:
      "The digital SAT emphasizes evidence-based reading. Passages are shorter; each question targets a discrete skill.",
    prompt: "Which choice best describes the main purpose of the passage?",
    choices: [
      "To argue that longer passages improve reading scores",
      "To explain how the digital SAT structures reading items",
      "To claim that evidence is no longer required",
      "To criticize adaptive testing entirely",
    ],
    answer: 1,
    hint: "B",
  },
  {
    id: 2,
    prompt: "If 3x + 7 = 22, what is the value of 6x + 14?",
    choices: ["15", "30", "44", "Cannot be determined"],
    answer: 2,
    hint: "C · 3x+7=22 → x=5 → 6x+14=44",
  },
  {
    id: 3,
    prompt:
      "A store marks an item up 20%, then discounts it 20%. Compared with the original price, the final price is:",
    choices: ["The same", "4% lower", "4% higher", "20% lower"],
    answer: 1,
    hint: "B · 1.2 × 0.8 = 0.96 → 4% lower",
  },
  {
    id: 4,
    passage:
      "Adaptive modules adjust difficulty after module 1. Strong performance unlocks a harder module 2 with a higher score ceiling.",
    prompt: "According to the text, what unlocks a higher score ceiling?",
    choices: [
      "Skipping module 1",
      "Strong performance on module 1",
      "Using a graphing calculator",
      "Requesting extra time only",
    ],
    answer: 1,
    hint: "B",
  },
  {
    id: 5,
    prompt:
      "In the xy-plane, line k has slope 2 and passes through (0, −3). Which equation represents k?",
    choices: ["y = 2x − 3", "y = −2x + 3", "y = 2x + 3", "y = −3x + 2"],
    answer: 0,
    hint: "A · slope-intercept: y = 2x − 3",
  },
];

type Position = "top-right" | "top-left" | "bottom-right" | "bottom-left";
type Shape = "pill" | "circle" | "square" | "dot";

const POS_CLASS: Record<Position, string> = {
  "top-right": "top-3 right-3",
  "top-left": "top-3 left-3",
  "bottom-right": "bottom-3 right-3",
  "bottom-left": "bottom-3 left-3",
};

const SHAPE_CLASS: Record<Shape, string> = {
  pill: "h-8 rounded-full px-3 text-xs font-semibold",
  circle: "h-9 w-9 rounded-full text-[10px] font-bold",
  square: "h-8 w-8 rounded-md text-[10px] font-bold",
  dot: "h-3 w-3 rounded-full p-0 text-[0px]",
};

const TUTORIAL_STEPS = [
  {
    title: "Welcome to the assessment preview",
    body: "This mirrors a real digital exam layout — passage or prompt on the left, answer choices on the right, timer and question count on top.",
  },
  {
    title: "Find the Assist control",
    body: "Look at the white button in the top-right of the exam frame (highlighted with an arrow). That’s your discreet assist trigger — same place it appears in the live tool.",
    highlightAssist: true,
  },
  {
    title: "Press Assist to reveal",
    body: "Click Assist once. The answer appears nearby in a low-contrast chip so it stays discreet. Click again to hide it.",
    highlightAssist: true,
  },
  {
    title: "Tune discreet settings",
    body: "On the right panel you can change answer color, opacity, button shape, and position so the control blends into your screen.",
  },
  {
    title: "You’re ready",
    body: "Work through all 5 sample questions. Use Back / Next or the dots under the frame — just like a real module.",
  },
];

export function SatAssistDemo() {
  const [phase, setPhase] = useState<"tutorial" | "exam">("tutorial");
  const [tutStep, setTutStep] = useState(0);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [textColor, setTextColor] = useState("#94a3b8");
  const [opacity, setOpacity] = useState(0.55);
  const [position, setPosition] = useState<Position>("top-right");
  const [shape, setShape] = useState<Shape>("pill");
  const [btnOpacity, setBtnOpacity] = useState(0.85);

  const q = QUESTIONS[idx]!;
  const letters = ["A", "B", "C", "D"];
  const step = TUTORIAL_STEPS[tutStep]!;
  const showAssistPulse =
    phase === "tutorial" && Boolean(step.highlightAssist);

  const answerLabel = useMemo(
    () => `${letters[q.answer]} · ${q.choices[q.answer]}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q],
  );

  function go(n: number) {
    setIdx(n);
    setSelected(null);
    setRevealed(false);
  }

  function nextTut() {
    if (tutStep >= TUTORIAL_STEPS.length - 1) {
      setPhase("exam");
      setRevealed(false);
      return;
    }
    setTutStep((s) => s + 1);
  }

  function skipTut() {
    setPhase("exam");
    setRevealed(false);
  }

  const examFrame = (
    <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-[#f7f8fa] shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Demo SAT
          </span>
          <span className="text-xs font-medium text-slate-600">
            Module 1 · Reading & Writing
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            Q {idx + 1} / {QUESTIONS.length}
          </span>
          <span className="font-mono tabular-nums">32:00</span>
        </div>
      </div>

      {/* Assist control + tutorial arrow */}
      <div className={cn("absolute z-30", POS_CLASS[position])}>
        {showAssistPulse ? (
          <div className="pointer-events-none absolute -left-28 top-1/2 flex -translate-y-1/2 items-center gap-1 sm:-left-36">
            <span className="rounded-lg bg-primary px-2 py-1 text-[10px] font-bold text-white shadow-md">
              Click here
            </span>
            <ArrowUpRight className="h-6 w-6 animate-bounce text-primary drop-shadow" />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (phase === "tutorial" && step.highlightAssist) {
              setRevealed(true);
              return;
            }
            if (phase === "exam") setRevealed((v) => !v);
          }}
          className={cn(
            "relative flex items-center justify-center border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50",
            SHAPE_CLASS[shape],
            showAssistPulse &&
              "ring-2 ring-primary ring-offset-2 animate-pulse",
          )}
          style={{ opacity: btnOpacity }}
          aria-label="Toggle assist overlay"
          title="Assist"
        >
          {shape === "dot" ? null : shape === "pill" ? "Assist" : "A"}
        </button>
      </div>

      {revealed ? (
        <div
          className={cn(
            "pointer-events-none absolute z-20 max-w-[200px] rounded px-2 py-1 text-[11px] leading-snug",
            position.includes("right") ? "right-3" : "left-3",
            position.startsWith("top") ? "top-12" : "bottom-12",
          )}
          style={{ color: textColor, opacity }}
        >
          <span className="font-semibold">Ans:</span> {answerLabel}
        </div>
      ) : null}

      <div className="grid min-h-[340px] md:grid-cols-2">
        <div className="border-b border-slate-200 p-5 md:border-b-0 md:border-r">
          {q.passage ? (
            <p className="mb-4 text-sm leading-relaxed text-slate-700">
              {q.passage}
            </p>
          ) : (
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-400">
              Math · No calculator needed
            </p>
          )}
          <p className="text-sm font-semibold text-slate-900">{q.prompt}</p>
        </div>
        <div className="space-y-2 p-4">
          {q.choices.map((c, i) => {
            const active = selected === i;
            const isCorrect = phase === "exam" && revealed && i === q.answer;
            return (
              <button
                key={i}
                type="button"
                onClick={() => phase === "exam" && setSelected(i)}
                disabled={phase === "tutorial"}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition",
                  active
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300",
                  isCorrect && "ring-1 ring-teal-400/60",
                  phase === "tutorial" && "cursor-default opacity-90",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    active
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-300 text-slate-600",
                  )}
                >
                  {letters[i]}
                </span>
                <span className="text-slate-800">{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={phase === "tutorial" || idx === 0}
          onClick={() => go(idx - 1)}
        >
          Back
        </Button>
        <div className="flex gap-1">
          {QUESTIONS.map((_, i) => (
            <button
              key={i}
              type="button"
              disabled={phase === "tutorial"}
              onClick={() => go(i)}
              className={cn(
                "h-2 w-2 rounded-full transition",
                i === idx ? "bg-blue-600" : "bg-slate-300",
              )}
              aria-label={`Question ${i + 1}`}
            />
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={phase === "tutorial" || idx >= QUESTIONS.length - 1}
          onClick={() => go(idx + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );

  if (phase === "tutorial") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="relative">
          {examFrame}
          {/* Soft dim during tutorial except assist highlight */}
          <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-slate-900/25" />
          {showAssistPulse ? (
            <div className="pointer-events-none absolute right-0 top-8 z-20 h-16 w-28 rounded-full bg-transparent ring-0 sm:right-0" />
          ) : null}
        </div>

        <div className="relative z-20 rounded-2xl border border-primary/30 bg-surface p-5 shadow-lg">
          <Badge className="mb-3">
            <MousePointerClick className="mr-1 h-3.5 w-3.5" />
            Setup tutorial · {tutStep + 1}/{TUTORIAL_STEPS.length}
          </Badge>
          <h3 className="font-display text-lg font-semibold text-fg">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            {step.body}
          </p>

          <div className="mt-4 flex gap-1">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i <= tutStep ? "bg-primary" : "bg-border",
                )}
              />
            ))}
          </div>

          <ul className="mt-4 space-y-2">
            {[
              "Exam chrome matches real software",
              "Assist sits top-right by default",
              "Discreet answer chip after press",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-xs text-fg-muted"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {line}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-2">
            <Button type="button" className="w-full" onClick={nextTut}>
              {tutStep >= TUTORIAL_STEPS.length - 1
                ? "Start 5-question demo"
                : "Next"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={skipTut}
            >
              Skip tutorial
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      {examFrame}

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Badge variant="outline">Discreet settings</Badge>
          <button
            type="button"
            className="text-[11px] font-medium text-primary hover:underline"
            onClick={() => {
              setPhase("tutorial");
              setTutStep(0);
              setRevealed(false);
            }}
          >
            Replay tutorial
          </button>
        </div>
        <p className="mb-4 text-xs text-fg-muted">
          Tune how the assist overlay looks. Press the white Assist button in
          the exam frame to reveal answers.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Answer text color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-border bg-surface"
              />
              <span className="font-mono text-xs text-muted">{textColor}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Answer opacity · {Math.round(opacity * 100)}%
            </Label>
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={(e) => setOpacity(Number(e.target.value) / 100)}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Button opacity · {Math.round(btnOpacity * 100)}%
            </Label>
            <input
              type="range"
              min={15}
              max={100}
              value={Math.round(btnOpacity * 100)}
              onChange={(e) => setBtnOpacity(Number(e.target.value) / 100)}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Button shape</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["pill", "circle", "square", "dot"] as Shape[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShape(s)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs font-medium capitalize",
                    shape === s
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-fg-muted hover:border-primary/40",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Button position</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  "top-right",
                  "top-left",
                  "bottom-right",
                  "bottom-left",
                ] as Position[]
              ).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPosition(p)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs font-medium",
                    position === p
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-fg-muted hover:border-primary/40",
                  )}
                >
                  {p.replace("-", " ")}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setRevealed(true)}
          >
            Reveal answer now
          </Button>
        </div>
      </div>
    </div>
  );
}
