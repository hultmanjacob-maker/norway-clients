Gjør venstre spalte rullegardinaktig og nullstill "Hitta liknande bolag" når URL fjernes

Mål
1. Hele venstre spalte skal kunne rulles (scrolles) vertikalt slik at man ser alle alternativer selv på små skjermer.
2. Når URL-feltet i "Hitta liknande bolag" tømmes, skal filtreringen fjernes og alle bedrifter vises igjen.
3. Resultatområdet under "Hitta liknande bolag" skal være rullebart hvis det inneholder mange treff.

Endringer

1. Venstre spalte – full høyde-rulling
   - I `src/pages/Index.tsx`: fjern `overflow-hidden` på den ytre venstre kolonne-diven og gi den `overflow-y-auto` i stedet.
   - Behold den eksisterende visuelle strukturen (header, søkefelt, skjema, liste), men la hele kolonnen rulle sammen.

2. "Hitta liknande bolag" – nullstill ved tom URL
   - I `src/components/SimilarCompanies.tsx`: reager på at `url` blir tomt ved å tømme resultater (`matches`) og eventuell feilmelding.
   - Dette gjøres enkelt ved å kalle en reset-funksjon fra `useSimilarCompanies` når `url.trim()` er `""`.
   - Alternativt kan komponenten sende en `onClear`-signal oppover, men det enkleste er å holde tilstanden i hooken/komponenten.

3. Rullebart resultatområde for liknende bedrifter
   - I `src/components/SimilarCompanies.tsx`: legg en `max-h` (f.eks. `max-h-64`) og `overflow-y-auto` rundt listen med treffkort.
   - Sørg for at kortene fortsatt er klikkbare og at scrollbar følger mørk tema.

4. Verifisering
   - Kjør `bunx tsc --noEmit` for å sikre at TypeScript er gyldig.
   - Åpne forhåndsvisningen, tøm URL-feltet i "Hitta liknande bolag", og bekreft at alle bedrifter vises igjen.
   - Rull i venstre spalte og i resultatområdet for å bekrefte oppførselen.
