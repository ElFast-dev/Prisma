import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, manifestSource, serviceWorker, logo] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('manifest.webmanifest', 'utf8'),
  readFile('sw.js', 'utf8'),
  readFile('assets/prisma.svg', 'utf8')
]);

const manifest = JSON.parse(manifestSource);
const iconUrl = './assets/prisma.svg?v=brand-20261020-2';
const manifestUrl = './manifest.webmanifest?v=ui-20261020-15';

const favicon = [...html.matchAll(/<link\b[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["'][^>]*>/g)];
assert.equal(favicon.length, 1, 'index.html debe declarar un único favicon.');
assert.equal(favicon[0][1], iconUrl, 'El favicon debe usar la URL versionada del SVG de marca.');

const headerLogo = [...html.matchAll(/<img\b[^>]*src=["']([^"']*assets\/prisma\.svg[^"']*)["'][^>]*>/g)];
assert.equal(headerLogo.length, 1, 'La cabecera debe mostrar un único isotipo Prisma.');
assert.equal(headerLogo[0][1], iconUrl, 'El logo del encabezado debe compartir la URL del favicon.');

const manifestLink = [...html.matchAll(/<link\b[^>]*rel=["']manifest["'][^>]*href=["']([^"']+)["'][^>]*>/g)];
assert.equal(manifestLink.length, 1, 'index.html debe declarar un único manifest.');
assert.equal(manifestLink[0][1], manifestUrl, 'El manifest debe tener una URL versionada.');

assert.equal(manifest.icons.length, 1, 'El manifest debe declarar un único icono principal.');
assert.equal(manifest.icons[0].src, iconUrl, 'El manifest debe utilizar el mismo SVG versionado que HTML.');
assert.ok(serviceWorker.includes('const CACHE_NAME = "prisma-shell-v50"'),
  'El shell PWA debe renovarse al cambiar paleta y recursos.');
assert.ok(serviceWorker.includes('"' + manifestUrl + '"'),
  'El service worker debe cachear la URL exacta del manifest.');
assert.ok(serviceWorker.includes('"' + iconUrl + '"'),
  'El service worker debe cachear la URL exacta del icono.');

for (const color of ['#e2e8f0', '#8197b2', '#607d9e', '#111417']) {
  assert.ok(logo.toLowerCase().includes(color), 'El isotipo debe incluir el color ' + color + '.');
}
assert.doesNotMatch(logo, /#4b96ff|#d5edff|#9bdcf2|#c4b5fd|#a78bfa|#7dd3fc|#0d141f/i,
  'El isotipo no debe conservar colores llamativos azules, violetas o cian de la marca anterior.');
assert.match(logo, /viewBox="0 0 128 128"/, 'El logotipo debe mantener su lienzo actual.');
assert.match(logo, /M64 16 79 49 112 64 79 79 64 112 49 79 16 64 49 49Z/,
  'El logotipo debe conservar la geometría del isotipo.');

console.log('Marca Prisma coherente: isotipo azul acero, favicon, manifest y caché PWA sincronizados.');
