import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const INDUSTRIES = [
  "Bygg & Anlegg",
  "Handel & Detaljhandel",
  "Transport & Logistikk",
  "IT & Teknologi",
  "Helse & Omsorg",
  "Restaurant & Servering",
  "Industri & Produksjon",
  "Eiendom",
  "Finans & Forsikring",
  "Utdanning",
  "Konsulent & Tjenester",
  "Bilbransjen",
  "Reiseliv & Hotell",
  "Energi & Miljø",
  "Media & Markedsføring",
  "Landbruk & Fiske",
  "Annet",
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function callAI(apiKey: string, messages: unknown[]) {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'google/gemini-3.8-flash', messages, reasoning_effort: 'low' }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 402) throw new Error('AI-kreditter er brukt opp. Fyll på i Lovable for å fortsette.');
    if (res.status === 429) throw new Error('For mange forespørsler mot AI akkurat nå. Prøv igjen om litt.');
    throw new Error(`AI-feil (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content || '');
}

function parseJson(raw: string) {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string' || url.trim().length < 3) {
      return json({ success: false, error: 'Ugyldig nettadresse' }, 400);
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const aiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!firecrawlKey) return json({ success: false, error: 'Firecrawl er ikke konfigurert' }, 500);
    if (!aiKey) return json({ success: false, error: 'AI er ikke konfigurert' }, 500);

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = `https://${formattedUrl}`;

    const t0 = Date.now();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1) Scrape the pasted URL — in parallel with fetching candidates from the DB
    const scrapePromise = fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 12000,
        maxAge: 604800000,
      }),
    });
    const companiesPromise = supabase.from('companies').select('id, name, url, industry_tag');
    const scrapedPromise = supabase.from('scraped_content').select('company_id, content');

    const [scrapeRes, companiesRes, scrapedRes] = await Promise.all([
      scrapePromise,
      companiesPromise,
      scrapedPromise,
    ]);
    const scrapeData = await scrapeRes.json();
    console.log(`scrape+db done in ${Date.now() - t0}ms`);
    if (!scrapeRes.ok) {
      const msg = scrapeRes.status === 408 || scrapeData?.code === 'SCRAPE_TIMEOUT'
        ? 'Nettsiden svarte for sakte. Prøv igjen eller bruk en annen adresse.'
        : (scrapeData?.error || `Klarte ikke å lese nettsiden (${scrapeRes.status})`);
      return json({ success: false, error: msg });
    }
    const content = String(scrapeData.data?.markdown || scrapeData.markdown || '');
    if (!content.trim()) return json({ success: false, error: 'Fant ikke noe innhold på nettsiden' });

    // 2) Extract industry, niche and products
    const extractRaw = await callAI(aiKey, [
      { role: 'system', content: 'Du analyserer bedriftsnettsider. Svar KUN med gyldig JSON, ingen forklaring.' },
      {
        role: 'user',
        content: `Analyser innholdet under og returner JSON med feltene:
{"industry": "<én av kategoriene>", "niche": "<kort, spesifikk nisje, f.eks. Varmepumper, Bilforhandlere, Tannklinikk>", "products": ["maks 8 konkrete produkter/tjenester"]}

Kategorier: ${INDUSTRIES.join(', ')}

Innhold:
${content.slice(0, 5000)}`,
      },
    ]);
    const source = parseJson(extractRaw) as { industry?: string; niche?: string; products?: string[] } | null;
    if (!source) return json({ success: false, error: 'Klarte ikke å analysere nettsiden' });
    const sourceIndustry = INDUSTRIES.find(i => (source.industry || '').toLowerCase().includes(i.toLowerCase())) || 'Annet';

    // 3) Fetch candidates
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: companies, error: cErr } = await supabase
      .from('companies')
      .select('id, name, url, industry_tag');
    if (cErr) return json({ success: false, error: cErr.message }, 500);

    const { data: scraped, error: sErr } = await supabase
      .from('scraped_content')
      .select('company_id, content');
    if (sErr) return json({ success: false, error: sErr.message }, 500);

    const contentById = new Map<string, string>();
    for (const row of scraped || []) {
      if (!contentById.has(row.company_id)) contentById.set(row.company_id, row.content || '');
    }

    const keywords = [sourceIndustry, source.niche || '', ...(source.products || [])]
      .join(' ')
      .toLowerCase()
      .split(/[^a-zA-ZæøåÆØÅ0-9]+/)
      .filter(w => w.length > 3);

    const pool = (companies || [])
      .filter(c => contentById.has(c.id))
      .map(c => {
        const text = (contentById.get(c.id) || '').toLowerCase();
        let overlap = 0;
        for (const w of new Set(keywords)) {
          if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)) overlap++;
        }
        const sameIndustry = (c.industry_tag || '').trim() === sourceIndustry;
        return { ...c, overlap, sameIndustry, text };
      })
      .sort((a, b) => (Number(b.sameIndustry) - Number(a.sameIndustry)) || (b.overlap - a.overlap))
      .slice(0, 60);

    if (pool.length === 0) {
      return json({ success: true, source: { ...source, industry: sourceIndustry }, matches: [] });
    }

    // 4) Rank semantically
    const candidateBlock = pool
      .map((c, i) => `#${i} ${c.name}\n${c.text.slice(0, 600).replace(/\s+/g, ' ')}`)
      .join('\n---\n');

    const rankRaw = await callAI(aiKey, [
      { role: 'system', content: 'Du sammenligner bedrifter semantisk. Svar KUN med gyldig JSON-array, ingen forklaring.' },
      {
        role: 'user',
        content: `Referansebedrift:
Nisje: ${source.niche || 'ukjent'}
Produkter/tjenester: ${(source.products || []).join(', ')}

Ranger kandidatene under etter hvor like de er referansebedriften. Vekt: nisje/produktområde ca. 40 %, semantisk overlapp i produkter/tjenester ca. 60 % (samme mening teller, ikke bare samme ord).

Returner JSON-array med maks 10 objekter, sortert fallende på score:
[{"index": <nummeret fra #>, "score": <0-100>, "reasons": ["maks 2 korte begrunnelser"]}]

Begrunnelsene skal være konkrete, f.eks. "Samme nisje: Varmepumper" eller "Lignende produkt: bergvarme". Bruk ALDRI generelle bransjenavn som "Industri" eller "Handel" i begrunnelsene — bruk spesifikk nisje eller produkt.

Kandidater:
${candidateBlock}`,
      },
    ]);

    const ranked = parseJson(rankRaw);
    if (!Array.isArray(ranked)) return json({ success: false, error: 'Klarte ikke å rangere bedriftene' });

    const matches = ranked
      .map((r: { index?: number; score?: number; reasons?: string[] }) => {
        const c = pool[Number(r.index)];
        if (!c) return null;
        return {
          id: c.id,
          name: c.name,
          url: c.url,
          score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
          reasons: (r.reasons || []).slice(0, 2).map(String),
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.score - a!.score))
      .slice(0, 10);

    return json({ success: true, source: { ...source, industry: sourceIndustry }, matches });
  } catch (error) {
    console.error('find-similar-companies error:', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Ukjent feil' }, 200);
  }
});
