import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  categories: string[];
  onAddCategory: (name: string) => Promise<boolean>;
}

export default function CategorySelect({ value, onValueChange, categories, onAddCategory }: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const ok = await onAddCategory(newName);
    if (ok) {
      onValueChange(newName.trim());
      setNewName("");
      setAdding(false);
    }
    setSaving(false);
  };

  if (adding) {
    return (
      <div className="flex gap-1.5">
        <Input
          placeholder="Ny branche..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          autoFocus
          className="flex-1"
        />
        <Button size="icon" variant="ghost" onClick={handleAdd} disabled={saving || !newName.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { setAdding(false); setNewName(""); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between font-normal"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || "Vælg branche"}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[10000]" align="start">
          <Command>
            <CommandInput placeholder="Søg branche..." />
            <CommandList>
              <CommandEmpty>Ingen branche fundet.</CommandEmpty>
              <CommandGroup>
                {categories.map((c) => (
                  <CommandItem
                    key={c}
                    value={c}
                    onSelect={() => {
                      onValueChange(c);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === c ? "opacity-100" : "opacity-0")} />
                    {c}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button size="icon" variant="outline" onClick={() => setAdding(true)} title="Opret ny branche">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
