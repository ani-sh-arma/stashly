import { action } from "./_generated/server";
import { v } from "convex/values";

function extractMetaContent(
  html: string,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*\\/?>`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*\\/?>`,
        "i",
      ),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1].trim();
    }
  }
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim();
}

function extractFavicon(html: string, baseUrl: string): string {
  const patterns = [
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*\/?>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["'][^>]*\/?>/i,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m?.[1]) {
      const href = m[1];
      if (href.startsWith("http")) return href;
      try {
        const u = new URL(baseUrl);
        if (href.startsWith("//")) return `${u.protocol}${href}`;
        return `${u.origin}${href.startsWith("/") ? "" : "/"}${href}`;
      } catch {
        return href;
      }
    }
  }
  try {
    return `${new URL(baseUrl).origin}/favicon.ico`;
  } catch {
    return "";
  }
}

export const fetchUrlMetadata = action({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    const { url } = args;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { error: "Invalid URL: must start with http:// or https://" };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; Stashly/1.0; +https://stashly.app)",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          redirect: "follow",
          signal: controller.signal,
        });

        if (!response.ok) {
          return { error: `HTTP ${response.status}` };
        }

        const contentType = response.headers.get("content-type") ?? "";
        let hostname = "";
        try {
          hostname = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          /* ignore */
        }

        if (!contentType.includes("html")) {
          return {
            hostname,
            favicon: `https://${hostname}/favicon.ico`,
          };
        }

        const html = await response.text();
        // Limit to first 100 KB to avoid memory issues on very large pages
        const htmlSlice =
          html.length > 102400 ? html.substring(0, 102400) : html;

        const title =
          extractMetaContent(htmlSlice, "og:title", "twitter:title") ??
          extractTitle(htmlSlice) ??
          hostname;

        const description =
          extractMetaContent(
            htmlSlice,
            "og:description",
            "twitter:description",
            "description",
          ) ?? undefined;

        const image =
          extractMetaContent(htmlSlice, "og:image", "twitter:image") ?? undefined;

        const siteName =
          extractMetaContent(htmlSlice, "og:site_name") ?? hostname;

        const favicon = extractFavicon(htmlSlice, url);

        return { title, description, image, siteName, hostname, favicon };
      } finally {
        clearTimeout(timeout);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        return { error: "Request timed out" };
      }
      return { error: `Failed to fetch: ${String(e)}` };
    }
  },
});
