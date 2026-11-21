import type { SpectroWorkspaceCalculation, SpectroWorkspaceInput } from "./spectroWorkspace";

export type SpectroAnalysisWorkerResponse =
  | { ok: true; result: SpectroWorkspaceCalculation }
  | { ok: false; error: string };

export type SpectroAnalysisWorkerRequest = SpectroWorkspaceInput;
