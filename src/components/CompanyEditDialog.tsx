import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CategorySelect from "@/components/CategorySelect";
import { Company } from "@/types/company";

interface CompanyEditDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (company: Company, updates: { name: string; address: string; postalCode: string; category: string; url: string }) => Promise<void>;
  loading: boolean;
  categories: string[];
  onAddCategory: (name: string) => Promise<boolean>;
}

export default function CompanyEditDialog({ company, open, onOpenChange, onSave, loading, categories, onAddCategory }: CompanyEditDialogProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [category, setCategory] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (company) {
      setName(company.name);
      setAddress(company.address);
      setPostalCode(company.postalCode);
      setCategory(company.category);
      setUrl(company.url);
    }
  }, [company]);

  const handleSubmit = async () => {
    if (!company || !name.trim() || !postalCode.trim()) return;
    await onSave(company, {
      name: name.trim(),
      address: address.trim(),
      postalCode: postalCode.trim(),
      category,
      url: url.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[9999]">
        <DialogHeader>
          <DialogTitle>Rediger virksomhed</DialogTitle>
          <DialogDescription>Rediger virksomhedens oplysninger nedenfor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Input placeholder="Virksomhedsnavn *" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Adresse" value={address} onChange={e => setAddress(e.target.value)} />
          <Input placeholder="Postnummer *" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
          <CategorySelect
            value={category}
            onValueChange={setCategory}
            categories={categories}
            onAddCategory={onAddCategory}
          />
          <Input placeholder="Hjemmeside (https://...)" value={url} onChange={e => setUrl(e.target.value)} />
          <Button onClick={handleSubmit} disabled={loading || !name.trim() || !postalCode.trim()} className="w-full">
            {loading ? "Gemmer..." : "Gem ændringer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
