export function createAppRuntime(ctx) {
  function logEvent(title, description, symbol) {
    ctx.state.events.unshift({ title: title, description: description, symbol: symbol || "✦", at: new Date().toISOString() });
    ctx.state.events = ctx.state.events.slice(0, 80);
    ctx.state.updatedAt = new Date().toISOString();
    persistState();
  }

  async function persistState() {
    try { await ctx.dbSet(ctx.STATE_KEY, ctx.state); }
    catch (error) { toast("No pude guardar los datos. Exporta una copia de seguridad.", true); }
  }

  function toast(message, isError) {
    const root = ctx.$("#toastRoot");
    if (!root) return;
    const node = ctx.document.createElement("div");
    node.className = "toast" + (isError ? " error" : "");
    node.textContent = message;
    root.appendChild(node);
    ctx.window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 3600);
  }

  return { logEvent, persistState, toast };
}
