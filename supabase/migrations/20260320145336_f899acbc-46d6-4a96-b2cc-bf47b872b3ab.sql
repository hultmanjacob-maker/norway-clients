
CREATE TABLE public.company_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  address text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read company_locations" ON public.company_locations FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert company_locations" ON public.company_locations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update company_locations" ON public.company_locations FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete company_locations" ON public.company_locations FOR DELETE TO public USING (true);
