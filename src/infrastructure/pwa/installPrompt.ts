export interface PwaInstallChoice {
  outcome: "accepted" | "dismissed";
  platform: string;
}

export interface PwaInstallPromptEvent extends Event {
  prompt(): Promise<PwaInstallChoice>;
}

export interface PwaInstallState {
  installed: boolean;
  canPrompt: boolean;
}

let deferredPrompt: PwaInstallPromptEvent | null = null;
let installed = typeof window !== "undefined" && isRunningStandalone();
const listeners = new Set<(state: PwaInstallState) => void>();

function isRunningStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const standaloneDisplay = window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneDisplay || iosStandalone;
}

function getState(): PwaInstallState {
  installed = installed || isRunningStandalone();
  return { installed, canPrompt: deferredPrompt !== null };
}

function publishState(): void {
  const state = getState();
  for (const listener of listeners) listener(state);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as PwaInstallPromptEvent;
    publishState();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    publishState();
  });

  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", () => {
    if (isRunningStandalone()) {
      installed = true;
      deferredPrompt = null;
    }
    publishState();
  });
}

export function getPwaInstallState(): PwaInstallState {
  return getState();
}

export function subscribeToPwaInstallState(listener: (state: PwaInstallState) => void): () => void {
  listeners.add(listener);
  listener(getState());
  return () => listeners.delete(listener);
}

export async function promptPwaInstall(): Promise<PwaInstallChoice["outcome"] | null> {
  const prompt = deferredPrompt;
  if (!prompt) return null;

  // A browser install event can be used only once.
  deferredPrompt = null;
  publishState();

  const result = await prompt.prompt();
  if (result.outcome === "accepted") installed = true;
  publishState();
  return result.outcome;
}
