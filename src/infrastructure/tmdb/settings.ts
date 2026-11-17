const TOKEN_KEY = "prisma.tmdb.accessToken";
const REGION_KEY = "prisma.catalog.region";

export function getTmdbAccessToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function saveTmdbAccessToken(token: string): void {
  const normalized = token.trim();
  if (!normalized) {
    throw new Error("Introduce una credencial de TMDB.");
  }
  window.localStorage.setItem(TOKEN_KEY, normalized);
  window.dispatchEvent(new Event("prisma:tmdb-credentials-updated"));
}

export function clearTmdbAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getCatalogRegion(): string {
  try {
    return window.localStorage.getItem(REGION_KEY) ?? "PA";
  } catch {
    return "PA";
  }
}

export function saveCatalogRegion(region: string): void {
  const normalized = region.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new Error("Introduce un código de país de dos letras.");
  }
  window.localStorage.setItem(REGION_KEY, normalized);
}
