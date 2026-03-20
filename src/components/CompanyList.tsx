import { Company } from "@/types/company";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2, MapPin, Pencil, Plus } from "lucide-react";

interface CompanyListProps {
  companies: Company[];
  filter: string;
  onSelect: (company: Company) => void;
  onRemove: (id: string) => void;
  onEdit: (company: Company) => void;
}

export default function CompanyList({ companies, filter, onSelect, onRemove, onEdit }: CompanyListProps) {
  const filtered = companies.filter(c => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.postalCode.includes(q) || c.address.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(210,20%,55%)]">
        {filtered.length} bedrifter
      </p>
      <div className="space-y-1">
        {filtered.map(c => (
          <div
            key={c.id}
            className="group flex items-start justify-between rounded-md p-2 hover:bg-[hsl(220,38%,17%)] cursor-pointer transition-colors"
            onClick={() => onSelect(c)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm truncate text-white">{c.name}</span>
                {c.url && (
                  <a href={c.url.startsWith("http") ? c.url : `https://${c.url}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                    <ExternalLink className="h-3 w-3 text-[hsl(210,20%,55%)] hover:text-[hsl(210,60%,65%)]" />
                  </a>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onEdit(c); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-3 w-3 text-[hsl(210,20%,55%)] hover:text-[hsl(210,60%,65%)]" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-xs text-[hsl(210,20%,65%)]">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{c.address}{c.address && ", "}{c.postalCode}{c.city && ` ${c.city}`}</span>
              </div>
              {c.category && <Badge variant="secondary" className="mt-1 text-[10px] h-5 bg-[hsl(220,38%,20%)] text-[hsl(210,30%,80%)] border-[hsl(220,35%,25%)]">{c.category}</Badge>}
            </div>
            <button
              onClick={e => { e.stopPropagation(); onRemove(c.id); }}
              className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
