import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { GROK_PROVIDERS } from "./providers";

/**
 * Better Auth client for this React SPA (browser-side).
 *
 * Talks to this app's OWN Better Auth at same-origin `/api/auth/*`.
 *
 * Production (examhub.shop): native Google social login → returns to this site.
 * Live preview (grok-sandbox): Grok broker OAuth via popup + bearer token.
 */
export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
  fetchOptions: {
    onRequest(ctx) {
      const token = getBearerToken();
      if (token) ctx.headers.set("Authorization", `Bearer ${token}`);
      return ctx;
    },
  },
});

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/** Federated providers list (UI). Google only. */
export { GROK_PROVIDERS };

const BEARER_KEY = "grok-auth.bearer-token";

export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(BEARER_KEY);
  } catch {
    return null;
  }
}

export function persistSessionToken(token: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (!token) return;
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

function setBearerToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(BEARER_KEY, token);
    else window.sessionStorage.removeItem(BEARER_KEY);
  } catch {
    /* ignore */
  }
}

function inLivePreview(): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.hostname.endsWith(".grok-sandbox.com")
  );
}

/** True on the real ExamHub domain (or any non-sandbox deploy). */
function isProductionSite(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return false;
  if (h.endsWith(".grok-sandbox.com")) return false;
  return true;
}

/** Absolute home URL after Google — always this site, never Grok. */
function siteHomeUrl(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}/`;
}

type PopupMessage = {
  source: "grok-auth-popup";
  token: string | null;
  error?: string;
};

/**
 * Google sign-in.
 * - Production: native Better Auth social → Google → back to examhub.shop
 * - Preview: Grok broker popup (sandbox only)
 */
export async function signIn(
  providerId: string,
  opts: { callbackURL?: string; errorCallbackURL?: string } = {},
): Promise<void> {
  // Always land on THIS origin after auth (never grok.com)
  const callbackURL =
    opts.callbackURL && opts.callbackURL.startsWith("http")
      ? opts.callbackURL
      : siteHomeUrl();
  const errorCallbackURL =
    opts.errorCallbackURL && opts.errorCallbackURL.startsWith("http")
      ? opts.errorCallbackURL
      : siteHomeUrl();

  // ── Production / custom domain: native Google ──
  if (isProductionSite() || providerId === "google") {
    const { data, error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL,
    });
    if (error) throw new Error(error.message ?? "Google sign-in failed");
    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    // Some better-auth versions redirect themselves
    return;
  }

  // ── Live preview only: Grok broker ──
  if (!GROK_PROVIDERS.some((p) => p.providerId === providerId)) {
    throw new Error("Unsupported sign-in provider");
  }

  const popup = inLivePreview() ? openSignInPopup(providerId) : null;

  const hadBearer = Boolean(getBearerToken());
  if (hadBearer || !inLivePreview()) {
    try {
      await authClient.signOut();
    } catch {
      /* proceed */
    }
  }
  setBearerToken(null);

  if (inLivePreview()) {
    if (!popup) throw new Error("Pop-up blocked — allow pop-ups for Google sign-in");
    const token = await waitForPopupToken(popup);
    if (!token) throw new Error("Sign-in was cancelled or failed");
    setBearerToken(token);
    try {
      await authClient.getSession();
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      window.location.href = callbackURL;
    }
    return;
  }

  // Fallback: try native google even outside preview if broker id was passed
  const { data, error } = await authClient.signIn.social({
    provider: "google",
    callbackURL,
    errorCallbackURL,
  });
  if (error) {
    // Last resort: oauth2 broker id (dev only)
    const o = await authClient.signIn.oauth2({
      providerId,
      callbackURL,
      errorCallbackURL,
    });
    if (o.error) throw new Error(o.error.message ?? "Sign-in failed");
    if (o.data?.url) window.location.href = o.data.url;
    return;
  }
  if (data?.url) window.location.href = data.url;
}

export async function signInWithEmail(opts: {
  email: string;
  password: string;
}): Promise<void> {
  const res = await authClient.signIn.email({
    email: opts.email.trim(),
    password: opts.password,
  });
  if (res.error) {
    throw new Error(res.error.message || "Sign in failed");
  }
  const token =
    (res.data as { token?: string } | null | undefined)?.token ?? null;
  if (token) persistSessionToken(token);
  try {
    await authClient.getSession();
  } catch {
    /* ignore */
  }
}

export async function signUpWithEmail(opts: {
  email: string;
  password: string;
  name: string;
}): Promise<void> {
  const res = await authClient.signUp.email({
    email: opts.email.trim(),
    password: opts.password,
    name: opts.name.trim() || opts.email.split("@")[0] || "Student",
  });
  if (res.error) {
    throw new Error(res.error.message || "Sign up failed");
  }
  const token =
    (res.data as { token?: string } | null | undefined)?.token ?? null;
  if (token) persistSessionToken(token);
  // Auto sign-in after sign-up if session not set
  try {
    await authClient.getSession();
  } catch {
    await signInWithEmail({ email: opts.email, password: opts.password });
  }
}

export async function signOut(): Promise<void> {
  setBearerToken(null);
  await authClient.signOut();
}

// ── Preview popup helpers (sandbox only) ───────────────────────────────────

function openSignInPopup(providerId: string): Window | null {
  const w = 480;
  const h = 700;
  const left = Math.max(0, (window.screen.width - w) / 2);
  const top = Math.max(0, (window.screen.height - h) / 2);
  return window.open(
    `/auth/popup?providerId=${encodeURIComponent(providerId)}`,
    "examhub-google-signin",
    `width=${w},height=${h},left=${left},top=${top},popup=yes`,
  );
}

function waitForPopupToken(popup: Window): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (token: string | null) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      clearInterval(timer);
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      resolve(token);
    };
    const onMsg = (ev: MessageEvent) => {
      const data = ev.data as PopupMessage | null;
      if (!data || data.source !== "grok-auth-popup") return;
      if (data.error) {
        finish(null);
        return;
      }
      finish(data.token);
    };
    window.addEventListener("message", onMsg);
    const timer = window.setInterval(() => {
      if (popup.closed) finish(null);
    }, 400);
    window.setTimeout(() => finish(null), 5 * 60 * 1000);
  });
}
