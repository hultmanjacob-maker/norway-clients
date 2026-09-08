import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SimilarMatch {
  id: string;
  name: string;
  url: string | null;
  score: number;
  reasons: string[];
}

export interface SimilarSource {
  industry?: string;
  niche?: string;
  products?: string[];
}

export function useSimilarCompanies() {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<SimilarMatch[] | null>(null);
  const [source, setSource] = useState<SimilarSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const findSimilar = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    setMatches(null);
    setSource(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("find-similar-companies", {
        body: { url },
      });
      if (fnError) {
        setError(fnError.message);
        return;
      }
      if (!data?.success) {
        setError(data?.error || "Noe gikk galt");
        return;
      }
      setSource(data.source || null);
      setMatches((data.matches || []) as SimilarMatch[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setMatches(null);
    setSource(null);
    setError(null);
  }, []);

  return { loading, matches, source, error, findSimilar, reset };
}
