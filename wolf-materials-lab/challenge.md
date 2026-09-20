# Challenge brief — Track 1: Procurement evidence engine

## Client
Fictional luxury automotive group. Procurement buys bodywork/paint consumables across multiple markets (29 countries, 10 suppliers, 21 core reference parts / 106 catalogue parts).

## Situation
Procurement decisions are made from supplier spreadsheets/invoices that keep changing: late corrections, market-wide replacements, new supplier additions, and partial repairs of a previously broken file. Nothing today tracks whether a purchasing decision's underlying evidence is still current after a new file arrives.

## Users
The buyer/procurement reviewer, who must decide what can be approved now and defend that decision if the evidence changes later.

## Candidate pain (one sentence)
A buyer approves a purchasing finding, a corrected or replacing supplier file arrives afterward, and nobody can tell whether the approval is still valid, which records it touches, or whether replaying the same update twice silently double-counts.

## Buyer decision (this exercise)
Approve the FR paint-consumables award for supplier `sup-aster`. This approval must automatically go **stale** when the FR correction (`UPD-FR-002`) arrives, and must **not** be affected at all by an unrelated addition such as HU (`UPD-HU-002`).

## The two proof cases

### Primary case — FR (`UPD-FR-002`), mode `replace_supplier_subset`
- Scope: `scopeSupplierId: sup-aster`
- `previousRows: 24` → `incomingRows: 16` → `currentRows: 24`
- Proves: correct handling of a scoped replacement, separating an invoice header total from true per-line amounts, and applying cancellation lines as reversals rather than new floating rows. This is the hardest arithmetic trap in the kit.

### Guard case — HU (`UPD-HU-002`), mode `add_supplier`
- Scope: `scopeSupplierId: sup-orbit`
- `previousRows: 24` → `incomingRows: 24` → `currentRows: 48`
- Proves: the importer does **not** treat every incoming file as "replace everything." HU must append `sup-orbit`'s 24 rows on top of the existing 24 rows without touching or replacing any of them. This directly answers the judge question "what if it's an addition, not a replacement?"

## Current workflow (today, manual)
1. Buyer receives a supplier spreadsheet/invoice file.
2. Buyer (or a script) manually reconciles it against prior data.
3. Buyer approves a purchasing recommendation based on the current snapshot.
4. A later file arrives (correction, replacement, addition, repair) — no system flags which prior approvals it affects.
5. Buyer has no reliable way to know if last week's approval is still safe to act on.

## Observed pain points
- No link between an approval and the specific data *version* it was based on.
- No detection of which records a new file actually affects (scope confusion: replacement vs. addition vs. repair).
- No protection against replaying the same update event twice (double-counting risk).
- No separation between an invoice's header total and true line-item amounts.
- No distinction between a scoped replacement and a full-ledger overwrite.

## Constraints
- **Boundary (critical, must be stated in the demo, not just enforced in code):** the versioned ingestion fixtures (`kit/dataset/ingestion-versions.json`, `update-lineage.json`, `input-sheets.json`) are a separate exercise from the clean 4,872-row dashboard ledger (`transactions.json`). They are never summed into the dashboard ledger. (Source: `DATASET.md:26`, `BRIEFING.md:23`.)
- Time: solo builder, one day, ~5h30 effective build time.
- No authentication/persistence/approval-enforcement infrastructure exists yet in the starter kit — this exercise adds it narrowly for the FR/HU cases only.
- Reuse the existing frontend adapters/components (`frontend/src/data/`, `COMPONENTS.md`) — do not build new UI chrome.

## Hypothesis
We believe that a purchasing decision becomes trustworthy only if it is bound to a specific evidence version, so that any later correction to that evidence automatically and visibly invalidates the decision until a human re-reviews it.

## AI opportunity
Automate the detection of *which* records a new source file affects (replacement vs. addition vs. repair scope), recompute the affected finding, and flag dependent approvals as stale — while keeping the human as the final approver of any new version.

## Success criteria
The prototype demonstrates, end to end, in the existing frontend:
1. FR: a scoped replacement correctly recomputes only `sup-aster`'s records, handles the header-total/line-value distinction and cancellation reversal correctly, and matches the `FR-v2` expected-current fixture exactly.
2. HU: an addition appends `sup-orbit`'s records without altering or replacing any of the original 24 rows.
3. An approval built on FR's old version flips to `stale` when `UPD-FR-002` is applied.
4. Replaying `UPD-FR-002` a second time produces identical totals — no double counting.
5. The dashboard ledger total is never affected by either fixture.

## Unknowns
- Exact UI screen(s) to extend for showing "stale" state (to confirm against `COMPONENTS.md`'s review/comparison screens).
- Whether time allows adding one adversarial case beyond FR/HU (e.g. currency mismatch or missing source) before freeze.
- Whether a host-configured model endpoint will be available, or the demo runs entirely in deterministic/demo mode.
