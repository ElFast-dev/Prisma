import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [responsive, pageViews, interfaceSpec, product, html, serviceWorker, app] = await Promise.all([
  readFile("styles/responsive.css", "utf8"),
  readFile("js/ui/page-views.js", "utf8"),
  readFile("openspec/specs/interface/spec.md", "utf8"),
  readFile("docs/product.md", "utf8"),
  readFile("index.html", "utf8"),
  readFile("sw.js", "utf8"),
  readFile("app.js", "utf8")
]);

assert.match(responsive, /\.topbar-actions \.top-icon-button\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s,
  "Las acciones de icono en la cabecera deben tener objetivos de al menos 44 × 44 px en móvil.");
assert.match(responsive, /\.bottom-nav \.nav-item\s*\{[^}]*min-height:\s*48px;/s,
  "Los destinos inferiores deben tener una altura táctil mínima de 48 px.");
assert.match(responsive, /\.bottom-nav \.nav-item\s*\{[^}]*transition:[^;]*\.12s/s,
  "Las transiciones de navegación deben ser rápidas y discretas.");
assert.match(responsive, /@media \(hover:\s*none\) and \(pointer:\s*coarse\)\s*\{[\s\S]*?\.bottom-nav \.nav-item:active\s*\{\s*transform:\s*none;/,
  "La pulsación táctil no debe animar una reducción de escala.");
assert.match(responsive, /@media \(prefers-reduced-motion:\s*reduce\)/,
  "Debe conservarse el soporte de movimiento reducido.");
assert.match(pageViews, /button\.setAttribute\("aria-current","page"\)/,
  "El destino activo debe anunciarse mediante aria-current.");
assert.match(pageViews, /button\.removeAttribute\("aria-current"\)/,
  "Los destinos inactivos no deben conservar aria-current.");
assert.match(pageViews, /ctx\.currentPage === "lab"[\s\S]*?ctx\.currentPage === "data"/,
  "Laboratorio y Ajustes/Datos deben mantener la correspondencia con los destinos principales.");
assert.match(interfaceSpec, /### Requirement: Objetivos táctiles cómodos/,
  "La especificación permanente debe documentar los objetivos táctiles.");
assert.match(interfaceSpec, /### Requirement: Preferencia de tema personal[\s\S]*?fondo negro[\s\S]*?azul discreto/,
  "La especificación vigente debe conservar el tema negro y el azul discreto.");
assert.match(product, /combinar en una experiencia personal de cine/,
  "La misión elegida debe documentarse en la hoja de ruta.");
assert.match(product, /Privacidad local primero[\s\S]*?exportación\/importación/,
  "La hoja de ruta debe preservar almacenamiento local y copias de seguridad.");

const appScript = html.match(/<script\b[^>]*\bsrc=["']([^"']*app\.js\?v=[^"']+)["'][^>]*><\/script>/);
assert.ok(appScript, "index.html debe cargar app.js con una versión explícita.");
assert.ok(serviceWorker.includes('"' + appScript[1] + '"'),
  "index.html y la caché PWA deben utilizar exactamente la misma URL versionada de app.js.");
assert.match(app, /page-views\.js\?v=[^"']+/,
  "La aplicación debe cargar el módulo de vistas versionado.");
const pageViewsImport = app.match(/from\s+["'](\.\/js\/ui\/page-views\.js\?[^"']+)["']/);
assert.ok(pageViewsImport, "La aplicación debe importar page-views.js mediante una URL versionada.");
assert.ok(serviceWorker.includes('"' + pageViewsImport[1] + '"'),
  "La caché PWA debe incluir la misma URL versionada de page-views.js que usa app.js.");
assert.match(serviceWorker, /const CACHE_NAME = ["']prisma-shell-v\d+["']/,
  "El nombre de caché debe estar versionado y permitir invalidar versiones anteriores.");

console.log("Navegación móvil verificada: objetivos táctiles, estado accesible, movimiento contenido y caché sincronizada.");
