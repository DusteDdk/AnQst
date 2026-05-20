import { ANQST_WEBBASE_ABI_HASH_STAMP } from "./abi-hash-stamp";

let resolvedLocalStamp: string | undefined;

function isValidAbiHashStamp(value: string): boolean {
  return /^_[A-Za-z0-9_]+$/.test(value);
}

function resolveLocalAbiHashStamp(): string {
  if (!resolvedLocalStamp) {
    resolvedLocalStamp = `_local_${Math.floor(Date.now() / 1000)}`;
  }
  return resolvedLocalStamp;
}

export function resolveAnQstWebBaseAbiHashStamp(): string {
  const fromEnv = process.env.ANQST_WEBBASE_ABI_HASH_STAMP?.trim();
  if (fromEnv && isValidAbiHashStamp(fromEnv)) {
    return fromEnv;
  }

  const generated = ANQST_WEBBASE_ABI_HASH_STAMP.trim();
  if (generated && generated !== "_local_0" && isValidAbiHashStamp(generated)) {
    return generated;
  }

  return resolveLocalAbiHashStamp();
}

export function anqstWebBaseTargetName(stamp = resolveAnQstWebBaseAbiHashStamp()): string {
  return `anqstwebhost${stamp}`;
}

export function anqstWebBaseNamespaceName(stamp = resolveAnQstWebBaseAbiHashStamp()): string {
  return `anqstwebbase${stamp}`;
}
