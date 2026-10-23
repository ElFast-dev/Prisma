export function createStorageProtectionActions(ctx) {
  async function refreshStorageProtectionSnapshot() {
    ctx.storageProtectionSnapshot = await ctx.storageProtection.inspect();
    if (ctx.currentPage === "data") ctx.renderApp();
    return ctx.storageProtectionSnapshot;
  }

  async function requestStorageProtection() {
    if (ctx.storageProtectionBusy) return;
    ctx.storageProtectionBusy = true;

    try {
      // Start from the explicit user action, before rendering or the first await.
      const requestPromise = ctx.storageProtection.request(ctx.storageProtectionSnapshot);
      if (ctx.currentPage === "data") ctx.renderApp();

      const result = await requestPromise;
      ctx.storageProtectionSnapshot = result;
      if (result.granted) {
        ctx.toast(result.reason === "already-persistent"
          ? "El almacenamiento ya tenía persistencia concedida por el navegador."
          : "El navegador concedió persistencia para el almacenamiento de Prisma.");
      } else if (result.reason === "unsupported") {
        ctx.toast("Este navegador no permite solicitar persistencia del almacenamiento.", true);
      } else if (result.reason === "denied") {
        ctx.toast("El navegador no concedió persistencia. Prisma seguirá funcionando; exporta una copia de seguridad.", true);
      } else {
        ctx.toast("No se pudo confirmar la protección del almacenamiento. Exporta una copia de seguridad.", true);
      }
    } catch (_) {
      // A failed recovery inspection must not keep the action locked or erase
      // the last snapshot known to the application.
      try {
        ctx.storageProtectionSnapshot = await ctx.storageProtection.inspect();
      } catch (_) {
        // Keep the last known snapshot and still communicate the failure.
      }
      ctx.toast("No se pudo confirmar la protección del almacenamiento. Exporta una copia de seguridad.", true);
    } finally {
      ctx.storageProtectionBusy = false;
      if (ctx.currentPage === "data") ctx.renderApp();
    }
  }

  return { refreshStorageProtectionSnapshot, requestStorageProtection };
}
