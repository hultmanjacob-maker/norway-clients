import { useState, useCallback, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Company, CompanyLocation } from "@/types/company";
import { geocodeAddress } from "@/hooks/useGeocode";
import { useCategories } from "@/hooks/useCategories";
import CompanyForm from "@/components/CompanyForm";
import CompanyEditDialog from "@/components/CompanyEditDialog";
import ExcelImport from "@/components/ExcelImport";
import CompanyList from "@/components/CompanyList";
import AddLocationDialog from "@/components/AddLocationDialog";
import MapView from "@/components/MapView";
import { Search, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export default function Index() {
  const { categories, addCategory } = useCategories();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [selected, setSelected] = useState<Company | null>(null);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<string>("");

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
          }))
        );
      }
    };

    loadCompanies();
  }, []);

  const cities = useMemo(() => {
    const set = new Set(companies.map(c => c.city).filter(Boolean));
    return Array.from(set).sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (cityFilter !== "all" && c.city !== cityFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.postalCode.includes(q) || c.address.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || (c.url && c.url.toLowerCase().includes(q));
    });
  }, [companies, cityFilter, search]);

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
  }, []);

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

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="w-80 shrink-0 border-r border-[hsl(220,40%,18%)] bg-[hsl(220,40%,13%)] flex flex-col overflow-hidden text-[hsl(210,30%,90%)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(220,40%,18%)]">
          <img src={logo} alt="Client Map Norway" className="h-8 w-8 rounded" />
          <h1 className="font-bold text-white text-sm tracking-wide">Client Map Norway</h1>
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
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="bg-[hsl(220,38%,17%)] border-[hsl(220,35%,22%)] text-[hsl(210,30%,90%)]">
              <SelectValue placeholder="Filtrer på by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle byer</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <CompanyList companies={filteredCompanies} filter="" onSelect={setSelected} onRemove={removeCompany} onEdit={handleEdit} />
        </div>
      </div>

      <div className="flex-1 relative">
        <MapView companies={filteredCompanies} selectedCompany={selected} />
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
    </div>
  );
}
