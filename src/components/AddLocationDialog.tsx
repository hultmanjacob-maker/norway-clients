import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Company } from "@/types/company";

interface AddLocationDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (companyId: string, data: { address: string; postalCode: string; city: string }) => Promise<void>;
  loading: boolean;
}

export default function AddLocationDialog({ company, open, onOpenChange, onSave, loading }: AddLocationDialogProps) {
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const handleSubmit = async () => {
    if (!company || !address.trim() || !postalCode.trim()) return;
    await onSave(company.id, {
      address: address.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
    });
    setAddress("");
    setPostalCode("");
    setCity("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[9999]">
        <DialogHeader>
          <DialogTitle>Legg til lokasjon for {company?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Input placeholder="Adresse *" value={address} onChange={e => setAddress(e.target.value)} />
          <Input placeholder="Postnummer *" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
          <Input placeholder="By" value={city} onChange={e => setCity(e.target.value)} />
          <Button onClick={handleSubmit} disabled={loading || !address.trim() || !postalCode.trim()} className="w-full">
            {loading ? "Legger til..." : "Legg til lokasjon"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
