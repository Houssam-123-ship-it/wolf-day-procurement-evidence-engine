#!/usr/bin/env python3
"""Phase 3 step 6 proof: idempotent replay of UPD-FR-002 + HU guard case
(UPD-HU-002), and Phase 4 tests 1-3 + 6 logged from real fixture data.

Standalone verification script, stdlib only, no model/LLM involved in any
math (per this step's instruction). Reads directly from
kit/dataset/ingestion-versions.json and kit/dataset/update-lineage.json -
nothing is hand-transcribed, so results cannot drift from the source data.

Run with: python scripts/verify_replay_and_hu.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INGESTION = ROOT / "kit/dataset/ingestion-versions.json"
LINEAGE = ROOT / "kit/dataset/update-lineage.json"
FX = ROOT / "kit/dataset/fx-rates.json"
TRANSACTIONS = ROOT / "kit/dataset/transactions.json"
VALIDATION_MD = ROOT / "validation.md"


def load_event(events, event_id):
    return next(e for e in events if e["id"] == event_id)


def apply_event(state, event, incoming_rows):
    """Generic replay function used for BOTH FR and HU - the same code path
    proves both cases, not two separate hand-written branches.

    replace_supplier_subset / replace_market: drop existing records whose
    supplierId matches the event's scope, then insert the incoming records
    (keyed by id - a repeat insert of the same id is an overwrite, not a
    duplicate, which is what makes replay idempotent).

    add_supplier: insert only, never touch existing records outside scope.
    """
    new_state = dict(state)
    if event["mode"] in ("replace_supplier_subset", "replace_market"):
        scope = event.get("scopeSupplierId")
        if scope:
            new_state = {k: v for k, v in new_state.items() if v["supplierId"] != scope}
    elif event["mode"] != "add_supplier":
        raise ValueError(f"unhandled mode {event['mode']}")
    for r in incoming_rows:
        new_state[r["id"]] = r
    return new_state


def sum_value(state):
    return round(sum(r["valueEUR"] for r in state.values()), 2)


def main():
    ingestion = json.loads(INGESTION.read_text())
    lineage = json.loads(LINEAGE.read_text())
    fx = json.loads(FX.read_text())
    log_lines = []

    def log(line=""):
        print(line)
        log_lines.append(line)

    # ---------- FR: idempotent replay of UPD-FR-002 ----------
    log("=== UPD-FR-002 idempotent replay ===")
    fr_event = load_event(lineage, "UPD-FR-002")
    fr_v1 = {r["id"]: r for r in ingestion["FR"]["v1"]}
    fr_incoming = ingestion["FR"]["v2"]
    fr_expected_current = {r["id"]: r for r in ingestion["FR"]["current"]}

    assert len(fr_v1) == fr_event["previousRows"] == 24
    assert len(fr_incoming) == fr_event["incomingRows"] == 16

    fr_run1 = apply_event(fr_v1, fr_event, fr_incoming)
    run1_total = sum_value(fr_run1)
    run1_ids = sorted(fr_run1.keys())
    log(f"Run 1 (first apply): {len(fr_run1)} rows, total={run1_total} EUR")
    assert len(fr_run1) == fr_event["currentRows"] == 24
    assert set(fr_run1.keys()) == set(fr_expected_current.keys()), "run1 ids != expected-current ids"
    for rid, rec in fr_expected_current.items():
        assert fr_run1[rid]["valueEUR"] == rec["valueEUR"], f"run1 mismatch on {rid}"
    log("Run 1 matches kit's FR `current` fixture exactly (ids + valueEUR).")

    fr_run2 = apply_event(fr_run1, fr_event, fr_incoming)
    run2_total = sum_value(fr_run2)
    run2_ids = sorted(fr_run2.keys())
    log(f"Run 2 (re-apply same event): {len(fr_run2)} rows, total={run2_total} EUR")
    assert run1_ids == run2_ids, "REPLAY BUG: id set changed on second apply"
    assert run1_total == run2_total, "REPLAY BUG: total changed on second apply"
    assert fr_run1 == fr_run2, "REPLAY BUG: record contents changed on second apply"
    log("Run 1 == Run 2: identical row count, identical ids, identical total. No duplicates.")

    sup_aster_total = round(sum(r["valueEUR"] for r in fr_run1.values() if r["supplierId"] == "sup-aster"), 2)
    sup_novex_total = round(sum(r["valueEUR"] for r in fr_run1.values() if r["supplierId"] == "sup-novex"), 2)
    log(f"sup-aster subtotal: {sup_aster_total} EUR   sup-novex (untouched) subtotal: {sup_novex_total} EUR")
    log("")

    # ---------- HU: add_supplier guard case ----------
    log("=== UPD-HU-002 add_supplier guard ===")
    hu_event = load_event(lineage, "UPD-HU-002")
    hu_v1 = {r["id"]: r for r in ingestion["HU"]["v1"]}
    hu_incoming = ingestion["HU"]["v2"]
    hu_expected_current = {r["id"]: r for r in ingestion["HU"]["current"]}

    assert len(hu_v1) == hu_event["previousRows"] == 24
    assert len(hu_incoming) == hu_event["incomingRows"] == 24

    hu_result = apply_event(hu_v1, hu_event, hu_incoming)
    log(f"After apply: {len(hu_result)} rows (expected {hu_event['currentRows']})")
    assert len(hu_result) == hu_event["currentRows"] == 48
    assert set(hu_result.keys()) == set(hu_expected_current.keys())

    original_24_ids = set(hu_v1.keys())
    unchanged = all(hu_result[rid] == hu_v1[rid] for rid in original_24_ids)
    log(f"Original 24 sup-aster rows byte-identical after apply: {unchanged}")
    assert unchanged, "HU GUARD BUG: an original row was modified"

    orbit_ids = set(hu_result.keys()) - original_24_ids
    log(f"sup-orbit rows appended: {len(orbit_ids)} (expected 24)")
    assert len(orbit_ids) == 24
    assert all(hu_result[rid]["supplierId"] == "sup-orbit" for rid in orbit_ids)

    # HUF -> EUR fx check on the appended rows: valueLocal (HUF) / rate == valueEUR
    hu_rate = fx["HUF"]
    fx_mismatches = []
    for rid in orbit_ids:
        r = hu_result[rid]
        assert r["currency"] == "HUF"
        computed_eur = round(r["valueLocal"] / hu_rate, 2)
        if abs(computed_eur - r["valueEUR"]) > 0.01:
            fx_mismatches.append((rid, computed_eur, r["valueEUR"]))
    log(f"fx check (valueLocal/{hu_rate} == valueEUR) on all 24 sup-orbit rows: "
        f"{'OK, 0 mismatches' if not fx_mismatches else fx_mismatches}")
    assert not fx_mismatches, "HU FX BUG"
    log("")

    # ---------- Ledger boundary ----------
    log("=== Ledger boundary (D0) ===")
    tx_count = len(json.loads(TRANSACTIONS.read_text()))
    log(f"kit/dataset/transactions.json record count: {tx_count} (expected 4872, unaffected by FR/HU)")
    assert tx_count == 4872
    log("")

    # ---------- Phase 4 test log (tests 1-3, 6) ----------
    log("=== Phase 4 test results (from fixtures, not eyeballed) ===")
    log(f"Test 1 (FR total exact): expected 24 rows / actual {len(fr_run1)} rows; "
        f"expected total = sum(FR current valueEUR) = {sum_value(fr_expected_current)} EUR; "
        f"actual = {run1_total} EUR -> {'PASS' if run1_total == sum_value(fr_expected_current) else 'FAIL'}")
    log(f"Test 2 (FR scope unchanged): sup-novex rows identical to v1 -> "
        f"{'PASS' if all(fr_run1[r['id']] == r for r in ingestion['FR']['v1'] if r['supplierId']=='sup-novex') else 'FAIL'}")
    log(f"Test 3 (replay twice identical): run1==run2 ids+values -> "
        f"{'PASS' if fr_run1 == fr_run2 else 'FAIL'}")
    log(f"Test 6 (HU 48, zero drops): {len(hu_result)} rows, original 24 unchanged={unchanged}, "
        f"orbit appended={len(orbit_ids)} -> "
        f"{'PASS' if len(hu_result)==48 and unchanged and len(orbit_ids)==24 else 'FAIL'}")

    VALIDATION_MD.write_text(
        "# Validation log\n\n"
        "Generated by scripts/verify_replay_and_hu.py against kit/dataset/ingestion-versions.json "
        "and kit/dataset/update-lineage.json directly - no hand-eyeballed numbers.\n\n"
        "```\n" + "\n".join(log_lines) + "\n```\n"
    )
    log(f"\nWrote {VALIDATION_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
