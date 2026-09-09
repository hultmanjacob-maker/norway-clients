CREATE OR REPLACE VIEW public.scraped_content_preview
WITH (security_invoker = true) AS
SELECT company_id, substring(content, 1, 1200) AS content
FROM public.scraped_content;

GRANT SELECT ON public.scraped_content_preview TO authenticated;
GRANT SELECT ON public.scraped_content_preview TO anon;
GRANT ALL ON public.scraped_content_preview TO service_role;