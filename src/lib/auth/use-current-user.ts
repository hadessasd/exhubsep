import { useEffect, useRef, useState } from "react";
import { authClient, authEnabled } from "./client";

/** Normalized user shape used across the app, auth on or off. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  /** True when this is the sandbox/dev fallback (auth not configured). */
  isDevFallback: boolean;
};

export const DEV_USER: AppUser = {
  id: "dev-user",
  displayName: "Dev User",
  primaryEmail: "dev@example.com",
  profileImageUrl: null,
  isDevFallback: true,
};

export type CurrentUserState = {
  user: AppUser | null;
  /** True only on the very first session resolution — not on background refetches. */
  isPending: boolean;
};

function mapUser(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}): AppUser {
  return {
    id: user.id,
    displayName: user.name ?? null,
    primaryEmail: user.email ?? null,
    profileImageUrl: user.image ?? null,
    isDevFallback: false,
  };
}

const CACHE_KEY = "examhub.session-user";

function readCachedUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    if (parsed?.id) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCachedUser(user: AppUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user && !user.isDevFallback) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(CACHE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Sticky session hook — keeps the last known user during Better Auth refetches
 * so the header / admin UI don't flicker signed-out on every poll.
 */
export function useCurrentUserState(): CurrentUserState {
  if (!authEnabled) return { user: DEV_USER, isPending: false };

  // eslint-disable-next-line react-hooks/rules-of-hooks -- authEnabled is constant
  const { data, isPending: sessionPending } = authClient.useSession();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const sticky = useRef<AppUser | null>(
    typeof window !== "undefined" ? readCachedUser() : null,
  );
  // Force re-render when sticky cache changes from effects
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [, bump] = useState(0);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (data?.user) {
      const mapped = mapUser(data.user);
      sticky.current = mapped;
      writeCachedUser(mapped);
      bump((n) => n + 1);
      return;
    }
    // Confirmed signed-out only when session is settled with no user
    if (!sessionPending && !data?.user) {
      if (sticky.current !== null) {
        sticky.current = null;
        writeCachedUser(null);
        bump((n) => n + 1);
      }
    }
  }, [data, sessionPending]);

  if (data?.user) {
    return { user: mapUser(data.user), isPending: false };
  }

  // First load: show cached user immediately (no Sign-in flash)
  if (sessionPending) {
    if (sticky.current) {
      return { user: sticky.current, isPending: false };
    }
    return { user: null, isPending: true };
  }

  // Settled: signed out
  return { user: null, isPending: false };
}

export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}

/** Clear sticky session cache (call on sign-out). */
export function clearSessionUserCache() {
  writeCachedUser(null);
}
