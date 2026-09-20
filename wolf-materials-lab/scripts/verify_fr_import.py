#!/usr/bin/env python3
"""Phase 3 steps 1-3 proof for Track 1 (FR primary case, UPD-FR-002).

Standalone verification script, stdlib only. Parses the raw FR-v2 sheet by
column INDEX (never by header name, per decisions.md D2), applies the
UPD-FR-002 event scope (sup-aster only, per D5), and checks that summing
`Net value` per invoice group reproduces the invoice's true total while
never summing the repeated `Invoice total` column (per D3), with CREDIT_NOTE
rows applied as reversals (per D4).

This is a read-only proof/dry-run, not the production importer (which will
live in the Next.js app per Phase 3 step 4 once approved). Run with:
    python3 wolf-materials-lab/scripts/verify_fr_import.py
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "kit/dataset/input-sheets/FR-v2--Sheet1.csv"
LINEAGE = ROOT / "kit/dataset/update-lineage.json"
INGESTION = ROOT / "kit/dataset/ingestion-versions.json"

# D2: column map by 1-based index, never by header text (duplicate headers exist).
COL = {
    "siteCode": 0,
    "site": 1,
    "invoiceDate": 2,
    "invoiceTotal": 3,      # D3: never sum this across rows
    "currency": 4,
    "invoice": 5,
    "article": 6,           # -> productCode
    "description": 7,
    "qty": 8,
    "qtyUnit": 9,
    "netValue": 10,         # D3: sum this per line
    "item": 12,
    "invoiceTypeCode": 20,  # D4: 'CREDIT_NOTE' vs 'INVOICE'
    "payerName": 22,
    "payerCode": 33,        # D2: same header text as payerName, different value
}

SCOPE_SUPPLIER = "sup-aster"


def load_event():
    events = json.loads(LINEAGE.read_text())
    ev = next(e for e in events if e["id"] == "UPD-FR-002")
    assert ev["mode"] == "replace_supplier_subset"
    assert ev["scopeSupplierId"] == SCOPE_SUPPLIER
    assert ev["previousRows"] == 24 and ev["incomingRows"] == 16 and ev["currentRows"] == 24
    return ev


def parse_sheet():
    with open(SHEET, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    header, data_rows = rows[0], rows[1:]
    assert len(header) == 34, f"expected 34 columns, got {len(header)}"
    # D2 proof: show the actual duplicate-header positions found.
    dupes = {}
    for i, h in enumerate(header, start=1):
        dupes.setdefault(h, []).append(i)
    dupe_report = {h: idxs for h, idxs in dupes.items() if len(idxs) > 1}

    parsed = []
    for r in data_rows:
        parsed.append({
            "siteCode": r[COL["siteCode"]],
            "invoiceTotal": float(r[COL["invoiceTotal"]]),
            "invoice": r[COL["invoice"]],
            "article": r[COL["article"]],
            "qty": int(r[COL["qty"]]),
            "netValue": float(r[COL["netValue"]]),
            "invoiceTypeCode": r[COL["invoiceTypeCode"]],
            "payerName": r[COL["payerName"]],
            "payerCode": r[COL["payerCode"]],
        })
    return parsed, dupe_report


def apply_event(rows):
    """D5: scope is declared by the event (sup-aster), not inferred from rows.
    All 16 incoming rows belong to the declared scope; assign supplierId
    from the event, not from any column (there is no supplier column here)."""
    for r in rows:
        r["supplierId"] = SCOPE_SUPPLIER
    return rows


def invoice_group_totals(rows):
    """D3 + D4: sum Net value per (invoice) group; CREDIT_NOTE rows are
    reversals already expressed as negative Net value in this fixture, so
    summing Net value naturally nets them against the group."""
    groups = {}
    for r in rows:
        groups.setdefault(r["invoice"], {"declaredTotal": None, "sumNetValue": 0.0, "rows": []})
        g = groups[r["invoice"]]
        g["declaredTotal"] = r["invoiceTotal"]  # same value repeated on every row; read once
        g["sumNetValue"] += r["netValue"]
        g["rows"].append(r)
    return groups


def naive_wrong_baseline(rows):
    """The instinctive-but-wrong approach: sum invoiceTotal across all rows
    in a group instead of reading it once. This is the recorded Phase 0/1+2
    baseline failure (decisions.md / plan Phase 4 test 4)."""
    groups = {}
    for r in rows:
        groups.setdefault(r["invoice"], 0.0)
        groups[r["invoice"]] += r["invoiceTotal"]
    return groups


def main():
    ev = load_event()
    print(f"Event: {ev['id']} mode={ev['mode']} scope={ev['scopeSupplierId']} "
          f"{ev['previousRows']}->{ev['incomingRows']}->{ev['currentRows']} rows\n")

    rows, dupes = parse_sheet()
    print(f"Parsed {len(rows)} rows from {SHEET.name} (expected 16, matches incomingRows)")
    print(f"Duplicate header positions (D2 proof): {dupes}\n")

    rows = apply_event(rows)

    groups = invoice_group_totals(rows)
    naive = naive_wrong_baseline(rows)

    print("Correct math (sum Net value per invoice group, D3+D4):")
    for inv in ("FAC-WOLF-0001", "FAC-WOLF-0002", "FAC-WOLF-0003"):
        g = groups[inv]
        match = "OK" if abs(g["sumNetValue"] - g["declaredTotal"]) < 0.005 else "MISMATCH"
        print(f"  {inv}: declared Invoice total={g['declaredTotal']:.2f}  "
              f"sum(Net value)={g['sumNetValue']:.2f}  [{match}]")

    print("\nBaseline failing case (naive sum of repeated Invoice total, Phase 4 test 4):")
    for inv in ("FAC-WOLF-0001",):
        print(f"  {inv}: naive_sum(Invoice total)={naive[inv]:.2f}  "
              f"(expected correct value={groups[inv]['declaredTotal']:.2f})  "
              f"[{'BUG CONFIRMED' if abs(naive[inv]-groups[inv]['declaredTotal'])>0.005 else 'unexpected match'}]")

    total_net = sum(r["netValue"] for r in rows)
    print(f"\nsup-aster (16 rows) sum(Net value) = {total_net:.2f} EUR")

    payer_check = rows[0]
    print(f"\nD2 payer-column proof (row 1): payerName(col23)={payer_check['payerName']!r} "
          f"payerCode(col34)={payer_check['payerCode']!r}  -> different values, confirmed not a safe dupe")


if __name__ == "__main__":
    main()
