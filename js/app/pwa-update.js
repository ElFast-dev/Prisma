export function createPWAUpdateController(dependencies) {
  const getServiceWorker = dependencies.getServiceWorker;
  const getWindow = dependencies.getWindow;
  const getToastRoot = dependencies.getToastRoot;
  let currentController = null;
  let listenerRegistered = false;

  function showReloadNotice() {
    const root = getToastRoot();
    if (!root || !root.ownerDocument || (root.querySelector && root.querySelector("[data-pwa-update-notice]"))) return;
    const document = root.ownerDocument;
    const node = document.createElement("div");
    node.className = "toast pwa-update-toast";
    node.setAttribute("data-pwa-update-notice", "true");
    node.setAttribute("role", "status");
    const message = document.createElement("span");
    message.textContent = "Prisma se ha actualizado. Recarga para aplicar los cambios.";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-secondary btn-small";
    button.textContent = "Recargar";
    button.setAttribute("aria-label", "Recargar Prisma y aplicar la actualización");
    button.addEventListener("click", function () {
      const window = getWindow();
      if (window && window.location && typeof window.location.reload === "function") window.location.reload();
    });
    node.appendChild(message);
    node.appendChild(button);
    root.appendChild(node);
  }

  function onControllerChange() {
    const serviceWorker = getServiceWorker();
    const nextController = serviceWorker && serviceWorker.controller;
    if (!nextController) return;
    if (!currentController) { currentController = nextController; return; }
    if (nextController === currentController) return;
    currentController = nextController;
    showReloadNotice();
  }

  async function register() {
    const serviceWorker = getServiceWorker();
    const window = getWindow();
    if (!serviceWorker || !window || !window.isSecureContext || typeof serviceWorker.register !== "function") return null;
    currentController = serviceWorker.controller || null;
    if (!listenerRegistered && typeof serviceWorker.addEventListener === "function") {
      serviceWorker.addEventListener("controllerchange", onControllerChange);
      listenerRegistered = true;
    }
    let registration;
    try { registration = await serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" }); }
    catch (_) { return null; }
    if (registration && typeof registration.update === "function") {
      try { await registration.update(); } catch (_) {
        // Prisma sigue funcionando aunque no haya conexión para comprobar una actualización.
      }
    }
    return registration || null;
  }

  return { register };
}
