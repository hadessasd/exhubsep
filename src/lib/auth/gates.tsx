import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { authEnabled, signOut } from "./client";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";

/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present (real session, or the disabled-auth dev user). */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/**
 * Render children only once we KNOW the visitor is signed out (`isPending` has
 * cleared and there is no user). Hidden while the session is still loading.
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

/**
 * Client-side redirect to the sign-in route. Guard with isPending first.
 * Skips redirect briefly after a fresh sign-in to avoid glitch loops.
 */
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  // After hard navigation from login, session can lag 1 tick — don't bounce yet
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem("examhub.just-signed-in") === "1") {
        // clear after a short grace window
        window.setTimeout(() => {
          try {
            sessionStorage.removeItem("examhub.just-signed-in");
            sessionStorage.removeItem("examhub.auth-navigating");
          } catch {
            /* ignore */
          }
        }, 2500);
        return (
          <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-fg-muted">
            Loading your account…
          </div>
        );
      }
    } catch {
      /* ignore */
    }
  }
  return <Navigate to={to} />;
}

/**
 * Minimal signed-in identity chip + sign-out.
 */
export function UserButton({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser();
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  const short = label.length > 14 ? `${label.slice(0, 12)}…` : label;

  return (
    <div className="flex min-w-0 max-w-[140px] items-center gap-1.5 sm:max-w-[180px] sm:gap-2">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      {!compact ? (
        <span className="min-w-0 truncate text-sm font-medium text-fg">
          {short}
        </span>
      ) : (
        <span className="hidden min-w-0 truncate text-sm font-medium text-fg md:inline">
          {short}
        </span>
      )}
      {authEnabled && (
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem("examhub.just-signed-in");
              sessionStorage.removeItem("examhub.auth-navigating");
            } catch {
              /* ignore */
            }
            void signOut();
          }}
          className="shrink-0 cursor-pointer text-xs font-medium text-fg-muted underline-offset-4 hover:text-primary hover:underline sm:text-sm"
        >
          Out
        </button>
      )}
    </div>
  );
}
