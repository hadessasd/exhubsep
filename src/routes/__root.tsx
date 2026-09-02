import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { CreatedWithGrokBanner } from "@/components/created-with-grok-banner";
import appCss from "../styles.css?url";

const APP_NAME = "ExamHub";
const APP_DESC =
  "ExamHub — SAT & ACT pathways, Universal Proctor Bypass, LockDown Browser, Honorlock, Proctorio and all major proctoring tools. Research papers & internships. Crypto & gift card checkout.";

const host = import.meta.env.VITE_PUBLIC_HOSTNAME;
const ogImage = host
  ? `https://og.grok.me/v1/card.png?host=${encodeURIComponent(host)}&title=${encodeURIComponent(APP_NAME)}`
  : undefined;

export const Route = createRootRoute({
  // Do NOT call checkIsAdmin here — it races the session (especially with
  // bearer auth) and flips Admin UI on every navigation. Header resolves it
  // client-side once the session is ready.
  beforeLoad: async () => ({ isAdmin: false as boolean }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: `${APP_NAME} | SAT ACT Proctoring Exam Prep Marketplace` },
      { name: "description", content: APP_DESC },
      {
        name: "keywords",
        content:
          "ExamHub, SAT prep, ACT prep, LockDown Browser, Honorlock, Proctorio, Universal Proctor Bypass, ProctorU, online proctoring, exam support, research paper, internship, crypto gift card",
      },
      { name: "author", content: "ExamHub" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "theme-color", content: "#c45c26" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: APP_NAME },
      {
        property: "og:title",
        content: `${APP_NAME} | SAT ACT Proctoring Exam Prep`,
      },
      { property: "og:description", content: APP_DESC },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: `${APP_NAME} | Exam Prep Marketplace`,
      },
      { name: "twitter:description", content: APP_DESC },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
            { name: "twitter:image", content: ogImage },
          ]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "ExamHub",
          description: APP_DESC,
          url: host ? `https://${host}` : "https://examhub.app",
          sameAs: [],
        }),
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
        <HeadContent />
      </head>
      <body className="overflow-x-hidden">
        <CreatedWithGrokBanner />
        <AuthProvider>
          <Outlet />
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{ className: "font-sans" }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
