// Track 1 evidence adapter for the FR primary case (UPD-FR-002).
// Hand-authored from kit/dataset/update-lineage.json, ingestion-versions.json
// and kit/dataset/input-sheets/FR-v2--Sheet1.csv, verified by
// scripts/verify_fr_import.py. This file is NOT generator-owned (unlike
// src/data/nullmessung.ts) — it is a new, separate adapter per
// COMPONENTS.md's "Extension pattern" and is safe to hand-edit.

export type FrEvidenceRow = {
  siteCode: string;
  invoice: string;
  article: string;
  description: string;
  qty: number;
  netValueEUR: number;
  invoiceTypeCode: 'INVOICE' | 'CREDIT_NOTE';
  payerName: string; // raw sheet column 23
  payerCode: string; // raw sheet column 34 - same header text, different value
  sourceFile: string;
  sourceRow: number; // 1-based row number in FR-v2--Sheet1.csv, header excluded
};

export type FrEventMeta = {
  id: string;
  market: string;
  mode: string;
  scopeSupplierId: string;
  previousRows: number;
  incomingRows: number;
  currentRows: number;
  effectiveDate: string;
};

export const frEvent: FrEventMeta = {
  id: 'UPD-FR-002',
  market: 'FR',
  mode: 'replace_supplier_subset',
  scopeSupplierId: 'sup-aster',
  previousRows: 24,
  incomingRows: 16,
  currentRows: 24,
  effectiveDate: '2026-09-01',
};

// The 16 sup-aster rows introduced by UPD-FR-002 (FR-LATEST-0001..0016).
export const frIncomingRows: FrEvidenceRow[] = [
  { siteCode: 'SITE-001', invoice: 'FAC-WOLF-0001', article: 'WLF-1008', description: 'Paint cup for compressed-air spray gun', qty: -226, netValueEUR: -11336.16, invoiceTypeCode: 'CREDIT_NOTE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 1 },
  { siteCode: 'SITE-001', invoice: 'FAC-WOLF-0001', article: 'WLF-1008', description: 'Paint cup for compressed-air spray gun', qty: 174, netValueEUR: 8727.84, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 2 },
  { siteCode: 'SITE-001', invoice: 'FAC-WOLF-0001', article: 'WLF-1008', description: 'Paint cup for compressed-air spray gun', qty: 71, netValueEUR: 3561.36, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 3 },
  { siteCode: 'SITE-002', invoice: 'FAC-WOLF-0002', article: 'WLF-1008', description: 'Paint cup for compressed-air spray gun', qty: 176, netValueEUR: 8828.16, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 4 },
  { siteCode: 'SITE-002', invoice: 'FAC-WOLF-0002', article: 'WLF-1008', description: 'Paint cup for compressed-air spray gun', qty: 181, netValueEUR: 9078.96, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 5 },
  { siteCode: 'SITE-002', invoice: 'FAC-WOLF-0002', article: 'WLF-1008', description: 'Paint cup for compressed-air spray gun', qty: 312, netValueEUR: 15649.92, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 6 },
  { siteCode: 'SITE-003', invoice: 'FAC-WOLF-0003', article: 'WLF-1008', description: 'Paint cup for compressed-air spray gun', qty: 122, netValueEUR: 6119.52, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 7 },
  { siteCode: 'SITE-003', invoice: 'FAC-WOLF-0003', article: 'WLF-1008', description: 'Paint cup for compressed-air spray gun', qty: 122, netValueEUR: 6119.52, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 8 },
  { siteCode: 'SITE-003', invoice: 'FAC-WOLF-0003', article: 'WLF-1018', description: 'One-step cutting and polishing compound', qty: 33, netValueEUR: 1505.46, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 9 },
  { siteCode: 'SITE-004', invoice: 'FAC-WOLF-0004', article: 'WLF-1018', description: 'One-step cutting and polishing compound', qty: 293, netValueEUR: 13366.66, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 10 },
  { siteCode: 'SITE-004', invoice: 'FAC-WOLF-0004', article: 'WLF-1018', description: 'One-step cutting and polishing compound', qty: 124, netValueEUR: 5656.88, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 11 },
  { siteCode: 'SITE-004', invoice: 'FAC-WOLF-0004', article: 'WLF-1018', description: 'One-step cutting and polishing compound', qty: -297, netValueEUR: -13549.14, invoiceTypeCode: 'CREDIT_NOTE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 12 },
  { siteCode: 'SITE-005', invoice: 'FAC-WOLF-0005', article: 'WLF-1018', description: 'One-step cutting and polishing compound', qty: 29, netValueEUR: 1322.98, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 13 },
  { siteCode: 'SITE-005', invoice: 'FAC-WOLF-0005', article: 'WLF-1018', description: 'One-step cutting and polishing compound', qty: 220, netValueEUR: 10036.40, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 14 },
  { siteCode: 'SITE-005', invoice: 'FAC-WOLF-0005', article: 'WLF-1018', description: 'One-step cutting and polishing compound', qty: 310, netValueEUR: 14142.20, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 15 },
  { siteCode: 'SITE-006', invoice: 'FAC-WOLF-0006', article: 'WLF-1018', description: 'One-step cutting and polishing compound', qty: 256, netValueEUR: 11678.72, invoiceTypeCode: 'INVOICE', payerName: 'Wolf France', payerCode: 'WOLF-PAYEUR-001', sourceFile: 'FR-v2--Sheet1.csv', sourceRow: 16 },
];

export const frIncomingTotalEUR = frIncomingRows.reduce((s, r) => s + r.netValueEUR, 0);

// Pre-correction total for the whole FR market (24 rows: 16 sup-aster +
// 8 sup-novex), computed directly from ingestion-versions.json FR `v1`
// (not hand-summed): 171,941.83 EUR. Used only for explainer narration
// ("old total X") - never fed into any approval/stale/replay logic above.
export const frOldTotalEUR = 171941.83;

// sup-novex rows (FR-UNCHANGED-0001..0008) are out of scope for UPD-FR-002
// and must remain byte-identical - verified read-only, not re-typed here
// since this panel only needs to prove the sup-aster (in-scope) finding.
export const frOutOfScopeRowCount = 8;
export const frCurrentTotalRows = frOutOfScopeRowCount + frIncomingRows.length; // 24

// --- Step 5: stale-approval rule demo data ---
//
// UPD-FR-003-demo is NOT a kit fixture. It is a locally simulated "next
// correction" used only to prove the stale-approval rule (D1): a change to
// sup-aster's data after approval must flip that approval to stale, while
// leaving an unrelated (sup-novex) approval untouched. Idempotent replay of
// the *same* event (UPD-FR-002) and the HU guard case are step 6, not here.
export type FrVersionedRowSet = { eventId: string; rows: FrEvidenceRow[] };

export const frVersionV1: FrVersionedRowSet = { eventId: frEvent.id, rows: frIncomingRows };

export const frVersionV2: FrVersionedRowSet = {
  eventId: 'UPD-FR-003-demo',
  rows: frIncomingRows.map((r) =>
    r.sourceRow === 2 ? { ...r, netValueEUR: 7830.0 } : r
  ),
};

export const frVersionV2ChangeNote =
  "Simulated correction (demo): FAC-WOLF-0001 row 2 net value corrected from 8,727.84 EUR to 7,830.00 EUR.";

// sup-novex baseline finding: out of scope for both UPD-FR-002 and the
// simulated UPD-FR-003-demo. Hand-summed from FR-UNCHANGED-0001..0008 in
// kit/dataset/ingestion-versions.json FR `current` (2,475.64 + 503.52 +
// 2,895.24 + 6,503.80 + 2,853.28 + 5,811.46 + 2,580.54 + 2,014.08).
export const frNovexFinding = {
  id: 'FR-NOVEX-BASELINE',
  supplierId: 'sup-novex',
  rowCount: frOutOfScopeRowCount,
  totalEUR: 25637.56,
};
