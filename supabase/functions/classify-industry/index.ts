import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name = "", category = "", content = "" } = await req.json();
    if (!content && !name) {
      return new Response(JSON.stringify({ success: false, error: "missing_input" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const trimmed = String(content).slice(0, 4000);
    const prompt = `Klassifiser bedriften under i én av disse generelle bransjekategoriene. Svar KUN med kategorinavnet, ingenting annet.

Kategorier:
${INDUSTRIES.map(i => `- ${i}`).join('\n')}

Bedrift: ${name}
Eksisterende kategori (hint): ${category}
Innhold fra nettside:
${trimmed}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Du klassifiserer bedrifter i én av de gitte bransjekategoriene. Svar kun med kategorinavnet." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ success: false, error: `ai_error: ${res.status} ${txt}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const raw = (data?.choices?.[0]?.message?.content || "").trim();
    const match = INDUSTRIES.find(i => raw.toLowerCase().includes(i.toLowerCase())) || "Annet";

    return new Response(JSON.stringify({ success: true, industry: match }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
