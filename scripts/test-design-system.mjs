import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, serviceWorker, css, interfaceSpec] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('sw.js', 'utf8'),
  readFile('styles/prisma-design-system.css', 'utf8'),
  readFile('openspec/specs/interface/spec.md', 'utf8')
]);
const links = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g)].map(match => match[1]);
assert.equal(links.at(-1), './styles/prisma-design-system.css?v=ui-20261020-19',
  'La capa del sistema visual debe ser la última hoja de estilos, para aplicar los tokens finales.');
assert.equal((css.match(/--bg:\s*#080c12;/g) || []).length, 1, 'El fondo debe conservar el negro azulado de Prisma.');
assert.match(css, /--accent:\s*#c4b5fd;/, 'El acento principal debe ser violeta suave.');
assert.match(css, /--accent-strong:\s*#a78bfa;/, 'El acento fuerte debe conservar el violeta del sistema.');
assert.match(css, /--gold:\s*#f0d1a0;/, 'El color de las puntuaciones debe seguir siendo semánticamente dorado.');
assert.match(css, /\.nav-item\.active[\s\S]*?background:\s*rgba\(167,139,250,\.14\)/,
  'La navegación activa debe adoptar la paleta violeta.');
assert.match(css, /\.btn-primary[\s\S]*?background:\s*linear-gradient\(135deg,\s*#e9ddff,\s*#c4b5fd\)/,
  'El botón primario debe usar una superficie violeta con texto oscuro.');
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/, 'Debe respetarse movimiento reducido.');
assert.match(css, /scroll-behavior:\s*auto\s*!important/, 'Movimiento reducido no puede forzar scroll suave.');
assert.match(interfaceSpec, /acento de marca DEBE ser violeta suave/i, 'La especificación permanente debe fijar la dirección de color.');
const cacheVersion = serviceWorker.match(/const CACHE_NAME = "prisma-shell-v(\d+)"/);
assert.ok(cacheVersion && Number(cacheVersion[1]) >= 47,
  'La PWA debe renovar su caché al publicar el sistema visual.');
assert.ok(serviceWorker.includes('"./styles/prisma-design-system.css?v=ui-20261020-19"'),
  'El service worker debe cachear la misma URL que index.html.');
console.log('Sistema visual Prisma correcto: tokens violeta, estados principales, movimiento reducido y caché PWA verificados.');
