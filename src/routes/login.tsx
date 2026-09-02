import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { DoodleBackground } from "@/components/layout/doodle-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Sign in | ExamHub" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    if (isPending || !user || redirected.current) return;
    redirected.current = true;
    void navigate({ to: "/", replace: true });
  }, [user, isPending, navigate]);

  function goHome() {
    redirected.current = true;
    try {
      sessionStorage.setItem("examhub.just-signed-in", "1");
    } catch {
      /* ignore */
    }
    void navigate({ to: "/", replace: true });
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail({
          email,
          password,
          name: name || email.split("@")[0] || "Student",
        });
        toast.success("Account created");
      } else {
        await signInWithEmail({ email, password });
        toast.success("Welcome back");
      }
      await new Promise((r) => setTimeout(r, 200));
      goHome();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
      setLoading(false);
    }
  }

  if (isPending) {
    return (
      <div className="relative min-h-dvh w-full overflow-x-hidden">
        <DoodleBackground />
        <div className="relative z-10 flex min-h-dvh items-center justify-center p-4">
          <div className="h-40 w-full max-w-md animate-pulse rounded-3xl bg-surface/80" />
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="relative min-h-dvh w-full overflow-x-hidden">
        <DoodleBackground />
        <div className="relative z-10 flex min-h-dvh items-center justify-center p-4 text-sm text-fg-muted">
          Taking you home…
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] overflow-x-hidden">
      <DoodleBackground />
      <div className="relative z-10 flex min-h-dvh w-full items-center justify-center p-4">
        <Card className="w-full max-w-md overflow-hidden shadow-glow">
          <CardHeader className="items-center text-center">
            <Link to="/" className="mb-2 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-fg">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="font-display text-xl font-bold text-fg">
                Exam<span className="text-primary">Hub</span>
              </span>
            </Link>
            <CardTitle>
              {mode === "signin" ? "Sign in with email" : "Create account"}
            </CardTitle>
            <p className="text-sm text-fg-muted">
              Email + password only — no Google
            </p>
          </CardHeader>
          <CardContent className="min-w-0 space-y-5">
            <form onSubmit={onEmailSubmit} className="min-w-0 space-y-3">
              {mode === "signup" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full"
                    autoComplete="name"
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  className="w-full"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </Button>
            </form>

            <div className="flex items-start gap-2 rounded-xl bg-bg-soft px-3 py-2.5 text-xs text-fg-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Use a real email you check. Admin: minjunnios@gmail.com. Support
                Discord: minjunio.
              </p>
            </div>

            <p className="text-center text-sm text-fg-muted">
              {mode === "signin" ? (
                <>
                  New here?{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={() => setMode("signin")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
            <p className="text-center">
              <Link to="/" className="text-sm text-muted hover:text-primary">
                ← Back to home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
