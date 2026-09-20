# Procurement Evidence Engine — Wolf Day Submission

Casablanca AI Lab, Wolf Day, 18 September 2026. **Track 1: Procurement evidence engine.**

## What this is

A procurement decision gets approved based on supplier evidence — prices, quantities, invoice lines. That evidence can change *after* the approval already happened (a corrected file, a new supplier). This project answers one question: **how does a procurement team know whether an existing approval is still trustworthy once the evidence behind it changes?**

The mechanism, proven end to end on two real cases from the hackathon dataset:

```
Raw supplier CSV → typed canonical record → generic event application
  → deterministic recomputation → versioned finding → approval / stale detection
  → optional AI narration (never authoritative)
```

An approval is pinned to the exact evidence version it was approved against. When a new event changes that version, the approval automatically goes stale and is blocked until re-reviewed. The financial math (invoice totals, credit-note reversals, currency conversion) is fully deterministic and independently verified — AI is used only afterward, to explain a finding in plain language; it never computes or decides anything.

## Where everything lives

The actual project is in **[`wolf-materials-lab/`](wolf-materials-lab/)** — the DaiL-provided hackathon starter kit (frontend + synthetic dataset), with Track 1 built on top of it. Start there.

| File | What it is |
|---|---|
| [`wolf-materials-lab/challenge.md`](wolf-materials-lab/challenge.md) | The buyer-decision brief: FR primary case, HU guard case, success criteria |
| [`wolf-materials-lab/decisions.md`](wolf-materials-lab/decisions.md) | Five design decisions (D0–D5), each cited to an exact file+line in the real data |
| [`wolf-materials-lab/verification-results.md`](wolf-materials-lab/verification-results.md) | All 9 automated tests, PASS, checked against the kit's own independent ground truth |
| [`wolf-materials-lab/demo.md`](wolf-materials-lab/demo.md) | The rehearsed demo script — happy path, graceful failure, spoken lines |
| [`wolf-materials-lab/docs/production.md`](wolf-materials-lab/docs/production.md) | Implemented vs. mocked vs. production-next, stated honestly |
| [`wolf-materials-lab/fireside-qa-prep.md`](wolf-materials-lab/fireside-qa-prep.md) | Per-phase decision log, track-selection rationale, and 15 prepared jury questions |
| [`wolf-materials-lab/scripts/`](wolf-materials-lab/scripts/) | The three verification scripts that produced the test results — runnable, not just claimed |
| [`wolf-materials-lab/README.md`](wolf-materials-lab/README.md) | ⚠️ Not this project's README — it's the **starter kit's own** setup guide (how to run the frontend, dataset scope, what's real vs. simulated in the kit itself). Read it for run instructions; read *this* file for what was actually built. |

`agent prompt.txt` at the repo root is an early strategy reference used to structure the overall approach — not part of the shipped product.

## Run it

```bash
cd wolf-materials-lab/frontend
npm ci
npm run dev
```
Open `http://127.0.0.1:8084/dashboard/nullmessung` and scroll to the "Track 1: FR evidence engine" card.

To re-run the verification suite:
```bash
cd wolf-materials-lab
python scripts/verify_fr_import.py
python scripts/verify_replay_and_hu.py
python scripts/verify_phase4_close.py
```
