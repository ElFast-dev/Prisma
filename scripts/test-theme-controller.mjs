import assert from 'node:assert/strict';
import { createThemeController } from '../js/ui/theme-controller.js';

function makeHarness(options = {}) {
  const attributes = new Map();
  const root = { dataset: {}, style: { colorScheme: '' } };
  const meta = {
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name); }
  };
  const values = new Map();
  const storage = {
    getItem(key) {
      if (options.readThrows) throw new Error('storage blocked');
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (options.writeThrows) throw new Error('storage blocked');
      values.set(key, value);
    }
  };
  if (Object.prototype.hasOwnProperty.call(options, 'stored')) values.set('prisma:theme', options.stored);
  const document = {
    documentElement: root,
    querySelector(selector) { return selector === 'meta[name="theme-color"]' ? meta : null; }
  };
  const window = { localStorage: storage };
  return { controller: createThemeController({ document, window }), root, meta, values };
}

{
  const h = makeHarness();
  assert.equal(h.controller.initialize(), 'dark', 'Sin preferencia se debe usar oscuro.');
  assert.equal(h.root.dataset.theme, 'dark');
  assert.equal(h.meta.getAttribute('content'), '#050505');
  assert.equal(h.values.has('prisma:theme'), false, 'El valor por defecto no debe escribir datos de perfil ni preferencia innecesaria.');
}

{
  const h = makeHarness({ stored: 'light' });
  assert.equal(h.controller.initialize(), 'light', 'Debe restaurarse la preferencia clara.');
  assert.equal(h.root.dataset.theme, 'light');
  assert.equal(h.meta.getAttribute('content'), '#f4f5f7');
  assert.equal(h.controller.setTheme('dark'), 'dark');
  assert.equal(h.values.get('prisma:theme'), 'dark');
  assert.equal(h.root.dataset.theme, 'dark');
  assert.equal(h.meta.getAttribute('content'), '#050505');
}

{
  const h = makeHarness({ stored: 'violet' });
  assert.equal(h.controller.initialize(), 'dark', 'Un valor inválido debe volver al modo oscuro.');
}

{
  const h = makeHarness({ readThrows: true, writeThrows: true });
  assert.equal(h.controller.initialize(), 'dark', 'Si localStorage falla, debe continuar en oscuro.');
  assert.equal(h.controller.setTheme('light'), 'light', 'La UI debe cambiar aunque no se pueda persistir.');
  assert.equal(h.root.dataset.theme, 'light');
}

console.log('Controlador de tema correcto: oscuro predeterminado, restauración, cambios y fallback de almacenamiento.');
