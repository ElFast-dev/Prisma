import {
  analyzeSpectro,
  type SpectroAnalysis,
  type SpectroInput
} from "./spectro";
import {
  calculateSpectroAnalytics,
  type SpectroAnalytics,
  type SpectroAnalyticsInput
} from "./spectroAnalytics";

export interface SpectroWorkspaceInput {
  analysisInput: SpectroInput;
  analyticsInput: SpectroAnalyticsInput;
  cachedAnalysis?: SpectroAnalysis;
}

export interface SpectroWorkspaceResult {
  analysis: SpectroAnalysis;
  analytics: SpectroAnalytics;
}

/**
 * Calcula el espacio completo de Espectro fuera del hilo de interfaz cuando
 * se ejecuta dentro del Web Worker. Puede reutilizar el análisis versionado.
 */
export function calculateSpectroWorkspace(
  input: SpectroWorkspaceInput
): SpectroWorkspaceResult {
  return {
    analysis: input.cachedAnalysis ?? analyzeSpectro(input.analysisInput),
    analytics: calculateSpectroAnalytics(input.analyticsInput)
  };
}
