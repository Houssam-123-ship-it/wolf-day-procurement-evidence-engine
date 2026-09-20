# Decisions log — Track 1

## Why this process
We hand-computed our key totals first, but we labelled them as claims, not facts, until the kit's own validator script confirmed them — like double-checking your math with a calculator before you present it, not just trusting your first pass.

Every design decision we made is tied to an exact file and line number in the real data, not an assumption. If we can't point to the row that forced a decision, we don't make that decision — an unproven assumption is exactly what sinks a demo under questioning.

Before wiring anything into the existing app, we opened the actual screen files instead of guessing from folder names. Three of our four initial guesses turned out wrong on inspection — one was a slideshow, one was a demo catalog page. Checking first cost a few minutes; building on a wrong guess would have cost hours mid-build.

The AI/model layer is added last and is fully optional. The part that's actually graded — correct math, correct change-tracking, catching duplicates — is deterministic code with no AI in the loop. The AI only adds a plain-language summary afterward, so the app's correctness never depends on a model being available, fast, or even turned on.

## D0. The ingestion-version fixtures are never summed into the dashboard ledger
**Decision:** FR/HU/XK/IT records from `kit/dataset/ingestion-versions.json` and `update-lineage.json` are computed and displayed entirely separately from the 4,872-row canonical ledger (`transactions.json`). No code path adds their totals together.
**Why:** `DATASET.md:26` — "The smaller ingestion-version fixtures are an independent exercise with expected results. They are not already connected to the dashboard and must not be added to its ledger." `BRIEFING.md:23` — "Do not add the fixture totals to the dashboard ledger."
**How applied:** Phase 4 test 9 asserts the dashboard ledger total is bit-identical before and after FR/HU are applied; also stated out loud during the demo, not left implicit in code.

## D1. Approval binds to a record VERSION, not to "current data"
**Decision:** An approval stores the exact version id (source event id, e.g. `UPD-FR-002`) of every record it depends on, not a live reference to "the current row."
**Why:** This is the only design that lets a later correction automatically invalidate a stale approval without the app having to guess what changed. Any design that points an approval at "the current record" can't tell the difference between "still valid" and "silently overwritten." Verified in `kit/dataset/update-lineage.json:48-61` (`UPD-FR-002`) and `:33-46` (`UPD-HU-002`).
**How applied:** When an event changes a record's version, any approval referencing the old version flips to `stale` and is blocked from being treated as current until a human re-approves the new version.

## D2. Never key raw sheet rows by header name before resolving duplicates
**Decision:** Parse `input-sheets.json`/CSV rows by **column index** first, map index → canonical field explicitly, then discard.
**Why:** Verified in `kit/dataset/input-sheets/FR-v2--Sheet1.csv:1` (34 columns, header row 1 — matches `kit/dataset/input-schema.json:22-26`'s declared `"columns": 34, "headerRow": 1` for `FR-v2`, which also warns "repeated invoice totals... Sum line net, never repeated invoice totals"): `Currency` appears at columns 5 and 12, `Invoice` at columns 6 and 14, `Item` at columns 13 and 15, `Payer` at columns 23 and 34 — and columns 23/34 (both labelled `Payer`) hold *different* values (`Wolf France` vs `WOLF-PAYEUR-001`), so this isn't even a safe duplicate to collapse. Building a JS object via `Object.fromEntries(headers.zip(row))` silently drops the first occurrence of each duplicate key — data loss, not just a display bug.
**How applied:** Importer reads FR rows as index-addressed arrays against a hardcoded column map (`{4: 'invoiceTotal', 11: 'netValue', 21: 'invoiceTypeCode', 23: 'payerName', 34: 'payerCode', ...}`), never `row[headerName]`.

## D3. Sum `Net value` (col 11) per line; never sum `Invoice total` (col 4)
**Decision:** The per-line contribution to a finding is always `Net value`. `Invoice total` is read once per invoice group (for display/cross-check only), never accumulated across rows.
**Why:** Verified in `kit/dataset/input-sheets/FR-v2--Sheet1.csv:2-4`: all 3 rows of invoice `FAC-WOLF-0001` carry the identical `Invoice total = 953.04` (col 4). Summing that column across the group yields `2859.12` (953.04 × 3) — a 3x-inflated number. Summing `Net value` (col 11) for the same rows (`-11336.16 + 8727.84 + 3561.36`) correctly yields `953.04`, matching the true invoice total exactly once. Cross-checked against `kit/dataset/ingestion-versions.json` FR `current` array (`FR-LATEST-0001..0003`, same three net values), and against `input-schema.json:25`'s explicit warning for `FR-v2`.
**How applied:** Add a Phase 4 test asserting `sum(netValue for rows in invoice group) == invoiceTotal (read once)`, and a second test asserting the importer's per-invoice total is NOT `invoiceTotal × rowCount`.

## D4. Cancellation lines are reversals via `Invoice type code = CREDIT_NOTE`, not new floating negative rows
**Decision:** A `CREDIT_NOTE` row is applied as a reversal against the same product/site/invoice group, not stored as an independent transaction.
**Why:** Verified in `kit/dataset/input-sheets/FR-v2--Sheet1.csv:2-4,13`: `SITE-001` row 2 (col 21 `Invoice type code` = `CREDIT_NOTE`), qty `-226`, net `-11336.16`; rows 3-4 for the same site/invoice are positive `INVOICE` rows (`174`, `71` units). `SITE-004` row 13 is a second `CREDIT_NOTE` (qty `-297`, net `-13549.14`) reversing part of `FAC-WOLF-0004`. Cross-checked against `ingestion-versions.json` FR `current`: `FR-LATEST-0001` (qty `-226`) and `FR-LATEST-0012` (qty `-297`) carry the same negative values.
**How applied:** Importer tags rows by `Invoice type code`; `CREDIT_NOTE` rows reduce the running total for their `(siteCode, invoice, article)` key rather than being excluded or double-subtracted.

## D5. Replacement scope is declared by the event, never inferred from row overlap
**Decision:** Trust `update-lineage.json`'s `mode` + `scopeSupplierId` fields to determine what an incoming event may touch — FR's `sup-aster` scope, HU's `sup-orbit` scope — rather than diffing old/new rows to guess intent.
**Why:** Verified in `kit/dataset/update-lineage.json:48-61` (`UPD-FR-002`: `mode: "replace_supplier_subset"`, `scopeSupplierId: "sup-aster"`, `previousRows: 24 → incomingRows: 16 → currentRows: 24`) and `:33-46` (`UPD-HU-002`: `mode: "add_supplier"`, `scopeSupplierId: "sup-orbit"`, `previousRows: 24 → incomingRows: 24 → currentRows: 48`). These are structurally different operations with the same "rows changed" shape from a naive diff's point of view. Only the declared `mode`+`scope` distinguishes "replace this subset" from "append this addition" — a diff-based heuristic would risk conflating them, which is the exact judge question ("what if it's an addition?") the HU guard case is built to answer.
**How applied:** Apply-event logic switches on `mode`: `replace_supplier_subset` clears then rewrites only rows matching `scopeSupplierId`; `add_supplier` only inserts, never touches existing rows outside `scopeSupplierId`.

## Canonical typed record (design, Phase 3 will implement)
```
{
  productCode: string        // e.g. WLF-1008
  supplierId: string         // e.g. sup-aster
  siteCode: string           // e.g. SITE-001
  invoiceId: string          // e.g. FAC-WOLF-0001
  qty: number
  netValueEUR: number        // from "Net value", never "Invoice total"
  currency: string
  invoiceTypeCode: 'INVOICE' | 'CREDIT_NOTE'
  sourceFileId: string       // e.g. FR-v2--Sheet1.csv
  sourceRowRef: number       // raw row index for evidence display
  eventId: string            // e.g. UPD-FR-002, for lineage + idempotent replay
}
```

## Approval record (design)
```
{
  findingId: string
  approvedRecordVersions: string[]   // event ids this approval's evidence depends on
  status: 'approved' | 'stale'
  approvedBy: string
  approvedAt: string
}
```
