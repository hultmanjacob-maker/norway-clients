# Hitta liknande bolag

En ny funksjon i sidepanelet der du limer inn en ekstern nettadresse (f.eks. www.nibe.se) og får de 10 mest like bedriftene i databasen, med prosent-treff og kort begrunnelse.

## Slik ser det ut

```text
+------------------------------------------+
|  Find reference            [ globe ]     |
+------------------------------------------+
|  HITTA LIKNANDE BOLAG                    |
|  [ www.nibe.se            ] [  Søk  ]    |
|                                          |
|  Analyserer bolaget...  (3 skjelettkort) |
|                                          |
|  +------------------------------------+  |
|  | Nordic Varme AS            [ 92% ] |  |
|  | (Samme bransje: Energi & Miljø)    |  |
|  | (Lignende produkt: varmepumper)    |  |
|  +------------------------------------+  |
|  | Klima Service AS           [ 64% ] |  |
|  | (Lignende produkt: ventilasjon)    |  |
|  +------------------------------------+  |
+------------------------------------------+
```

Prosentmerket er grønt over 75 %, gult 50–75 %, grått under 50 %. Kortene bruker samme mørke tema og Badge-stil som resten av listen. Klikk på et kort velger bedriften i listen og zoomer til den på kartet. Er alle treff under 30 %, vises i stedet meldingen «Fant ingen tilstrekkelig like bedrifter».

## Slik fungerer det

1. Du limer inn en adresse og trykker Søk.
2. Nettsiden hentes og leses (samme skrapemetode som allerede brukes).
3. AI leser innholdet og henter ut bransje (samme kategoriliste som i dag) og en liste over produkter/tjenester.
4. Dette sammenlignes mot alle bedrifter som allerede har skrapet innhold, og hver får en poengsum 0–100.
5. De 10 beste vises som kort med begrunnelse.

Poengsummen vektes: bransje-match teller mest (ca. 40 %), meningslikhet i produkter/tjenester resten (ca. 60 %) — så «SUV-modeller» matcher «firehjulsdrevne biler» selv uten like ord.

## Teknisk

**Ny edge function `find-similar-companies`** (`supabase/functions/find-similar-companies/index.ts`):
- Input: `{ url }`. Validerer med Zod, CORS som øvrige funksjoner.
- Skraper URL-en med Firecrawl (samme kall/timeout-håndtering som `firecrawl-scrape`, inkl. 408 som mykt feilsvar).
- Kall 1 til Lovable AI (`google/gemini-3.8-flash`, structured output): returnerer `{ industry, products[], summary }` med samme `INDUSTRIES`-liste som `classify-industry`.
- Henter kandidater server-side med service-role-klient: `companies` (id, name, url, industry_tag) joinet mot `scraped_content` (content). Innhold trunkeres til ~600 tegn per bedrift.
- Forhåndsfilter i kode for å holde prompten liten: alle med samme `industry_tag` først, deretter opp til ~60 kandidater totalt rangert etter enkelt nøkkelord-overlapp (ordgrense-regex, samme prinsipp som dagens søk).
- Kall 2 til Lovable AI: rangerer kandidatene semantisk og returnerer `{ id, score, reasons[] }` (maks 2 korte grunner per bedrift). Streamet respons konsumeres server-side for å unngå timeout.
- Output: `{ success, source: { industry, products }, matches: [...] }`, topp 10 sortert fallende. Feil (402/429/timeout) returneres som lesbar melding til UI.

**Frontend:**
- Ny `src/components/SimilarCompanies.tsx`: input + Søk-knapp, skeleton-kort under lasting, resultatkort med `Badge` og prosent-pill, tom-tilstand under 30 %.
- Ny hook `src/hooks/useSimilarCompanies.ts` som kaller funksjonen via `supabase.functions.invoke`.
- `src/pages/Index.tsx`: rendrer komponenten rett under «Find reference»-feltet og sender `onSelect` som setter `selected` (kartet flyr dit, som ved vanlig valg).

Ingen databaseendringer trengs.
