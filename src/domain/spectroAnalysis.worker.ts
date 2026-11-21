import { calculateSpectroWorkspace } from "./spectroWorkspace";
import type {
  SpectroAnalysisWorkerRequest,
  SpectroAnalysisWorkerResponse
} from "./spectroWorkerProtocol";

interface SpectroAnalysisWorkerScope {
  onmessage: ((event: MessageEvent<SpectroAnalysisWorkerRequest>) => void) | null;
  postMessage: (message: SpectroAnalysisWorkerResponse) => void;
}

const workerScope = self as unknown as SpectroAnalysisWorkerScope;

workerScope.onmessage = (event) => {
  try {
    const result = calculateSpectroWorkspace(event.data);
    workerScope.postMessage({ ok: true, result });
  } catch (cause) {
    workerScope.postMessage({
      ok: false,
      error: cause instanceof Error
        ? cause.message
        : "No se pudo completar el análisis de Espectro."
    });
  }
};
