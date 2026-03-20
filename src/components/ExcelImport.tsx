import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelRow {
  name: string;
  address: string;
  postalCode: string;
  category: string;
  url: string;
}

interface ExcelImportProps {
  onImport: (rows: ExcelRow[]) => Promise<void>;
  loading: boolean;
}

function normalize(val: unknown): string {
  if (val == null) return "";
  return String(val).trim();
}

function findCol(row: Record<string, unknown>, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const lower = c.toLowerCase().trim();
    const found = keys.find(k => k.toLowerCase().trim() === lower);
    if (found && row[found] != null && String(row[found]).trim() !== "") return normalize(row[found]);
  }
  return "";
}

export default function ExcelImport({ onImport, loading }: ExcelImportProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ExcelRow[] | null>(null);
  const [detectedCols, setDetectedCols] = useState<string[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      if (json.length > 0) {
        setDetectedCols(Object.keys(json[0]));
      }
      const rows: ExcelRow[] = json.map(row => ({
        name: findCol(row, "Bedriftsnavn", "Virksomhedsnavn", "Företagsnamn", "Company Name", "Company", "Navn", "Name", "Firma"),
        address: findCol(row, "Adresse", "Adress", "Address", "Street", "Gatuadress", "Besøksadresse", "Vej"),
        postalCode: findCol(row, "Postnummer", "Postal code", "Postkod", "Zip", "Zip code", "Postcode", "Post nr"),
        category: findCol(row, "Bransje", "Branche", "Bransch", "Category", "Industry", "Kategori", "Typ", "Bedriftstype"),
        url: findCol(row, "URL", "Nettside", "Hjemmeside", "Webbplats", "Website", "Hemsida", "Webb", "Web"),
      })).filter(r => r.name);
      setPreview(rows);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!preview) return;
    await onImport(preview);
    setPreview(null);
    setDetectedCols([]);
  };

  const hasAddress = preview?.some(r => r.address) ?? false;
  const hasPostalCode = preview?.some(r => r.postalCode) ?? false;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <FileSpreadsheet className="h-4 w-4" />
        Importer fra Excel
      </div>
      <p className="text-xs text-muted-foreground">
        Kolonner: Bedriftsnavn, Adresse, Postnummer, Bransje, URL
      </p>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" className="w-full" onClick={() => ref.current?.click()} disabled={loading}>
        <Upload className="h-4 w-4 mr-2" /> Velg fil
      </Button>
      {preview && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{preview.length} bedrifter funnet</p>
          {detectedCols.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Kolonner i filen: {detectedCols.join(", ")}
            </p>
          )}
          {!hasAddress && !hasPostalCode && (
            <p className="text-xs text-destructive font-medium">
              ⚠ Verken adresse eller postnummer funnet. Geokoding vil sannsynligvis feile.
            </p>
          )}
          {!hasAddress && hasPostalCode && (
            <p className="text-xs text-yellow-600 font-medium">
              ⚠ Ingen adresse funnet — geokoder kun med postnummer.
            </p>
          )}
          <div className="max-h-32 overflow-y-auto text-xs space-y-1 rounded border border-border p-2">
            {preview.slice(0, 10).map((r, i) => (
              <div key={i} className="text-muted-foreground">
                {r.name} {r.postalCode && `— ${r.postalCode}`} {r.address && `— ${r.address}`}
              </div>
            ))}
            {preview.length > 10 && <div className="text-muted-foreground">...og {preview.length - 10} til</div>}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={loading} className="flex-1">
              {loading ? "Importerer..." : `Importer ${preview.length} stk`}
            </Button>
            <Button variant="outline" onClick={() => { setPreview(null); setDetectedCols([]); }}>Avbryt</Button>
          </div>
        </div>
      )}
    </div>
  );
}
