export const INDUSTRIES = [
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
] as const;

export type Industry = typeof INDUSTRIES[number];
