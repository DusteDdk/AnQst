import type { CdDraft } from 'anqst-generated/types';
import type { User } from '../../types/User';

const MIN_QINT64 = -(1n << 63n);
const MAX_QINT64 = (1n << 63n) - 1n;

export function createEmptyDraft(now = new Date()): CdDraft {
  const defaultUser: User = { name: '', meta: { friends: [] } };
  return {
    cdId: 0n,
    artist: '',
    albumTitle: '',
    releaseYear: now.getFullYear(),
    genre: 'Other',
    catalogNumber: '',
    barcode: '',
    tracks: [],
    notes: '',
    createdBy: defaultUser
  };
}

export function formatCdId(value: bigint): string {
  return value.toString();
}

export function parseCdIdInput(value: string): bigint | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = BigInt(trimmed);
    if (parsed < MIN_QINT64 || parsed > MAX_QINT64) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export { MAX_QINT64, MIN_QINT64 };
