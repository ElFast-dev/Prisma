import assert from 'node:assert/strict';
import { createTMDBSettingsActions } from '../js/tmdb/settings-actions.js';
import { normalizeCredential } from '../js/tmdb/client.js';

function createHarness(options = {}) {
  const input = { value: options.inputValue ?? 'synthetic-read-token' };
  const kindControl = { value: options.kind ?? 'readToken' };
  const toasts = [];
  const persisted = [];
  const requests = [];
  const pageLoads = [];
  let renderCount = 0;
  let tmdbResults = [{ id: 'cached-fixture' }];
  let recommendationCandidates = [{ id: 'candidate-fixture' }];
  let resetGenresCount = 0;
  let confirmCalls = 0;
  let confirmMessage = '';

  const ctx = {
    tmdbCredential: options.savedCredential ?? null,
    get tmdbResults() { return tmdbResults; },
    set tmdbResults(value) { tmdbResults = value; },
    get recommendationCandidates() { return recommendationCandidates; },
    set recommendationCandidates(value) { recommendationCandidates = value; },
    resetTMDBGenres() { resetGenresCount += 1; },
    confirm(message) {
      confirmCalls += 1;
      confirmMessage = message;
      return options.confirmResult ?? true;
    },
    TMDB_CREDENTIAL_KEY: 'tmdbCredential',
    currentPage: options.currentPage ?? 'home',
    catalogQuery: options.catalogQuery ?? '',
    $(selector) {
      if (selector === '#tmdbCredentialInput') return input;
      if (selector === '#tmdbAuthType') return kindControl;
      return null;
    },
    normalizeCredential,
    async dbSet(key, value) { persisted.push({ key, value }); },
    renderApp() { renderCount += 1; },
    toast(message, isError = false) { toasts.push({ message, isError }); },
    async tmdbRequest(path, params, credential) {
      requests.push({ path, params, credential });
      if (options.requestError) throw options.requestError;
      return { images: {} };
    },
    async loadTMDBPage(...args) { pageLoads.push(args); }
  };

  return {
    actions: createTMDBSettingsActions(ctx),
    ctx,
    input,
    toasts,
    persisted,
    requests,
    pageLoads,
    get renderCount() { return renderCount; },
    get tmdbResults() { return tmdbResults; },
    get recommendationCandidates() { return recommendationCandidates; },
    get resetGenresCount() { return resetGenresCount; },
    get confirmCalls() { return confirmCalls; },
    get confirmMessage() { return confirmMessage; }
  };
}

// Una respuesta válida debe seguir mostrando éxito después de persistir la credencial.
{
  const harness = createHarness();
  await harness.actions.testTMDBCredential();
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.requests[0].path, '/configuration');
  assert.deepEqual(harness.requests[0].credential, {
    kind: 'readToken',
    value: 'synthetic-read-token'
  });
  assert.equal(harness.ctx.tmdbCredential.value, 'synthetic-read-token');
  assert.equal(harness.persisted.length, 1);
  assert.equal(harness.persisted[0].key, 'tmdbCredential');
  assert.equal(harness.toasts.filter(toast => toast.message.includes('Conexión con TMDB correcta')).length, 1);
  assert.equal(harness.toasts.some(toast => toast.isError), false, 'El éxito no debe convertirse en error por dependencias ausentes');
  assert.equal(harness.input.value, '');
  assert.equal(harness.renderCount, 1);
  assert.deepEqual(harness.pageLoads, []);
}

// En Descubrir, una prueba válida debe disparar una nueva búsqueda con la consulta activa.
{
  const harness = createHarness({ currentPage: 'catalog', catalogQuery: 'Dune' });
  await harness.actions.testTMDBCredential();
  assert.deepEqual(harness.pageLoads, [[1, 'search', false]]);
  assert.equal(harness.toasts.some(toast => toast.isError), false);
}

// En Descubrir sin texto, la prueba válida debe cargar la lista popular.
{
  const harness = createHarness({ currentPage: 'catalog', catalogQuery: ' ' });
  await harness.actions.testTMDBCredential();
  assert.deepEqual(harness.pageLoads, [[1, 'popular', false]]);
}

// Un fallo real de autenticación debe mostrarse sin guardar una credencial que no ha pasado la prueba.
{
  const harness = createHarness({ requestError: new Error('TMDB rechazó la credencial (401).') });
  await harness.actions.testTMDBCredential();
  assert.equal(harness.ctx.tmdbCredential, null);
  assert.equal(harness.persisted.length, 0);
  assert.equal(harness.renderCount, 0);
  assert.equal(harness.toasts.some(toast => toast.message.includes('Conexión con TMDB correcta')), false);
  assert.equal(harness.toasts.at(-1).isError, true);
  assert.match(harness.toasts.at(-1).message, /401/);
}

// La desconexión elimina la credencial, vacía los resultados y reinicia la caché con dependencias inyectadas.
{
  const harness = createHarness({
    savedCredential: { kind: 'readToken', value: 'previous-synthetic-token' }
  });
  await harness.actions.removeTMDBCredential();
  assert.equal(harness.confirmCalls, 1);
  assert.match(harness.confirmMessage, /Eliminar la credencial de TMDB/);
  assert.equal(harness.ctx.tmdbCredential, null);
  assert.deepEqual(harness.persisted, [{ key: 'tmdbCredential', value: null }]);
  assert.deepEqual(harness.tmdbResults, []);
  assert.deepEqual(harness.recommendationCandidates, [], 'Desconectar TMDB también debe borrar el pool efímero de recomendaciones.');
  assert.equal(harness.resetGenresCount, 1);
  assert.equal(harness.renderCount, 1);
  assert.equal(harness.toasts.at(-1).message, 'Credencial eliminada de este navegador.');
  assert.equal(harness.toasts.at(-1).isError, false);
}

// Cancelar la confirmación no debe alterar la credencial ni la caché.
{
  const savedCredential = { kind: 'readToken', value: 'keep-synthetic-token' };
  const harness = createHarness({ savedCredential, confirmResult: false });
  await harness.actions.removeTMDBCredential();
  assert.equal(harness.ctx.tmdbCredential, savedCredential);
  assert.equal(harness.persisted.length, 0);
  assert.deepEqual(harness.tmdbResults, [{ id: 'cached-fixture' }]);
  assert.deepEqual(harness.recommendationCandidates, [{ id: 'candidate-fixture' }], 'Cancelar no debe borrar las candidatas activas.');
  assert.equal(harness.resetGenresCount, 0);
  assert.equal(harness.renderCount, 0);
  assert.equal(harness.toasts.length, 0);
}

console.log('Acciones TMDB correctas: conexión, búsqueda, lista popular, errores y eliminación/cancelación de credencial.');
