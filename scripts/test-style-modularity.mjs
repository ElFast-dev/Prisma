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
  'styles/watch-streak.css',
  'styles/prisma-design-system.css'
];
const matches = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g)];
assert.equal(matches.length, paths.length, 'index.html debe cargar exactamente los módulos CSS esperados');

const shell = new Set([...serviceWorker.matchAll(/["'](\.\/styles\/[^"']+|\.\/styles\.css[^"']*)["']/g)].map(match => match[1]));
const hrefs = matches.map(match => match[1]);
for (let index = 0; index < paths.length; index += 1) {
  const expectedPath = './' + paths[index];
  const url = new URL(hrefs[index], 'https://prisma.invalid/');
  assert.equal(url.pathname, expectedPath.slice(1), 'Orden de estilos incorrecto en la posición ' + (index + 1));
  assert.equal(url.searchParams.get('v'), 'ui-20261023-27', paths[index] + ' necesita versión compartida');
  assert.ok(shell.has(expectedPath + '?v=ui-20261023-27'), paths[index] + ' debe estar cacheada con la URL exacta');
  const source = await readFile(paths[index], 'utf8');
  await access(paths[index]);
  assert.ok(source.trim(), paths[index] + ' no debe estar vacío');
  assert.equal((source.match(/{/g) || []).length, (source.match(/}/g) || []).length,
    paths[index] + ' debe contener reglas completas sin bloques CSS truncados');
}
console.log('Sistema visual modular correcto: ' + paths.length + ' hojas con orden, versiones y caché verificados.');
