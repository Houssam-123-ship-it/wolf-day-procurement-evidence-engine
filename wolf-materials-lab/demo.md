# Demo script — Track 1 (Procurement evidence engine)

## Clean run (confirmed working)
```bash
cd wolf-materials-lab/frontend
npm ci
npm run dev
```
Open `http://127.0.0.1:8084/dashboard/nullmessung`. Scroll to the card **"Track 1: FR evidence engine (UPD-FR-002)"**.

(Optional, not required for the demo: `PYTHONUTF8=1 python kit/scripts/package.py` rebuilds the download bundles — see `docs/production.md` for the Windows-locale note.)

## Spoken line — say this out loud during the demo, don't skip it
> "The versioned FR and HU fixtures you're about to see are a separate exercise from the main 4,872-row dashboard ledger. We never add their totals into that ledger — that boundary is enforced in code and confirmed by our own test log."
(Source: `DATASET.md:26`, `BRIEFING.md:23`, `decisions.md` D0.)

## Happy path (rehearse until it needs no notes)

1. **Old finding.** Point at the "Track 1" card. Version label reads `UPD-FR-002`, total shown is 116,546.84 € across 16 in-scope rows (sup-aster).
2. **FR incoming file → recomputed finding.** Click **Approve FR finding**. Button turns grey, green "Approved locally" tag appears.
3. **Correction arrives.** Click **Simulate corrected event (demo)**. A yellow banner explains the correction; one table row highlights with the corrected value.
4. **Stale + blocked.** Point at the approve button — now a disabled red **"Stale — blocked, re-review required"**, plus a red `STALE` tag. Say: "The system caught that the evidence behind our approval changed, and locked it before anyone could act on stale numbers."
5. **Buyer corrects, re-approves.** Click **Reset to UPD-FR-002** (returns to baseline state, ready to approve the new version in a real flow).
6. **Result stored / isolation check.** Point at the separate "Unrelated approval" row (`sup-novex baseline`) — click **Approve sup-novex baseline**, then repeat steps 2-4 again to show it stays green throughout, proving the stale rule only affects what actually changed.

## Graceful failure to show (don't hide it)

Run, live in front of the judges:
```bash
python scripts/verify_phase4_close.py
```
Point at the **Test 8** block — three adversarial mutations (wrong scope, currency mismatch, missing source reference), each raising a visible exception instead of silently applying. Say: "This is what a wrong or corrupted source file does in our system — it stops and tells you why, it doesn't guess."

## Baseline evaluation evidence

- `scripts/verify_fr_import.py` — proves the header-total trap and payer-column duplicate-header trap, against the real raw CSV.
- `scripts/verify_replay_and_hu.py` — proves idempotent replay and the HU add_supplier guard, against the kit's own `current` fixtures.
- `scripts/verify_phase4_close.py` — closes tests 4, 5, 7, 8, 9.
- Combined log: `verification-results.md` — tests 1-9, ALL PASS, every expected value sourced from the fixture files, not hand-typed.

## Known limitations (say these plainly if asked)

- Approvals are local UI state only — no persistence, no auth, no audit log yet (`docs/production.md`).
- Only FR and HU are wired; XK and IT use the same underlying `apply_event` logic but haven't been run end-to-end through the UI.
- Step 6b's explainer runs in demo mode in this environment (no model endpoint configured) — labelled honestly as such, never presented as a live model response.
