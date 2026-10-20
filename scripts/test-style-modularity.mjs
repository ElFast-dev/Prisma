import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');
const serviceWorker = await readFile('sw.js', 'utf8');
const paths = [
  'styles.css',
  'styles/movie-cards.css',
  'styles/dialogs-feedback.css',
  'styles/responsive.css',
  'styles/visual-refinements.css',
  'styles/collection.css',
  'styles/accessibility.css',
  'styles/catalog.css',
  'styles/collection-content.css',
  'styles/movie-details.css',
  'styles/brand-system.css'
];
const matches = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g)];
assert.equal(matches.length, paths.length, 'index.html debe cargar exactamente los módulos CSS esperados');

const shell = new Set([...serviceWorker.matchAll(/["'](\.\/styles\/[^"']+|\.\/styles\.css[^"']*)["']/g)].map(match => match[1]));
const hrefs = matches.map(match => match[1]);
for (let index = 0; index < paths.length; index += 1) {
  const expectedPath = './' + paths[index];
  const url = new URL(hrefs[index], 'https://prisma.invalid/');
  assert.equal(url.pathname, expectedPath.slice(1), 'Orden de estilos incorrecto en la posición ' + (index + 1));
  assert.equal(url.searchParams.get('v'), 'ui-20261020-19', paths[index] + ' necesita versión compartida');
  assert.ok(shell.has(expectedPath + '?v=ui-20261020-19'), paths[index] + ' debe estar cacheada con la URL exacta');
  const source = await readFile(paths[index], 'utf8');
  await access(paths[index]);
  assert.ok(source.trim(), paths[index] + ' no debe estar vacío');
  assert.equal((source.match(/{/g) || []).length, (source.match(/}/g) || []).length,
    paths[index] + ' debe contener reglas completas sin bloques CSS truncados');
}
console.log('Sistema visual modular correcto: ' + paths.length + ' hojas con orden, versiones y caché verificados.');


const brandSystem = await readFile('styles/brand-system.css', 'utf8');
assert.match(brandSystem, /--accent:\s*#a78bfa/i, 'El sistema de marca debe centralizar el acento violeta de Prisma');
assert.match(brandSystem, /--bg:\s*#080c12/i, 'El sistema de marca debe mantener el fondo oscuro de Prisma');
assert.match(brandSystem, /prefers-reduced-motion:\s*reduce/i, 'La capa de marca debe respetar movimiento reducido');
assert.match(brandSystem, /transition-duration:\s*0s\s*!important/i, 'El movimiento reducido debe desactivar transiciones globales');
const logo = await readFile('assets/prisma.svg', 'utf8');
assert.match(logo, /#a78bfa/i, 'El isotipo debe compartir el acento violeta de la interfaz');
assert.match(logo, /#7dd3fc/i, 'El isotipo debe conservar el acento cian secundario');
const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));
assert.equal(manifest.icons[0].src, './assets/prisma.svg?v=brand-20261020-1', 'La PWA debe referenciar la versión del nuevo isotipo');
assert.ok(html.includes('brand-20261020-1'), 'El documento debe versionar el isotipo');
assert.ok(serviceWorker.includes('./assets/prisma.svg?v=brand-20261020-1'), 'La caché de shell debe incluir la URL versionada del isotipo');
console.log('Identidad visual verificada: tokens violeta, movimiento reducido, isotipo y manifiesto PWA coherentes.');
