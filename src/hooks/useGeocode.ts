type GeocodeResult = { lat: number; lng: number; city: string };

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=dk&addressdetails=1";
const HEADERS = {
  "User-Agent": "VirksomhedskortDanmark/1.0",
  Accept: "application/json",
};
const REQUEST_INTERVAL_MS = 1200;
const MAX_RETRIES = 3;

const geocodeCache = new Map<string, GeocodeResult | null>();
let nextAllowedRequestAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCity(address: Record<string, string | undefined>): string {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.city_district ||
    ""
  );
}

async function nominatimSearch(query: string): Promise<GeocodeResult | null> {
  const cacheKey = query.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const waitMs = Math.max(0, nextAllowedRequestAt - Date.now());
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    nextAllowedRequestAt = Date.now() + REQUEST_INTERVAL_MS;

    try {
      const res = await fetch(`${NOMINATIM_URL}&q=${encodeURIComponent(query)}`, { headers: HEADERS });

      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_RETRIES - 1) {
          await sleep((attempt + 1) * 1500);
          continue;
        }
        geocodeCache.set(cacheKey, null);
        return null;
      }

      if (!res.ok) {
        geocodeCache.set(cacheKey, null);
        return null;
      }

      const data: unknown = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        geocodeCache.set(cacheKey, null);
        return null;
      }

      const first = data[0] as {
        lat?: string;
        lon?: string;
        address?: Record<string, string | undefined>;
      };

      const lat = Number.parseFloat(first.lat ?? "");
      const lng = Number.parseFloat(first.lon ?? "");
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        geocodeCache.set(cacheKey, null);
        return null;
      }

      const result: GeocodeResult = {
        lat,
        lng,
        city: extractCity(first.address ?? {}),
      };
      geocodeCache.set(cacheKey, result);
      return result;
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await sleep((attempt + 1) * 1500);
        continue;
      }
      geocodeCache.set(cacheKey, null);
      return null;
    }
  }

  geocodeCache.set(cacheKey, null);
  return null;
}

export async function geocodeAddress(address: string, postalCode: string): Promise<GeocodeResult | null> {
  const cleanAddress = address.trim();
  const cleanPostalCode = postalCode.trim();

  let query = "";
  if (cleanPostalCode && cleanAddress) {
    query = `${cleanAddress}, ${cleanPostalCode}, Denmark`;
  } else if (cleanPostalCode) {
    query = `${cleanPostalCode}, Denmark`;
  } else if (cleanAddress) {
    query = `${cleanAddress}, Denmark`;
  } else {
    return null;
  }

  const primary = await nominatimSearch(query);
  if (primary) {
    return primary;
  }

  if (cleanPostalCode && cleanAddress) {
    return nominatimSearch(`${cleanPostalCode}, Denmark`);
  }

  return null;
}
