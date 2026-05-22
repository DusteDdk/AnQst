import { ANQST_WEBBASE_ABI_STAMP } from "./abi-hash-stamp";

function cppIdentifierSuffix(stamp: string): string {
  return stamp.replace(/[^A-Za-z0-9_]/g, "_");
}

export function anqstWebBaseAbiStamp(): string {
  return ANQST_WEBBASE_ABI_STAMP;
}

export function anqstWebBaseTargetName(stamp = anqstWebBaseAbiStamp()): string {
  return `anqstwebhost${stamp}`;
}

export function anqstWebBaseNamespaceName(stamp = anqstWebBaseAbiStamp()): string {
  return `anqstwebbase${cppIdentifierSuffix(stamp)}`;
}
