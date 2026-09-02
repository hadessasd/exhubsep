import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { SatAssistDemo } from "@/components/demo/sat-assist-demo";
import { SandboxVisual } from "@/components/demo/sandbox-visual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Briefcase,
  FileText,
  Play,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      {
        title: "SAT Assist Demo & Sandbox Visual | ExamHub 2026",
      },
      {
        name: "description",
        content:
          "Interactive SAT assist demo with guided tutorial, discreet answer overlay, and ExamHub sandbox isolation visual.",
      },
      {
        name: "keywords",
        content:
          "SAT assist demo, exam sandbox, proctor sandbox visual, ExamHub demo, discreet answer overlay",
      },
    ],
  }),
});

function DemoPage() {
  const { isAdmin } = Route.useRouteContext();

  return (
    <Shell isAdmin={isAdmin}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <Badge className="mb-3">
            <Play className="mr-1 h-3.5 w-3.5" />
            Interactive demo
          </Badge>
          <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">
            Assessment preview & sandbox
          </h1>
          <p className="mt-3 text-sm text-fg-muted sm:text-base">
            Start with a short setup tutorial (arrow points to Assist — same
            place as the real software), then try 5 sample questions and the
            sandbox isolation visual.
          </p>
        </div>

        {/* Separate services — no prices */}
        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          <Card className="overflow-hidden border-border bg-surface shadow-sm">
            <CardContent className="flex items-start gap-3 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Service
                </p>
                <h2 className="font-display text-lg font-semibold text-fg">
                  Research papers
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Subject, journal targets, and options — quote after you submit.
                </p>
                <Link to="/research" className="mt-3 inline-block">
                  <Button size="sm">
                    Open research
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-border bg-surface shadow-sm">
            <CardContent className="flex items-start gap-3 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Briefcase className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Service
                </p>
                <h2 className="font-display text-lg font-semibold text-fg">
                  Internships
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Field, location, and preferences — we reach out after you apply.
                </p>
                <Link to="/internships" className="mt-3 inline-block">
                  <Button size="sm" variant="secondary">
                    Open internships
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="mb-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-fg">
                SAT assessment preview
              </h2>
              <p className="text-sm text-fg-muted">
                Tutorial first · then 5 questions with discreet Assist
              </p>
            </div>
            <Link to="/category/$cat" params={{ cat: "sat" }}>
              <Button variant="outline" size="sm">
                View SAT products
              </Button>
            </Link>
          </div>
          <SatAssistDemo />
        </section>

        <section className="mb-12">
          <div className="mb-4">
            <h2 className="font-display text-xl font-semibold text-fg">
              Sandbox isolation visual
            </h2>
            <p className="text-sm text-fg-muted">
              How ExamHub classifies and isolates apps during a session
            </p>
          </div>
          <SandboxVisual />
        </section>

        <Card className="border-primary/25 bg-primary-soft/30">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
              <div>
                <h3 className="font-display text-lg font-semibold text-fg">
                  Universal Proctor Bypass
                </h3>
                <p className="text-sm text-fg-muted">
                  One package for LockDown, Honorlock, Proctorio, SEB and 30+
                  platforms worldwide.
                </p>
              </div>
            </div>
            <Link
              to="/products/$slug"
              params={{ slug: "proctor-universal-proctor-bypass" }}
            >
              <Button>
                View package
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
