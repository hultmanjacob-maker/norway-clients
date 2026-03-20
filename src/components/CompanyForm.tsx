import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CategorySelect from "@/components/CategorySelect";
import { Plus } from "lucide-react";

interface CompanyFormProps {
  onAdd: (data: { name: string; address: string; postalCode: string; category: string; url: string }) => Promise<void>;
  loading: boolean;
  categories: string[];
  onAddCategory: (name: string) => Promise<boolean>;
}

export default function CompanyForm({ onAdd, loading, categories, onAddCategory }: CompanyFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [category, setCategory] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !postalCode.trim()) return;
    await onAdd({ name: name.trim(), address: address.trim(), postalCode: postalCode.trim(), category, url: url.trim() });
    setName(""); setAddress(""); setPostalCode(""); setCategory(""); setUrl("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Ny virksomhed
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tilføj virksomhed</DialogTitle>
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
            {loading ? "Tilføjer..." : "Tilføj"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
