import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .order("name");
      if (!error && data) {
        setCategories(data.map((r) => r.name));
      }
    };
    load();
  }, []);

  const addCategory = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const { error } = await supabase.from("categories").insert({ name: trimmed });
    if (error) {
      if (error.code === "23505") {
        toast.error("Branchen findes allerede.");
      } else {
        toast.error("Kunne ikke oprette branchen.");
      }
      return false;
    }

    setCategories((prev) => [...prev, trimmed].sort());
    toast.success(`Branche "${trimmed}" oprettet!`);
    return true;
  }, []);

  return { categories, addCategory };
}
