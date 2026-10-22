import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, serviceWorker, css, interfaceSpec, pageViews, themeController] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('sw.js', 'utf8'),
  readFile('styles/prisma-design-system.css', 'utf8'),
  readFile('openspec/specs/interface/spec.md', 'utf8'),
  readFile('js/ui/page-views.js', 'utf8'),
  readFile('js/ui/theme-controller.js', 'utf8')
]);

const links = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g)].map(match => match[1]);
assert.equal(links.at(-1), './styles/prisma-design-system.css?v=ui-20261021-24',
  'El sistema visual debe ser la última hoja y utilizar la nueva versión.');
assert.match(html, /<html\b[^>]*data-theme=["']dark["']/, 'El HTML debe iniciar en modo oscuro.');
assert.match(css, /--bg:\s*#050505;/, 'El fondo oscuro debe ser negro.');
assert.match(css, /--accent:\s*#8197b2;/, 'El acento oscuro debe ser azul acero apagado.');
assert.match(css, /--accent-strong:\s*#647f9e;/, 'El azul de interacción no debe ser eléctrico.');
assert.match(css, /--gold:\s*#dbc08c;/, 'Las puntuaciones deben conservar su color semántico sobrio.');
assert.match(css, /--bg:\s*#f4f5f7;/, 'El modo claro debe usar una base gris clara.');
assert.match(css, /--accent:\s*#486b94;/, 'El modo claro debe mantener un acento azul discreto.');
assert.match(css, /:root\[data-theme="light"\][\s\S]*?color-scheme:\s*light/, 'El modo claro debe anunciar su esquema de color.');
assert.match(css, /\.nav-item\.active[\s\S]*?background:\s*var\(--accent-wash\)/,
  'La navegación activa debe usar el token azul común y no colores decorativos.');
assert.match(css, /\.btn-primary,[\s\S]*?background:\s*var\(--button-primary-bg\)/,
  'Los botones principales deben usar el token de tema.');
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/, 'Debe respetarse movimiento reducido.');
assert.match(css, /scroll-behavior:\s*auto\s*!important/, 'Movimiento reducido no puede forzar scroll suave.');
assert.match(interfaceSpec, /Preferencia de tema personal/, 'La especificación permanente debe definir los modos.');
assert.match(pageViews, /data-action="set-theme"/, 'Ajustes debe ofrecer controles de tema funcionales.');
assert.match(pageViews, /aria-pressed=/, 'El selector debe comunicar el modo activo con semántica accesible.');
assert.match(themeController, /const THEME_KEY = "prisma:theme"/, 'La preferencia de tema debe persistirse aparte del perfil de cine.');
assert.match(themeController, /currentTheme = "dark"/, 'El tema oscuro debe ser el fallback predeterminado.');
assert.match(serviceWorker, /const CACHE_NAME = "prisma-shell-v94"/, 'La PWA debe renovar caché al publicar los temas.');
assert.ok(serviceWorker.includes('"./styles/prisma-design-system.css?v=ui-20261021-24"'),
  'El service worker debe usar la misma versión de la hoja de temas.');
assert.ok(serviceWorker.includes('"./app.js?v=ui-20261022-82"'),
  'El service worker debe usar la misma entrada de aplicación versionada.');
console.log('Sistema visual Prisma correcto: negro, azul discreto, modo claro, selector accesible y caché PWA.');
