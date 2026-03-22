// Hook for scraping company websites and searching content
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScrapedContent {
  id: string;
  companyId: string;
  url: string;
  content: string;
}

export function useScraping() {
  const [scrapedContent, setScrapedContent] = useState<ScrapedContent[]>([]);
  const [scraping, setScraping] = useState(false);

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
    if (!url) return;

    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-scrape", {
        body: { url },
      });

      if (error || !data?.success) {
        console.error("Scrape failed:", error || data?.error);
        return;
      }

      const content = data.content || "";
      if (!content) return;

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
      }
    } catch (err) {
      console.error("Scrape error:", err);
    } finally {
      setScraping(false);
    }
  }, []);

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
    loadScrapedContent,
    scrapeCompanyUrl,
    searchContent,
  };
}
