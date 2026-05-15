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

  const classifyIndustry = useCallback(async (companyId: string, name: string, category: string, content: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("classify-industry", {
        body: { name, category, content },
      });
      if (error || !data?.success) return null;
      const industry = data.industry as string;
      await supabase.from("companies").update({ industry_tag: industry }).eq("id", companyId);
      return industry;
    } catch (err) {
      console.error("Classify error:", err);
      return null;
    }
  }, []);

  const scrapeCompanyUrl = useCallback(async (companyId: string, url: string, meta?: { name?: string; category?: string }) => {
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
        const industry = await classifyIndustry(companyId, meta?.name || "", meta?.category || "", content);
        return { success: true, skipped: false, industry };
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
  }, [classifyIndustry]);

  const scrapeAllCompanies = useCallback(async (companies: { id: string; url: string; name?: string; category?: string }[]) => {
    const alreadyScrapedIds = new Set(scrapedContent.map((s) => s.companyId));
    const toScrape = companies.filter((c) => c.url && !alreadyScrapedIds.has(c.id));
    if (toScrape.length === 0) return { success: 0, failed: 0, skipped: companies.length - toScrape.length };

    setScraping(true);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < toScrape.length; i++) {
      const c = toScrape[i];
      setScrapeProgress(`Skanner ${i + 1} av ${toScrape.length}...`);
      const result = await scrapeCompanyUrl(c.id, c.url, { name: c.name, category: c.category });
      if (result.success) success++;
      else failed++;
      if (i < toScrape.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setScrapeProgress("");
    setScraping(false);
    return { success, failed };
  }, [scrapeCompanyUrl, scrapedContent]);

  const searchContent = useCallback(
    (query: string): string[] => {
      if (!query.trim()) return [];
      const q = query.trim().toLowerCase();
      const regex = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const matchingCompanyIds = new Set<string>();
      for (const item of scrapedContent) {
        if (regex.test(item.content)) {
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
    classifyIndustry,
  };
}
