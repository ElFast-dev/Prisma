import type { SpectroWorkspaceInput, SpectroWorkspaceResult } from "./spectroWorkspace";

export type SpectroAnalysisWorkerResponse =
  | { ok: true; result: SpectroWorkspaceResult }
  | { ok: false; error: string };

export type SpectroAnalysisWorkerRequest = SpectroWorkspaceInput;
