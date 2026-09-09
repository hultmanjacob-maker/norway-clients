import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Globe, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { useSimilarCompanies } from "@/hooks/useSimilarCompanies";
import { Company } from "@/types/company";
import { normalizeUrls } from "@/lib/url";

interface Props {
  companies: Company[];
  onSelect: (company: Company) => void;
}

function scoreStyle(score: number) {
  if (score > 75) return "bg-[hsl(150,55%,22%)] text-[hsl(150,70%,75%)] border-[hsl(150,50%,30%)]";
  if (score >= 50) return "bg-[hsl(45,55%,22%)] text-[hsl(45,80%,75%)] border-[hsl(45,50%,32%)]";
  return "bg-[hsl(220,20%,25%)] text-[hsl(210,20%,75%)] border-[hsl(220,20%,32%)]";
}

export default function SimilarCompanies({ companies, onSelect }: Props) {
  const [url, setUrl] = useState("");
  const { loading, matches, source, error, stage, findSimilar, reset } = useSimilarCompanies();

  useEffect(() => {
    if (!url.trim()) {
      reset();
    }
  }, [url, reset]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    findSimilar(url.trim());
  };

  const strong = matches || [];

  const copyUrls = async () => {
    const urls = normalizeUrls(strong.map(m => m.url));
    if (urls.length === 0) {
      toast.error("Inga URL:er att kopiera");
      return;
    }
    try {
      await navigator.clipboard.writeText(urls.join("\n"));
      toast.success(`${urls.length} URL:er kopierade`);
    } catch {
      toast.error("Kunde inte kopiera");
    }
  };

  const hasUrls = strong.some(m => m.url && m.url.trim());

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(210,20%,55%)] flex items-center gap-1.5">
        <Target className="h-3 w-3" />
        Hitta liknande bolag
      </p>
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(210,20%,55%)] pointer-events-none" />
          <Input
            placeholder="Enter URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="pl-9 bg-[hsl(220,38%,17%)] border-[hsl(220,35%,22%)] text-[hsl(210,30%,90%)] placeholder:text-[hsl(210,20%,45%)]"
          />
        </div>
        <Button type="submit" disabled={loading || !url.trim()} size="sm" className="shrink-0">
          <Search className="h-3.5 w-3.5 mr-1" />
          Søk
        </Button>
      </form>

      {loading && (
        <div className="space-y-2">
          <p className="text-xs text-[hsl(210,20%,55%)] animate-pulse">{stage || "Analyserer bolaget..."}</p>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-16 w-full bg-[hsl(220,38%,17%)]" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {!loading && matches && (
        <>
          {source?.niche && (
            <p className="text-xs text-[hsl(210,20%,55%)]">
              Nisje funnet: <span className="text-[hsl(210,30%,85%)]">{source.niche}</span>
            </p>
          )}
          {strong.length === 0 ? (
            <p className="text-xs text-[hsl(210,20%,55%)]">Fant ingen tilstrekkelig like bedrifter.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {strong.map(m => {
                const company = companies.find(c => c.id === m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => company && onSelect(company)}
                    className="w-full text-left rounded-md border border-[hsl(220,35%,22%)] bg-[hsl(220,38%,15%)] p-2 hover:bg-[hsl(220,38%,19%)] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white truncate">{m.name}</span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${scoreStyle(m.score)}`}>
                        {m.score}%
                      </span>
                    </div>
                    {m.reasons.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.reasons.map((r, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-[10px] h-5 bg-[hsl(220,38%,20%)] text-[hsl(210,30%,80%)] border-[hsl(220,35%,25%)]"
                          >
                            {r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
