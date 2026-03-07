import { astBackend } from "./ast";
import { tscBackend } from "./tsc";
import type { BackendId, GeneratorBackend } from "./types";

const backends: Record<BackendId, GeneratorBackend> = {
  ast: astBackend,
  tsc: tscBackend
};

export function resolveBackend(backendId: BackendId): GeneratorBackend {
  return backends[backendId];
}

export function isBackendId(value: string): value is BackendId {
  return value === "ast" || value === "tsc";
}
