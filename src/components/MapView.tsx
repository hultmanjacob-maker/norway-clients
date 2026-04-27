import { useEffect, useRef } from "react";
import L from "leaflet";
import { Company, CompanyLocation } from "@/types/company";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapViewProps {
  companies: Company[];
  locations: CompanyLocation[];
  selectedCompany: Company | null;
  searchPin?: { lat: number; lng: number; label: string } | null;
}

export default function MapView({ companies, locations, selectedCompany, searchPin }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map – centered on Norway
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([62.0, 10.0], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    // Company name lookup for locations
    const companyMap = new Map(companies.map(c => [c.id, c]));

    companies.forEach((c) => {
      const marker = L.marker([c.lat, c.lng]).addTo(markersRef.current!);
      const urlHtml = c.url
        ? `<a href="${c.url.startsWith("http") ? c.url : `https://${c.url}`}" target="_blank" rel="noreferrer" style="color:#2563eb;text-decoration:underline;font-size:12px">${c.url}</a>`
        : "";
      marker.bindPopup(`
        <div style="text-align:center;min-width:140px">
          <strong>${c.name}</strong>
          <div style="font-size:12px;margin-top:4px">${c.address}</div>
          <div style="font-size:12px">${c.postalCode} ${c.city}</div>
          ${c.category ? `<div style="font-size:11px;color:#6366f1;margin-top:4px">${c.category}</div>` : ""}
          ${urlHtml ? `<div style="margin-top:4px">${urlHtml}</div>` : ""}
        </div>
      `);
    });

    // Additional locations
    locations.forEach((loc) => {
      const parent = companyMap.get(loc.companyId);
      if (!parent) return;
      const marker = L.marker([loc.lat, loc.lng], {
        icon: L.icon({
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      }).addTo(markersRef.current!);
      marker.bindPopup(`
        <div style="text-align:center;min-width:140px">
          <strong>${parent.name}</strong>
          <div style="font-size:11px;color:#888;margin-top:2px">Ekstra lokasjon</div>
          <div style="font-size:12px;margin-top:4px">${loc.address}</div>
          <div style="font-size:12px">${loc.postalCode} ${loc.city}</div>
        </div>
      `);
    });
  }, [companies, locations]);

  // Fly to selected
  useEffect(() => {
    if (!mapRef.current || !selectedCompany) return;
    mapRef.current.flyTo([selectedCompany.lat, selectedCompany.lng], 13, { duration: 0.8 });
  }, [selectedCompany]);

  return <div ref={containerRef} className="h-full w-full" style={{ minHeight: "100vh" }} />;
}
