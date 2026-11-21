import { analyzeSpectro, type SpectroInput } from "./spectro";
import type { SpectroAnalysisWorkerResponse } from "./spectroWorkerProtocol";

interface SpectroAnalysisWorkerScope {
  onmessage: ((event: MessageEvent<SpectroInput>) => void) | null;
  postMessage: (message: SpectroAnalysisWorkerResponse) => void;
}

const workerScope = self as unknown as SpectroAnalysisWorkerScope;

workerScope.onmessage = (event) => {
  try {
    const analysis = analyzeSpectro(event.data);
    workerScope.postMessage({ ok: true, analysis });
  } catch (cause) {
    workerScope.postMessage({
      ok: false,
      error: cause instanceof Error
        ? cause.message
        : "No se pudo completar el análisis de Espectro."
    });
  }
};
