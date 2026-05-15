import { useState, useCallback, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Company, CompanyLocation } from "@/types/company";
import { geocodeAddress } from "@/hooks/useGeocode";
import { useCategories } from "@/hooks/useCategories";
import { useScraping } from "@/hooks/useScraping";
import CompanyForm from "@/components/CompanyForm";
import CompanyEditDialog from "@/components/CompanyEditDialog";
import ExcelImport from "@/components/ExcelImport";
import CompanyList from "@/components/CompanyList";
import AddLocationDialog from "@/components/AddLocationDialog";
import MapView from "@/components/MapView";
import { Search, MapPin, Globe, ScanSearch, Tag } from "lucide-react";
import { INDUSTRIES } from "@/lib/industries";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export default function Index() {
  const { categories, addCategory } = useCategories();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [selected, setSelected] = useState<Company | null>(null);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<string>("");
  const [locations, setLocations] = useState<CompanyLocation[]>([]);
  const [addLocationCompany, setAddLocationCompany] = useState<Company | null>(null);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [contentSearch, setContentSearch] = useState("");
  const [nearSearch, setNearSearch] = useState("");
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const { scrapedContent, scraping, scrapeProgress, loadScrapedContent, scrapeCompanyUrl, scrapeAllCompanies, searchContent } = useScraping();

  // Load companies from database on mount
  useEffect(() => {
    const loadCompanies = async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading companies:", error);
        return;
      }

      if (data) {
        setCompanies(
          data.map((row) => ({
            id: row.id,
            name: row.name,
            address: row.address,
            postalCode: row.postal_code,
            city: row.city,
            category: row.category,
            url: row.url,
            lat: row.lat,
            lng: row.lng,
            industryTag: (row as any).industry_tag || "",
          }))
        );
      }
    };

    loadCompanies();

    const loadLocations = async () => {
      const { data, error } = await supabase
        .from("company_locations")
        .select("*");
      if (!error && data) {
        setLocations(
          data.map((row) => ({
            id: row.id,
            companyId: row.company_id,
            address: row.address,
            postalCode: row.postal_code,
            city: row.city,
            lat: row.lat,
            lng: row.lng,
          }))
        );
      }
    };
    loadLocations();
    loadScrapedContent();
  }, [loadScrapedContent]);

  const availableIndustries = useMemo(() => {
    const set = new Set(companies.map(c => c.industryTag).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [companies]);

  const contentMatchIds = useMemo(() => {
    return contentSearch ? searchContent(contentSearch) : [];
  }, [contentSearch, searchContent]);

  // Geocode "Hitta nära" search to drop a red pin on map (does not filter list)
  useEffect(() => {
    const q = nearSearch.trim();
    if (!q || q.length < 2) {
      setSearchPin(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await geocodeAddress(q, "");
      if (cancelled) return;
      if (result) {
        setSearchPin({ lat: result.lat, lng: result.lng, label: q });
      } else {
        setSearchPin(null);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nearSearch]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (industryFilter !== "all" && c.industryTag !== industryFilter) return false;
      if (contentSearch && !contentMatchIds.includes(c.id)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.postalCode.includes(q) || c.address.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || (c.url && c.url.toLowerCase().includes(q)) || (c.industryTag || "").toLowerCase().includes(q);
    });
  }, [companies, industryFilter, search, contentSearch, contentMatchIds]);

  const addCompany = useCallback(async (data: { name: string; address: string; postalCode: string; category: string; url: string }) => {
    setLoading(true);
    const coords = await geocodeAddress(data.address, data.postalCode);
    if (!coords) {
      toast.error(`Kunne ikke finne koordinater for "${data.name}". Sjekk adresse/postnummer.`);
      setLoading(false);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("companies")
      .insert({
        name: data.name,
        address: data.address,
        postal_code: data.postalCode,
        city: coords.city,
        category: data.category,
        url: data.url,
        lat: coords.lat,
        lng: coords.lng,
      })
      .select()
      .single();

    if (error) {
      toast.error("Kunne ikke lagre bedriften.");
      console.error(error);
      setLoading(false);
      return;
    }

    const company: Company = {
      id: inserted.id,
      name: inserted.name,
      address: inserted.address,
      postalCode: inserted.postal_code,
      city: inserted.city,
      category: inserted.category,
      url: inserted.url,
      lat: inserted.lat,
      lng: inserted.lng,
    };
    setCompanies(prev => [company, ...prev]);
    setSelected(company);
    toast.success(`${data.name} lagt til!`);
    setLoading(false);

    if (data.url) {
      scrapeCompanyUrl(company.id, data.url, { name: data.name, category: data.category }).then((result) => {
        if (result.success) {
          toast.success(`Nettside for ${data.name} er skannet!`);
          if (result.industry) {
            setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, industryTag: result.industry as string } : c));
          }
        }
      });
    }
  }, [scrapeCompanyUrl]);

  const importCompanies = useCallback(async (rows: { name: string; address: string; postalCode: string; category: string; url: string }[]) => {
    setLoading(true);
    let added = 0;
    let failed = 0;
    let consecutiveFailures = 0;
    const pendingCompanies: { name: string; address: string; postal_code: string; city: string; category: string; url: string; lat: number; lng: number }[] = [];

    try {
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        setImportProgress(`${i + 1} av ${rows.length}...`);

        const coords = await geocodeAddress(row.address, row.postalCode);
        if (coords) {
          pendingCompanies.push({
            name: row.name,
            address: row.address,
            postal_code: row.postalCode,
            city: coords.city,
            category: row.category,
            url: row.url,
            lat: coords.lat,
            lng: coords.lng,
          });
          added += 1;
          consecutiveFailures = 0;
        } else {
          failed += 1;
          consecutiveFailures += 1;
        }

        if (pendingCompanies.length >= 5 || (i === rows.length - 1 && pendingCompanies.length > 0)) {
          const batch = [...pendingCompanies];
          pendingCompanies.length = 0;

          const { data: inserted, error } = await supabase
            .from("companies")
            .insert(batch)
            .select();

          if (!error && inserted) {
            const mapped = inserted.map((row) => ({
              id: row.id,
              name: row.name,
              address: row.address,
              postalCode: row.postal_code,
              city: row.city,
              category: row.category,
              url: row.url,
              lat: row.lat,
              lng: row.lng,
            }));
            setCompanies(prev => [...prev, ...mapped]);
          }
        }

        if (consecutiveFailures > 0 && consecutiveFailures % 8 === 0 && i < rows.length - 1) {
          setImportProgress(`Pauser kort pga. geokodingsgrense (${i + 1} av ${rows.length})...`);
          await new Promise(r => setTimeout(r, 8000));
        }
      }

      toast.success(`${added} av ${rows.length} bedrifter importert!`);
      if (failed > 0) {
        toast.warning(`${failed} bedrifter kunne ikke geokodes.`);
      }
    } finally {
      setImportProgress("");
      setLoading(false);
    }
  }, []);

  const removeCompany = useCallback(async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) {
      toast.error("Kunne ikke slette bedriften.");
      return;
    }
    setCompanies(prev => prev.filter(c => c.id !== id));
    if (selected?.id === id) setSelected(null);
  }, [selected]);

  const updateCompany = useCallback(async (company: Company, updates: { name: string; address: string; postalCode: string; category: string; url: string }) => {
    setLoading(true);
    let lat = company.lat;
    let lng = company.lng;
    let city = company.city;

    if (updates.address !== company.address || updates.postalCode !== company.postalCode) {
      const coords = await geocodeAddress(updates.address, updates.postalCode);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        city = coords.city;
      }
    }

    const { error } = await supabase
      .from("companies")
      .update({
        name: updates.name,
        address: updates.address,
        postal_code: updates.postalCode,
        category: updates.category,
        url: updates.url,
        lat,
        lng,
        city,
      })
      .eq("id", company.id);

    if (error) {
      toast.error("Kunne ikke oppdatere bedriften.");
      setLoading(false);
      return;
    }

    setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, ...updates, lat, lng, city } : c));
    if (selected?.id === company.id) {
      setSelected(prev => prev ? { ...prev, ...updates, lat, lng, city } : null);
    }
    toast.success("Bedriften oppdatert!");
    setLoading(false);
  }, [selected]);

  const handleEdit = useCallback((company: Company) => {
    setEditCompany(company);
    setEditOpen(true);
  }, []);

  const handleAddLocation = useCallback((company: Company) => {
    setAddLocationCompany(company);
    setAddLocationOpen(true);
  }, []);

  const saveLocation = useCallback(async (companyId: string, data: { address: string; postalCode: string; city: string }) => {
    setLoading(true);
    const coords = await geocodeAddress(data.address, data.postalCode);
    if (!coords) {
      toast.error("Kunne ikke finne koordinater for adressen.");
      setLoading(false);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("company_locations")
      .insert({
        company_id: companyId,
        address: data.address,
        postal_code: data.postalCode,
        city: data.city || coords.city,
        lat: coords.lat,
        lng: coords.lng,
      })
      .select()
      .single();

    if (error) {
      toast.error("Kunne ikke lagre lokasjonen.");
      setLoading(false);
      return;
    }

    setLocations(prev => [...prev, {
      id: inserted.id,
      companyId: inserted.company_id,
      address: inserted.address,
      postalCode: inserted.postal_code,
      city: inserted.city,
      lat: inserted.lat,
      lng: inserted.lng,
    }]);
    toast.success("Lokasjon lagt til!");
    setLoading(false);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="w-80 shrink-0 border-r border-[hsl(220,40%,18%)] bg-[hsl(220,40%,13%)] flex flex-col overflow-hidden text-[hsl(210,30%,90%)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(220,40%,18%)]">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Client Map Norway" className="h-8 w-8 rounded" />
            <h1 className="font-bold text-white text-sm tracking-wide">Client Map Norway</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[hsl(210,20%,55%)] hover:text-white"
            disabled={scraping || companies.length === 0}
            title={scraping ? scrapeProgress || "Skanner..." : `Skann alle nettsider (${scrapedContent.length}/${companies.length})`}
            onClick={async () => {
              const result = await scrapeAllCompanies(companies.map(c => ({ id: c.id, url: c.url, name: c.name, category: c.category })));
              if (result) {
                toast.success(`${result.success} nettsider skannet!`);
                if (result.failed > 0) toast.warning(`${result.failed} kunne ikke skannes.`);
                // Reload companies to pick up industry_tag updates
                const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
                if (data) {
                  setCompanies(data.map((row) => ({
                    id: row.id, name: row.name, address: row.address, postalCode: row.postal_code,
                    city: row.city, category: row.category, url: row.url, lat: row.lat, lng: row.lng,
                    industryTag: (row as any).industry_tag || "",
                  })));
                }
              }
            }}
          >
            <ScanSearch className={`h-4 w-4 ${scraping ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="px-3 py-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(210,20%,55%)]" />
            <Input
              placeholder="Søk by, postnummer, bedrift..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-[hsl(220,38%,17%)] border-[hsl(220,35%,22%)] text-[hsl(210,30%,90%)] placeholder:text-[hsl(210,20%,45%)] focus-visible:ring-[hsl(210,60%,45%)]"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(0,70%,55%)]" />
            <Input
              placeholder="Hitta nära (sett rød pin)"
              value={nearSearch}
              onChange={e => setNearSearch(e.target.value)}
              className="pl-9 bg-[hsl(220,38%,17%)] border-[hsl(220,35%,22%)] text-[hsl(210,30%,90%)] placeholder:text-[hsl(210,20%,45%)] focus-visible:ring-[hsl(0,60%,45%)]"
            />
          </div>
          <div className="relative">
            <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(210,20%,55%)] pointer-events-none z-10" />
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="pl-9 bg-[hsl(220,38%,17%)] border-[hsl(220,35%,22%)] text-[hsl(210,30%,90%)]">
                <SelectValue placeholder="Filtrer på bransje" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle bransjer</SelectItem>
                {INDUSTRIES.map(ind => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
                {availableIndustries.filter(i => !INDUSTRIES.includes(i as any)).map(ind => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(210,20%,55%)]" />
            <Input
              placeholder="Find reference"
              value={contentSearch}
              onChange={e => setContentSearch(e.target.value)}
              className="pl-9 bg-[hsl(220,38%,17%)] border-[hsl(220,35%,22%)] text-[hsl(210,30%,90%)] placeholder:text-[hsl(210,20%,45%)] focus-visible:ring-[hsl(210,60%,45%)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          <CompanyForm onAdd={addCompany} loading={loading} categories={categories} onAddCategory={addCategory} />
          <Separator className="bg-[hsl(220,35%,22%)]" />
          <ExcelImport onImport={importCompanies} loading={loading} />
          {importProgress && (
            <p className="text-xs text-[hsl(210,20%,55%)] animate-pulse px-1">
              Geokoder {importProgress}
            </p>
          )}
          <Separator className="bg-[hsl(220,35%,22%)]" />
          <CompanyList companies={filteredCompanies} locations={locations} filter="" onSelect={setSelected} onRemove={removeCompany} onEdit={handleEdit} onAddLocation={handleAddLocation} />
        </div>
      </div>

      <div className="flex-1 relative">
        <MapView companies={filteredCompanies} locations={locations} selectedCompany={selected} searchPin={searchPin} />
      </div>

      <CompanyEditDialog
        company={editCompany}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={updateCompany}
        loading={loading}
        categories={categories}
        onAddCategory={addCategory}
      />

      <AddLocationDialog
        company={addLocationCompany}
        open={addLocationOpen}
        onOpenChange={setAddLocationOpen}
        onSave={saveLocation}
        loading={loading}
      />
    </div>
  );
}
