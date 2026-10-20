export function createTMDBSettingsActions(ctx) {
  async function saveTMDBCredential() {
    const input = ctx.$("#tmdbCredentialInput");
    const kindControl = ctx.$("#tmdbAuthType");
    const typed = input ? input.value.trim() : "";
    if (!typed && !ctx.tmdbCredential) {
      ctx.toast("Pega tu token de lectura o clave API v3 primero.", true);
      return;
    }
    if (typed) {
      ctx.tmdbCredential = ctx.normalizeCredential(typed, kindControl ? kindControl.value : "readToken");
      await ctx.dbSet(ctx.TMDB_CREDENTIAL_KEY, ctx.tmdbCredential);
    } else if (kindControl && ctx.tmdbCredential.kind !== kindControl.value) {
      ctx.toast("Para cambiar el tipo de credencial, vuelve a pegarla antes de guardar.", true);
      return;
    }
    if (input) input.value = "";
    ctx.renderApp();
    ctx.toast("Credencial guardada solo en este navegador. No se incluirá en respaldos ni en GitHub.");
  }

  async function testTMDBCredential() {
    const input = ctx.$("#tmdbCredentialInput");
    const kindControl = ctx.$("#tmdbAuthType");
    const candidate = ctx.normalizeCredential(input && input.value.trim(), kindControl ? kindControl.value : "readToken") || ctx.tmdbCredential;
    if (!candidate || !candidate.value) {
      ctx.toast("Pega tu credencial o guárdala en este navegador primero.", true);
      return;
    }
    ctx.toast("Probando conexión con TMDB…");
    try {
      await ctx.tmdbRequest("/configuration", {}, candidate);
      ctx.tmdbCredential = candidate;
      await ctx.dbSet(ctx.TMDB_CREDENTIAL_KEY, ctx.tmdbCredential);
      if (input) input.value = "";
      ctx.renderApp();
      ctx.toast("Conexión con TMDB correcta. Ya puedes buscar películas.");
      if (currentPage === "catalog") loadTMDBPage(1, catalogQuery.trim().length >= 2 ? "search" : "popular", false);
    } catch (error) {
      ctx.toast(error.message || "No se pudo conectar con TMDB.", true);
    }
  }

  async function removeTMDBCredential() {
    if (!window.confirm("¿Eliminar la credencial de TMDB guardada en este navegador?")) return;
    ctx.tmdbCredential = null;
    await ctx.dbSet(ctx.TMDB_CREDENTIAL_KEY, null);
    tmdbResults = [];
    tmdbClient.resetGenres();
    ctx.renderApp();
    ctx.toast("Credencial eliminada de este navegador.");
  }

  return { saveTMDBCredential, testTMDBCredential, removeTMDBCredential };
}
