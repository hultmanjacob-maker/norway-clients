# Gjør "Hitta liknande bolag" raskere

Søket tar i dag typisk 20–40 sekunder fordi fire tunge steg kjøres etter hverandre: nettsiden leses, AI analyserer den, all lagret nettsidetekst for alle bedrifter hentes ned, og AI rangerer 60 kandidater med lange tekstutdrag.

## Hva som endres

1. **Raskere lesing av nettsiden**
   - Kortere ventetid (12 sekunder i stedet for 30) og bruk av Firecrawls hurtigbuffer, slik at en adresse som er lest før svarer nesten umiddelbart.
   - Ved timeout: tydelig beskjed i stedet for lang venting.

2. **Mindre datauttrekk**
   - I stedet for å hente hele nettsidetekster for alle bedrifter, hentes bare de første ~1200 tegnene per bedrift, direkte i databasespørringen.
   - Kandidatlisten kuttes fra 60 til 25 bedrifter før AI-rangeringen.

3. **Kortere AI-arbeid**
   - Analysetrinnet får mindre tekst inn (3000 tegn) og svarer kortere.
   - Rangeringen får ~25 kandidater med ~350 tegn hver, altså under en tredjedel av dagens promptstørrelse.
   - Begge AI-kall kjøres med lav "reasoning"-innsats der modellen støtter det.

4. **Parallellisering**
   - Uttrekket av bedrifter og lagret nettsidetekst starter samtidig som nettsiden leses, i stedet for etterpå.

5. **Bedre tilbakemelding underveis**
   - Statusteksten bytter mellom "Leser nettsiden…", "Analyserer innhold…" og "Sammenligner med bedriftene…" så det er tydelig hva som skjer.

## Test og verifisering

- Måler total svartid før og etter for samme adresse (f.eks. nibe.se), både første gang og gjentatt.
- Sjekker i loggene hvor lang tid hvert steg tar, og bekrefter at treffene fortsatt er relevante (samme nisje/produkter som før).
- Mål: under ~10 sekunder for en ny adresse, og noen få sekunder for en adresse som er søkt på før.

## Teknisk

- `supabase/functions/find-similar-companies/index.ts`: `maxAge`-cache og `timeout: 12000` på Firecrawl; `Promise.all` for scrape + databaseuttrekk; `select` med `substring(content, 1, 1200)` via RPC-fri løsning (hent `content` men trunkér umiddelbart, evt. ny SQL-view `scraped_content_preview`); pool 60 → 25; utdrag 600 → 350 tegn; analysetekst 5000 → 3000 tegn; logging av varighet per steg.
- `src/hooks/useSimilarCompanies.ts` + `src/components/SimilarCompanies.tsx`: eksponere og vise et `stage`-felt for statusteksten.
- Ingen endring i scoring-logikk, terskel på 30 % eller kortutseende.
