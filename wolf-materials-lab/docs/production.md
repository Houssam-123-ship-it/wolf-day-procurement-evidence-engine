# Production readiness — Track 1 (Procurement evidence engine)

Three columns: what actually runs today, what is simulated, what production would still require. Evidence for every "Implemented now" claim is in `verification-results.md` (code-run, not eyeballed) and `decisions.md` (D0-D5, file+line cited).

## Implemented now

- **FR versioned import (`UPD-FR-002`)**: parses the raw `FR-v2--Sheet1.csv` by column index (D2), correctly separates `Invoice total` (read once) from `Net value` (summed per line, D3), applies `CREDIT_NOTE` rows as reversals (D4), scoped to `sup-aster` only (D5). Verified against the kit's own `FR current` fixture: 24 rows, 116,546.84 EUR — exact match. Script: `scripts/verify_fr_import.py`, `scripts/verify_replay_and_hu.py`.
- **HU guard case (`UPD-HU-002`, `add_supplier`)**: 24 original `sup-aster` rows confirmed byte-identical after the event, 24 `sup-orbit` rows appended, HUF→EUR fx conversion checked against `fx-rates.json` (0 mismatches across all 24 appended rows).
- **Idempotent replay**: re-applying `UPD-FR-002` a second time produces an identical row set, identical ids, identical total (116,546.84 EUR) — no duplicates.
- **Stale-approval rule (D1)**: an approval stores the exact event id it was approved against. A subsequent correction (`UPD-FR-003-demo`, a simulated next-event used only to prove this rule) flips the approval to a visibly blocked "Stale" state; an unrelated approval (`sup-novex` baseline) is provably unaffected — separate React state, no shared dependency.
- **3 adversarial guards**: wrong replacement scope, currency mismatch, and missing source reference each raise a visible exception rather than silently applying — proven against locally constructed mutations of the real event/rows.
- **Ledger boundary (D0)**: the FR/HU fixtures are never summed into the 4,872-row canonical dashboard ledger — confirmed by direct count of `transactions.json` before and after.
- **Frontend wiring**: `AgentFeed` extended with an optional `extraEvents` prop (no edit to the generator-owned `agentFeed` array); one new Card in the existing `NullmessungView` page (`/dashboard/nullmessung`, no new route) hosts the evidence table, approval control, and stale-state UI.
- **Step 6b DeepSeek explainer**: calls the pre-existing `POST /api/analyse` route server-side only (no client-side key). Currently running in **demo mode** — confirmed live, `X-Wolf-Mode: demo` header, fixed labelled text, zero model call, because `WOLF_MODEL_BASE_URL`/`WOLF_MODEL_NAME` are unset in this environment. This is purely a display add-on: totals, stale state, and replay/HU results are unaffected whether this call succeeds, fails, or is never clicked.

## Mocked

- **Step 6b explainer, demo mode**: see above — becomes model-backed automatically if a facilitator sets `WOLF_MODEL_BASE_URL`/`WOLF_MODEL_NAME`; no code change required, no change to any graded math.
- **Kit-native simulations, untouched by Track 1 work**: the "Analyst" chat's own demo fallback, `/api/voice/signed-url` (`{demo:true}`), `/api/erhebung/structure` (503 demo fallback), the scripted live feed on other dashboard screens, and the training-video placeholders — all pre-existing, all explicitly labelled by the kit itself.

## Production-next (not built, not claimed)

- **Authentication, persistence, tenant separation** — approvals currently live in local React state only; a page refresh loses them. A real system needs a database-backed approval/version store.
- **Audit logging** — no record is kept of who approved what, when, or what was superseded.
- **Real supplier-file connectors** — FR and HU are the two proven cases; XK and IT (also in the kit) and any real supplier feed are out of scope of this build.
- **Import coverage beyond FR/HU** — the same replay engine (`apply_event`) generalizes to `replace_market` and `add_supplier` modes already (used for both FR and HU), but has not been run against XK/IT or a live file drop.
- **Model cost and monitoring** — no token/cost tracking exists for the step 6b explainer even in model mode; no latency or error-rate monitoring on that path.
- **Operational note**: `kit/scripts/package.py` (bundle regeneration, not required to run the app) fails under Windows' default cp1252 locale — confirmed as a pre-existing encoding issue in the kit's own script (missing `encoding='utf-8'` on a file read), unrelated to Track 1 code. Works with `PYTHONUTF8=1` set, or natively on Linux/Mac. Does not block `npm run dev` or the demo, since the frontend's data files are already generated and committed.
