import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  GraduationCap,
  Menu,
  Search,
  Shield,
  X,
  LayoutDashboard,
  Package,
  FileText,
  Briefcase,
  Trophy,
  Wrench,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import { NotificationBell } from "@/components/notifications/notification-panel";
import { checkIsAdmin } from "@/lib/server/examhub";
import { cn } from "@/lib/utils";

type NavItem =
  | {
      kind: "cat";
      cat: "sat" | "act" | "proctoring" | "contests" | "tools";
      label: string;
      icon: typeof GraduationCap;
    }
  | {
      kind: "path";
      to: "/research" | "/internships" | "/blog" | "/demo";
      label: string;
      icon: typeof FileText;
      highlight?: boolean;
    };

const NAV: NavItem[] = [
  { kind: "cat", cat: "sat", label: "SAT", icon: GraduationCap },
  { kind: "cat", cat: "act", label: "ACT", icon: BookOpen },
  { kind: "cat", cat: "proctoring", label: "Proctor", icon: Shield },
  { kind: "cat", cat: "contests", label: "Contests", icon: Trophy },
  { kind: "path", to: "/demo", label: "Demo", icon: Play },
  {
    kind: "path",
    to: "/research",
    label: "Research",
    icon: FileText,
    highlight: true,
  },
  {
    kind: "path",
    to: "/internships",
    label: "Internships",
    icon: Briefcase,
    highlight: true,
  },
  { kind: "cat", cat: "tools", label: "Tools", icon: Wrench },
];

const ADMIN_CACHE = "examhub.is-admin";

export function SiteHeader({ isAdmin: _unused = false }: { isAdmin?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(ADMIN_CACHE) === "1";
    } catch {
      return false;
    }
  });

  // Resolve admin once session is ready — sticky, no flip-flop on errors
  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setIsAdmin(false);
      try {
        sessionStorage.removeItem(ADMIN_CACHE);
      } catch {
        /* ignore */
      }
      return;
    }
    let cancelled = false;
    void checkIsAdmin()
      .then((r) => {
        if (cancelled) return;
        setIsAdmin(r.isAdmin);
        try {
          if (r.isAdmin) sessionStorage.setItem(ADMIN_CACHE, "1");
          else sessionStorage.removeItem(ADMIN_CACHE);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        // Keep previous isAdmin on network blip — don't flash off
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isPending]);

  return (
    <header className="sticky top-0 z-50 w-full max-w-[100vw] border-b border-border/80 bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl min-w-0 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
        <Link to="/" className="group flex min-w-0 shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg shadow-md transition-transform group-hover:scale-105 sm:h-9 sm:w-9 sm:rounded-xl">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-fg sm:text-xl">
            Exam<span className="text-primary">Hub</span>
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
          {NAV.map((item) =>
            item.kind === "cat" ? (
              <Link
                key={item.cat}
                to="/category/$cat"
                params={{ cat: item.cat }}
                className="rounded-lg px-2 py-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-primary-soft hover:text-primary xl:px-2.5"
              >
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors xl:px-2.5",
                  item.highlight
                    ? "bg-primary-soft/70 font-semibold text-primary hover:bg-primary-soft"
                    : "text-fg-muted hover:bg-primary-soft hover:text-primary",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            to="/"
            hash="catalog"
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-fg-muted shadow-sm transition-colors hover:border-primary/40 hover:text-primary sm:flex"
            aria-label="Search catalog"
          >
            <Search className="h-4 w-4" />
          </Link>

          {/* Reserve stable width — never swap Sign in ↔ skeleton mid-session */}
          {user ? (
            <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
              <NotificationBell />
              <Link
                to="/orders"
                search={{ placed: undefined, tab: undefined }}
                className="hidden sm:block"
              >
                <Button variant="ghost" size="sm" className="h-9 px-2.5">
                  <Package className="h-4 w-4" />
                  <span className="hidden md:inline">Dashboard</span>
                </Button>
              </Link>
              {isAdmin ? (
                <Link to="/admin">
                  <Button variant="secondary" size="sm" className="h-9 px-2.5">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden md:inline">Admin</span>
                  </Button>
                </Link>
              ) : null}
              <UserButton compact />
            </div>
          ) : isPending ? (
            <div className="h-9 w-20 shrink-0 rounded-xl bg-bg-soft/80" aria-hidden />
          ) : (
            <Link to="/login">
              <Button size="sm" className="h-9">
                Sign in
              </Button>
            </Link>
          )}

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-fg lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "w-full border-t border-border bg-surface lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 p-3">
          {NAV.map((item) =>
            item.kind === "cat" ? (
              <Link
                key={item.cat}
                to="/category/$cat"
                params={{ cat: item.cat }}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-primary-soft"
              >
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-primary-soft"
              >
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </Link>
            ),
          )}
          {user ? (
            <>
              <Link
                to="/orders"
                search={{ placed: undefined, tab: undefined }}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-primary-soft"
              >
                <Package className="h-4 w-4 text-primary" />
                Dashboard
              </Link>
              {isAdmin ? (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-primary-soft"
                >
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  Admin
                </Link>
              ) : null}
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-primary-soft"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
