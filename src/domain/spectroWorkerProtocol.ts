import type { SpectroAnalysis } from "./spectro";

export type SpectroAnalysisWorkerResponse =
  | { ok: true; analysis: SpectroAnalysis }
  | { ok: false; error: string };
