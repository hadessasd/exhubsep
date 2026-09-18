import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  GraduationCap,
  Menu,
  Shield,
  X,
  LayoutDashboard,
  Package,
  FileText,
  Briefcase,
  Trophy,
  Wrench,
  Send,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import { NotificationBell } from "@/components/notifications/notification-panel";
import { checkIsAdmin } from "@/lib/server/examhub";
import { cn } from "@/lib/utils";
import { SUPPORT_TELEGRAM, SUPPORT_TELEGRAM_URL } from "@/lib/data/catalog";

type CatItem = {
  kind: "cat";
  cat: "sat" | "act" | "gmat" | "gre" | "proctoring";
  label: string;
  icon: typeof GraduationCap;
};

type PathItem = {
  kind: "path";
  to: "/research" | "/internships" | "/blog";
  label: string;
  icon: typeof FileText;
};

type ExtraCat = {
  kind: "cat";
  cat: "contests" | "tools";
  label: string;
  icon: typeof Trophy;
};

/** Primary exam pathways — always visible on desktop */
const PRIMARY: CatItem[] = [
  { kind: "cat", cat: "sat", label: "SAT", icon: GraduationCap },
  { kind: "cat", cat: "act", label: "ACT", icon: BookOpen },
  { kind: "cat", cat: "gre", label: "GRE", icon: BookOpen },
  { kind: "cat", cat: "gmat", label: "GMAT", icon: GraduationCap },
  { kind: "cat", cat: "proctoring", label: "Proctor", icon: Shield },
];

/** Secondary links — desktop “More” + full mobile list */
const MORE: Array<PathItem | ExtraCat> = [
  { kind: "cat", cat: "contests", label: "Contests", icon: Trophy },
  { kind: "cat", cat: "tools", label: "Tools", icon: Wrench },
  { kind: "path", to: "/research", label: "Research", icon: FileText },
  { kind: "path", to: "/internships", label: "Internships", icon: Briefcase },
  { kind: "path", to: "/blog", label: "Blog", icon: FileText },
];

const ADMIN_CACHE = "examhub.is-admin";

export function SiteHeader({ isAdmin: _unused = false }: { isAdmin?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(ADMIN_CACHE) === "1";
    } catch {
      return false;
    }
  });

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
        /* keep previous */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isPending]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close “More” on outside click / escape
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    const onClick = () => setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [moreOpen]);

  function closeMobile() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-border-strong/20 bg-surface/92 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:px-6">
        {/* Brand */}
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2"
          onClick={closeMobile}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-border-strong bg-primary text-primary-fg shadow-md transition-transform group-hover:scale-110 group-hover:rotate-[-6deg] sm:h-9 sm:w-9">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-fg sm:text-xl">
            Exam<span className="text-primary">Hub</span>
          </span>
        </Link>

        {/* Desktop primary nav */}
        <nav className="ml-2 hidden flex-1 items-center justify-center gap-0.5 md:flex lg:gap-1">
          {PRIMARY.map((item) => (
            <Link
              key={item.cat}
              to="/category/$cat"
              params={{ cat: item.cat }}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:bg-primary-soft hover:text-primary lg:px-3"
            >
              {item.label}
            </Link>
          ))}

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors lg:px-3",
                moreOpen
                  ? "bg-primary-soft text-primary"
                  : "text-fg-muted hover:bg-primary-soft hover:text-primary",
              )}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onClick={() => setMoreOpen((v) => !v)}
            >
              More
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  moreOpen && "rotate-180",
                )}
              />
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className="absolute left-1/2 top-full z-50 mt-2 w-52 -translate-x-1/2 rounded-2xl border border-border bg-surface p-1.5 shadow-xl"
              >
                {MORE.map((item) =>
                  item.kind === "cat" ? (
                    <Link
                      key={item.cat}
                      to="/category/$cat"
                      params={{ cat: item.cat }}
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-fg hover:bg-primary-soft hover:text-primary"
                    >
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </Link>
                  ) : (
                    <Link
                      key={item.to}
                      to={item.to}
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-fg hover:bg-primary-soft hover:text-primary"
                    >
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </Link>
                  ),
                )}
              </div>
            ) : null}
          </div>
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a
            href={SUPPORT_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/25 bg-primary-soft px-2.5 text-xs font-semibold text-primary transition-colors hover:border-primary/50 sm:px-3"
            aria-label={`Telegram @${SUPPORT_TELEGRAM}`}
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Telegram</span>
          </a>

          {user ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <NotificationBell />
              <Link to="/orders" search={{ placed: undefined, tab: undefined }} className="hidden lg:block">
                <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5">
                  <Package className="h-4 w-4" />
                  <span>Orders</span>
                </Button>
              </Link>
              {isAdmin ? (
                <Link to="/admin" className="hidden sm:block">
                  <Button variant="secondary" size="sm" className="h-9 gap-1.5 px-2.5">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden md:inline">Admin</span>
                  </Button>
                </Link>
              ) : null}
              <UserButton compact />
            </div>
          ) : isPending ? (
            <div className="h-9 w-[4.5rem] shrink-0 rounded-xl bg-bg-soft/80" aria-hidden />
          ) : (
            <Link to="/login" className="hidden sm:block">
              <Button size="sm" className="h-9">
                Sign in
              </Button>
            </Link>
          )}

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-fg md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open ? (
        <div className="fixed inset-0 top-14 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label="Dismiss menu"
            onClick={closeMobile}
          />
          <div className="absolute inset-x-0 top-0 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-border bg-surface shadow-2xl">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 p-3 pb-6">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Pathways
              </p>
              {PRIMARY.map((item) => (
                <Link
                  key={item.cat}
                  to="/category/$cat"
                  params={{ cat: item.cat }}
                  onClick={closeMobile}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-fg hover:bg-primary-soft"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.label}
                </Link>
              ))}

              <p className="mt-2 px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                More
              </p>
              {MORE.map((item) =>
                item.kind === "cat" ? (
                  <Link
                    key={item.cat}
                    to="/category/$cat"
                    params={{ cat: item.cat }}
                    onClick={closeMobile}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-primary-soft"
                  >
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.label}
                  </Link>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMobile}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-primary-soft"
                  >
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.label}
                  </Link>
                ),
              )}

              <div className="mt-3 space-y-1 border-t border-border pt-3">
                <a
                  href={SUPPORT_TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobile}
                  className="flex min-h-11 items-center gap-3 rounded-xl bg-primary-soft px-3 py-2.5 text-sm font-semibold text-primary"
                >
                  <Send className="h-4 w-4" />
                  Telegram · @{SUPPORT_TELEGRAM}
                </a>
                {user ? (
                  <>
                    <Link
                      to="/orders"
                      search={{ placed: undefined, tab: undefined }}
                      onClick={closeMobile}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-primary-soft"
                    >
                      <Package className="h-4 w-4 text-primary" />
                      Orders
                    </Link>
                    {isAdmin ? (
                      <Link
                        to="/admin"
                        onClick={closeMobile}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg hover:bg-primary-soft"
                      >
                        <LayoutDashboard className="h-4 w-4 text-primary" />
                        Admin
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={closeMobile}
                    className="flex min-h-11 items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-fg"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
