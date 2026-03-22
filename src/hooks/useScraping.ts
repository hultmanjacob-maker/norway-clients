// Hook for scraping company websites and searching content
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ScrapedContent {
  id: string;
  companyId: string;
  url: string;
  content: string;
}

export function useScraping() {
  const [scrapedContent, setScrapedContent] = useState<ScrapedContent[]>([]);
  const [scraping, setScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState("");

  const loadScrapedContent = useCallback(async () => {
    const { data, error } = await supabase
      .from("scraped_content")
      .select("*");
    if (!error && data) {
      setScrapedContent(
        data.map((row) => ({
          id: row.id,
          companyId: row.company_id,
          url: row.url,
          content: row.content,
        }))
      );
    }
  }, []);

  const scrapeCompanyUrl = useCallback(async (companyId: string, url: string) => {
    if (!url) return { success: false, skipped: true, reason: "missing_url" };

    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-scrape", {
        body: { url },
      });

      if (error) {
        console.error("Scrape failed:", error);
        return { success: false, skipped: false, reason: error.message };
      }

      if (!data?.success) {
        return {
          success: false,
          skipped: Boolean(data?.skipped),
          reason: data?.error || "unknown_error",
        };
      }

      const content = data.content || "";
      if (!content) {
        return { success: false, skipped: true, reason: "empty_content" };
      }

      const { data: inserted, error: insertError } = await supabase
        .from("scraped_content")
        .upsert(
          {
            company_id: companyId,
            url,
            content,
          },
          { onConflict: "company_id,url" }
        )
        .select()
        .single();

      if (!insertError && inserted) {
        setScrapedContent((prev) => {
          const filtered = prev.filter(
            (s) => !(s.companyId === companyId && s.url === url)
          );
          return [
            ...filtered,
            {
              id: inserted.id,
              companyId: inserted.company_id,
              url: inserted.url,
              content: inserted.content,
            },
          ];
        });
        return { success: true, skipped: false };
      }

      return { success: false, skipped: false, reason: insertError?.message || "save_failed" };
    } catch (err) {
      console.error("Scrape error:", err);
      return {
        success: false,
        skipped: false,
        reason: err instanceof Error ? err.message : "unknown_error",
      };
    }
  }, []);

  const scrapeAllCompanies = useCallback(async (companies: { id: string; url: string }[]) => {
    const toScrape = companies.filter((c) => c.url);
    if (toScrape.length === 0) return;

    setScraping(true);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < toScrape.length; i++) {
      const c = toScrape[i];
      setScrapeProgress(`Skanner ${i + 1} av ${toScrape.length}...`);
      const ok = await scrapeCompanyUrl(c.id, c.url);
      if (ok) success++;
      else failed++;
      // Small delay to avoid rate limiting
      if (i < toScrape.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setScrapeProgress("");
    setScraping(false);
    return { success, failed };
  }, [scrapeCompanyUrl]);

  const searchContent = useCallback(
    (query: string): string[] => {
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      const matchingCompanyIds = new Set<string>();
      for (const item of scrapedContent) {
        if (item.content.toLowerCase().includes(q)) {
          matchingCompanyIds.add(item.companyId);
        }
      }
      return Array.from(matchingCompanyIds);
    },
    [scrapedContent]
  );

  return {
    scrapedContent,
    scraping,
    scrapeProgress,
    loadScrapedContent,
    scrapeCompanyUrl,
    scrapeAllCompanies,
    searchContent,
  };
}
