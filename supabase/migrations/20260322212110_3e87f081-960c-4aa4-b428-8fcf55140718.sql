
CREATE TABLE public.scraped_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  url text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  scraped_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, url)
);

ALTER TABLE public.scraped_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scraped_content" ON public.scraped_content FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert scraped_content" ON public.scraped_content FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update scraped_content" ON public.scraped_content FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete scraped_content" ON public.scraped_content FOR DELETE TO public USING (true);
