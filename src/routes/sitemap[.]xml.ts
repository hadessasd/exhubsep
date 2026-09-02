import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTS } from "@/lib/data/catalog";
import { getSql } from "@/lib/db";

function escapeXml(s: string): string {
  const amp = String.fromCharCode(38);
  return s
    .split(amp).join(amp + "amp;")
    .split("<").join(amp + "lt;")
    .split(">").join(amp + "gt;")
    .split(String.fromCharCode(34)).join(amp + "quot;")
    .split(String.fromCharCode(39)).join(amp + "apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const staticPaths = [
          "/",
          "/demo",
          "/category/sat",
          "/category/act",
          "/category/proctoring",
          "/category/contests",
          "/category/tools",
          "/category/bundle",
          "/research",
          "/internships",
          "/blog",
          "/login",
        ];

        let blogSlugs: string[] = [];
        try {
          const sql = await getSql();
          const rows = await sql<{ slug: string }>`
            SELECT slug FROM blog_posts WHERE status = 'published'
          `;
          blogSlugs = rows.map((r) => r.slug);
        } catch {
          blogSlugs = [];
        }

        const urls: { loc: string; priority: string; changefreq: string }[] = [
          ...staticPaths.map((p) => ({
            loc: origin + p,
            priority: p === "/" ? "1.0" : p === "/demo" ? "0.85" : "0.8",
            changefreq: p === "/" ? "daily" : "weekly",
          })),
          ...PRODUCTS.map((p) => ({
            loc: origin + "/products/" + p.slug,
            priority: "0.9",
            changefreq: "weekly",
          })),
          ...blogSlugs.map((slug) => ({
            loc: origin + "/blog/" + slug,
            priority: "0.7",
            changefreq: "monthly",
          })),
        ];

        const lines = urls.map((u) => {
          return [
            "  <url>",
            "    <loc>" + escapeXml(u.loc) + "</loc>",
            "    <changefreq>" + u.changefreq + "</changefreq>",
            "    <priority>" + u.priority + "</priority>",
            "  </url>",
          ].join("\n");
        });

        const body = [
          "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...lines,
          "</urlset>",
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
