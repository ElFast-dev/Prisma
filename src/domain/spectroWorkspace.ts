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
  /** Solo se envía al trabajador cuando no existe una instantánea válida. */
  analysisInput?: SpectroInput;
  analyticsInput: SpectroAnalyticsInput;
}

export interface SpectroWorkspaceCalculation {
  analysis?: SpectroAnalysis;
  analytics: SpectroAnalytics;
}

export interface SpectroWorkspaceResult {
  analysis: SpectroAnalysis;
  analytics: SpectroAnalytics;
}

/**
 * Calcula el espacio completo de Espectro fuera del hilo de interfaz cuando
 * se ejecuta dentro del Web Worker. La instantánea de análisis se puede omitir
 * si la capa local ya dispone de una copia versionada y válida.
 */
export function calculateSpectroWorkspace(
  input: SpectroWorkspaceInput
): SpectroWorkspaceCalculation {
  return {
    ...(input.analysisInput ? { analysis: analyzeSpectro(input.analysisInput) } : {}),
    analytics: calculateSpectroAnalytics(input.analyticsInput)
  };
}
