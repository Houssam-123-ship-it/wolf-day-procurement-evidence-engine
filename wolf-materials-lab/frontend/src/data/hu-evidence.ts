// Track 1 evidence adapter for the HU guard case (UPD-HU-002, add_supplier).
// Hand-authored, read-only narration data - no import/apply logic lives
// here (that is proven separately by scripts/verify_replay_and_hu.py).
// Totals computed directly from kit/dataset/ingestion-versions.json HU
// v1/v2/current arrays (not hand-summed): v1 196,890.50 + v2 192,224.11 =
// current 389,114.61 EUR, cross-checked against the file's own `current`
// array total.

export type HuEventMeta = {
  id: string;
  market: string;
  mode: string;
  scopeSupplierId: string;
  previousRows: number;
  incomingRows: number;
  currentRows: number;
  effectiveDate: string;
};

export const huEvent: HuEventMeta = {
  id: 'UPD-HU-002',
  market: 'HU',
  mode: 'add_supplier',
  scopeSupplierId: 'sup-orbit',
  previousRows: 24,
  incomingRows: 24,
  currentRows: 48,
  effectiveDate: '2026-09-01',
};

export const huAsterTotalEUR = 196890.5; // sup-aster, 24 original rows, untouched
export const huOrbitTotalEUR = 192224.11; // sup-orbit, 24 appended rows
export const huCurrentTotalEUR = 389114.61; // 48 rows, matches ingestion-versions.json HU `current`
export const huFxRateHUFPerEUR = 394; // kit/dataset/fx-rates.json "HUF": 394
