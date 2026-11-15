const smokeUrl = process.env.PRISMA_SMOKE_URL;
if (!smokeUrl) {
  throw new Error("PRISMA_SMOKE_URL es obligatorio para verificar la publicación.");
}

const baseUrl = new URL(smokeUrl);
if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "127.0.0.1" && baseUrl.hostname !== "localhost") {
  throw new Error("La URL de smoke test debe ser HTTPS o un servidor local.");
}

function parseAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

function findTags(html, tagName) {
  const expression = new RegExp("<" + tagName + "\\b[^>]*>", "gi");
  return [...html.matchAll(expression)].map((match) => parseAttributes(match[0]));
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(url + " respondió HTTP " + response.status);
  }
  return response.text();
}

async function verifyPublishedSite() {
  const html = await fetchText(baseUrl);
  if (!/<title>\s*Prisma\s*<\/title>/i.test(html)) {
    throw new Error("El documento publicado no contiene el título de Prisma.");
  }

  const scripts = findTags(html, "script")
    .map((attrs) => attrs.src)
    .filter(Boolean);
  const links = findTags(html, "link");
  const stylesheets = links
    .filter((attrs) => (attrs.rel ?? "").toLowerCase().split(/\s+/).includes("stylesheet"))
    .map((attrs) => attrs.href)
    .filter(Boolean);
  const manifests = links
    .filter((attrs) => (attrs.rel ?? "").toLowerCase().split(/\s+/).includes("manifest"))
    .map((attrs) => attrs.href)
    .filter(Boolean);

  if (scripts.length === 0) throw new Error("No se encontró el bundle JavaScript.");
  if (stylesheets.length === 0) throw new Error("No se encontró la hoja de estilos.");
  if (manifests.length === 0) throw new Error("No se encontró el manifiesto de la PWA.");

  const resourceUrls = [...scripts, ...stylesheets, ...manifests]
    .map((asset) => new URL(asset, baseUrl));
  for (const resourceUrl of resourceUrls) {
    const response = await fetch(resourceUrl, { method: "GET", redirect: "follow" });
    if (!response.ok) {
      throw new Error("El recurso " + resourceUrl.href + " respondió HTTP " + response.status);
    }
    await response.arrayBuffer();
  }

  const manifestUrl = new URL(manifests[0], baseUrl);
  const manifestResponse = await fetch(manifestUrl, { redirect: "follow" });
  const manifest = await manifestResponse.json();

  if (manifest.name !== "Prisma") {
    throw new Error("El manifiesto PWA no identifica la aplicación como Prisma.");
  }
  if (manifest.scope !== "/Prisma/") {
    throw new Error("El scope del manifiesto PWA no coincide con /Prisma/.");
  }
  if (!String(manifest.start_url ?? "").startsWith("/Prisma/")) {
    throw new Error("El start_url de la PWA no apunta al proyecto publicado.");
  }

  console.log("Smoke test aprobado.");
  console.log("Página:", baseUrl.href);
  console.log("Recursos verificados:", resourceUrls.length);
  console.log("Manifiesto PWA:", manifestUrl.href);
}

const maxAttempts = Number(process.env.PRISMA_SMOKE_ATTEMPTS ?? 12);
const retryDelay = Number(process.env.PRISMA_SMOKE_RETRY_DELAY_MS ?? 10_000);
let lastError;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    await verifyPublishedSite();
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < maxAttempts) {
      console.warn("Intento " + attempt + "/" + maxAttempts + ": " + error.message);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

console.error("No se pudo verificar Prisma:", lastError);
process.exit(1);
