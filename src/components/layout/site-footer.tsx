import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { SUPPORT_DISCORD, SUPPORT_TELEGRAM_URL, SUPPORT_TELEGRAM } from "@/lib/data/catalog";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-20 border-t border-border bg-surface/90">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold text-fg">
              Exam<span className="text-primary">Hub</span>
            </span>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-fg-muted">
            Premium exam prep pathways for SAT, ACT, proctored assessments,
            contests (USACO & more), research quotes, and internship matching.
            Secure checkout via crypto gift cards or on-chain BTC, SOL, and ETH.
          </p>
          <p className="mt-3 text-xs text-muted">
            Support 24/7 · live chat on site · Discord @{SUPPORT_DISCORD} ·{" "}
            <a
              href={SUPPORT_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              Telegram @{SUPPORT_TELEGRAM}
            </a>
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-fg">Catalog</h4>
          <ul className="space-y-2 text-sm text-fg-muted">
            <li>
              <Link to="/category/$cat" params={{ cat: "sat" }} className="hover:text-primary">
                SAT tiers
              </Link>
            </li>
            <li>
              <Link to="/category/$cat" params={{ cat: "act" }} className="hover:text-primary">
                ACT tiers
              </Link>
            </li>
            <li>
              <Link
                to="/category/$cat"
                params={{ cat: "proctoring" }}
                className="hover:text-primary"
              >
                Proctor & lockdown
              </Link>
            </li>
            <li>
              <Link
                to="/category/$cat"
                params={{ cat: "contests" }}
                className="hover:text-primary"
              >
                Contests & olympiads
              </Link>
            </li>
            <li>
              <Link
                to="/category/$cat"
                params={{ cat: "tools" }}
                className="hover:text-primary"
              >
                Extra tools
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-fg">Resources</h4>
          <ul className="space-y-2 text-sm text-fg-muted">
            <li>
              <Link to="/demo" className="hover:text-primary">
                Live demo
              </Link>
            </li>
            <li>
              <Link to="/research" className="hover:text-primary">
                Research papers
              </Link>
            </li>
            <li>
              <Link to="/internships" className="hover:text-primary">
                Internships
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-primary">
                Blog
              </Link>
            </li>
            <li>
              <a href="/sitemap.xml" className="hover:text-primary">
                XML sitemap
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} ExamHub · Built for students worldwide
      </div>
    </footer>
  );
}
