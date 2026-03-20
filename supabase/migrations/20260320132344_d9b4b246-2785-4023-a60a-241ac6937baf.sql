
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert categories" ON public.categories FOR INSERT TO public WITH CHECK (true);

INSERT INTO public.categories (name) VALUES
  ('Bygg & Konstruktion'),
  ('El & Installation'),
  ('Fordon & Motor'),
  ('Hälsa & Sjukvård'),
  ('IT & Teknik'),
  ('Juridik & Ekonomi'),
  ('Livsmedel & Restaurang'),
  ('Städ & Fastighetsservice'),
  ('Transport & Logistik'),
  ('Utbildning'),
  ('Övrigt');
