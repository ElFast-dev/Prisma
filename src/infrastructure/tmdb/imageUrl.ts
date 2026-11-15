export type TmdbImageSize =
  | "w92"
  | "w154"
  | "w185"
  | "w342"
  | "w500"
  | "w780"
  | "original";

export function buildTmdbImageUrl(
  secureBaseUrl: string,
  filePath: string | null | undefined,
  size: TmdbImageSize
): string | null {
  if (!filePath) return null;
  const normalizedPath = filePath.replace(/^\/+/, "");
  if (!normalizedPath || normalizedPath.includes("..")) return null;

  try {
    const base = new URL(secureBaseUrl);
    if (base.protocol !== "https:") return null;
    const basePath = base.toString().endsWith("/") ? base.toString() : base.toString() + "/";
    return new URL(size + "/" + normalizedPath, basePath).toString();
  } catch {
    return null;
  }
}
