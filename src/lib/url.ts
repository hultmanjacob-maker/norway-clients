// Normalize a URL to www.x.no format: strip protocol and trailing slash, add www. if missing
export function normalizeUrl(url: string): string {
  let u = url.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (u && !/^www\./i.test(u)) u = `www.${u}`;
  return u;
}

export function normalizeUrls(urls: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    if (!raw || !raw.trim()) continue;
    const u = normalizeUrl(raw);
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}
