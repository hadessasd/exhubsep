import { useEffect, useState } from "react";
import {
  AppWindow,
  Camera,
  Mic,
  Shield,
  Monitor,
  Layers,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const APPS = [
  { id: "browser", label: "Exam browser", icon: Monitor, zone: "allowed" },
  { id: "cam", label: "Camera feed", icon: Camera, zone: "monitored" },
  { id: "mic", label: "Microphone", icon: Mic, zone: "monitored" },
  { id: "notes", label: "Notes app", icon: AppWindow, zone: "blocked" },
  { id: "chat", label: "Messaging", icon: AppWindow, zone: "blocked" },
  { id: "clip", label: "Clipboard", icon: Layers, zone: "filtered" },
] as const;

export function SandboxVisual() {
  const [tick, setTick] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      setActive((a) => (a + 1) % APPS.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, []);

  const current = APPS[active]!;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-md sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Sandbox isolation
          </p>
          <h3 className="font-display text-lg font-semibold text-fg">
            How ExamHub sandboxing works
          </h3>
          <p className="mt-1 max-w-md text-sm text-fg-muted">
            Apps are classified, isolated, and only the exam surface stays
            interactive — monitors stay on, distractors stay out.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live isolation · tick {tick % 99}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        {/* Desktop mock */}
        <div className="relative min-h-[260px] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
          {/* Glow rings */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />

          <div className="relative z-10 mb-3 flex items-center gap-2 text-xs text-slate-300">
            <Shield className="h-4 w-4 text-sky-400" />
            <span className="font-medium">ExamHub Secure Sandbox</span>
            <Lock className="ml-auto h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {APPS.map((app, i) => {
              const Icon = app.icon;
              const isActive = i === active;
              const tone =
                app.zone === "allowed"
                  ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                  : app.zone === "monitored"
                    ? "border-sky-400/40 bg-sky-500/10 text-sky-100"
                    : app.zone === "filtered"
                      ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                      : "border-rose-400/40 bg-rose-500/10 text-rose-100";
              return (
                <div
                  key={app.id}
                  className={cn(
                    "rounded-xl border px-3 py-3 transition duration-500",
                    tone,
                    isActive && "scale-[1.03] shadow-lg shadow-black/30 ring-1 ring-white/20",
                    app.zone === "blocked" && !isActive && "opacity-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate text-xs font-semibold">
                      {app.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] uppercase tracking-wider opacity-80">
                    {app.zone}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Center policy bubble */}
          <div className="relative z-10 mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
            <p className="text-[11px] text-slate-200">
              <span className="font-semibold text-sky-300">Policy: </span>
              Scanning <span className="font-medium">{current.label}</span> →{" "}
              <span className="capitalize text-white">{current.zone}</span>
              {current.zone === "allowed" && " · full interaction"}
              {current.zone === "monitored" && " · stream allowed, no inject"}
              {current.zone === "filtered" && " · limited clipboard bridge"}
              {current.zone === "blocked" && " · process suspended"}
            </p>
          </div>
        </div>

        {/* Legend / steps */}
        <div className="space-y-2">
          {[
            {
              title: "1. Enumerate",
              body: "Detect open apps, extensions, and devices before launch.",
            },
            {
              title: "2. Classify",
              body: "Allowed · monitored · filtered · blocked zones.",
            },
            {
              title: "3. Isolate",
              body: "Suspend distractors; keep exam surface clean.",
            },
            {
              title: "4. Watch",
              body: "Cam/mic stay monitored without leaking keystrokes.",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="rounded-xl border border-border bg-bg-soft/80 px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                {step.title}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
