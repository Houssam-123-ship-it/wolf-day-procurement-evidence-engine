# Fireside Q&A prep — Track 1, Procurement Evidence Engine

Verified before writing this: live page at `/dashboard/nullmessung` still renders FR sup-aster 90,909.28 €, HU sup-aster 196,890.50 € / sup-orbit 192,224.11 € / combined 389,114.61 € — matching `verification-results.md`'s tests 1-9 ALL PASS. The workflow is confirmed working, not assumed. This document is interview prep: for every phase and every technology choice, the alternative that was rejected and the concrete reason, plus a bank of hard questions with prepared answers.

---

## 1. Per-phase decision log — chosen vs. rejected, and why

### Track selection (before Phase 0)
**Chosen:** Track 1 — Procurement evidence engine.
**Alternatives considered:** Track 2 (multimodal archive operator), Track 3 (product identity graph), Track 4 (procurement digital twin), Track 5 (specialist model), Track 6 (self-auditing decision brief).
**Why the alternatives lost:**
- Track 2 needs scanned/rotated invoice images the kit doesn't ship (it only has text/structured invoice records) — building those fixtures first is time spent not solving the actual problem.
- Track 3 and Track 4 both need fixtures the kit explicitly says teams must invent (hard negatives, route capacities) — same fixture-tax problem, worse for a solo build.
- Track 5 depends on GPU/H100 access that requires a facilitator-approved request — an external dependency outside my control, and it's explicitly framed as an add-on for a track that's already working, not a standalone track.
- Track 6 is a thin layer on top of Track 1's own output (a decision brief needs a versioned award record to audit) — building it without Track 1 underneath means auditing numbers that aren't grounded in anything.
**Decisive fact, not opinion:** Track 1 alone covers 70 of 100 scoring points (data correctness 30 + provenance/uncertainty 20 + event-driven workflow 20), and needs zero invented fixtures — everything it needs (`ingestion-versions.json`, `update-lineage.json`, `input-sheets/`) already exists in the kit.

### Phase 0 — case selection
**Chosen:** FR (`UPD-FR-002`) as primary, HU (`UPD-HU-002`) as guard case.
**Alternatives:** XK (`replace_market`), IT (`replace_market`, two sheets).
**Why:** FR is the only case containing *both* the header-total trap and two separate cancellation reversals in one file — the highest-density difficulty per case. XK and IT are both pure market replacements; solving FR generalizes to them (same `mode` values), so solving XK/IT separately would have been repeated proof of the same mechanism, not new coverage. HU was picked as the second case specifically because it's a structurally *different* operation (`add_supplier` vs `replace_supplier_subset`) — the one case that answers "what if it's an addition, not a replacement?", which is the exact question in the official demo script.

### Phase 1+2 — design
**Chosen:** approval bound to a specific event/version id, not to "the current record."
**Alternative rejected:** a simpler design where an approval just references a record by id, and staleness is inferred by diffing the record's current content against a snapshot taken at approval time.
**Why rejected:** content-diffing can't distinguish "this record was corrected" from "this record was corrected back to the same values" — and more importantly, it can't distinguish a real correction from a byte-identical re-import (replay). Binding to the event id sidesteps both problems for free: same event id replayed = same version = never stale; different event id = stale, regardless of whether the new numbers happen to match the old ones.

### Phase 3 step 1-2 — parsing
**Chosen:** parse the raw CSV by column *index*, with a hardcoded index→field map.
**Alternative rejected:** parse by header name (`row[headerName]`), the default approach in almost any tutorial or library.
**Why rejected, with evidence not assumption:** the FR sheet has four duplicate header names (`Currency`×2, `Invoice`×2, `Item`×2, `Payer`×2) confirmed by direct inspection of `FR-v2--Sheet1.csv:1`. Object-key construction from headers silently drops the first occurrence of each duplicate — and the `Payer` columns aren't even a safe duplicate to collapse, since column 23 holds `Wolf France` and column 34 holds `WOLF-PAYEUR-001`, two different values under the same header text. Index-based parsing was the only approach that couldn't lose that data.

### Phase 3 step 4 — screen wiring
**Chosen:** extend `AgentFeed` (`nullmessung/agent-feed.tsx`) + add a new card to the existing `NullmessungView` page.
**Alternatives that were *opened and rejected on evidence*, not guessed:** `entscheidung/view.tsx` (looked like "decision" screen by name; turned out to be a fullscreen pitch-deck slideshow with keyboard navigation, not a data screen), `dashboard/components/page.tsx` (looked like a live approval screen; turned out to be the literal "Component examples" catalog page, self-labelled as such), `gegenueberstellung.tsx` (RFI-vs-accounting supply comparison, unrelated domain).
**Why this matters as an interview point:** three of four initial guesses, based on plausible-sounding names, were wrong. The decision to open and read the actual files before wiring anything cost a few minutes and caught all three — this is presented explicitly as evidence of process discipline, not just a build note.

### Phase 3 step 5-6 — stale rule, replay, HU guard
**Chosen:** a single generic `apply_event(state, event, incoming_rows)` function used for both FR and HU, branching only on `event.mode`.
**Alternative rejected:** two separate hand-written import functions, one per case.
**Why:** using one function for both is itself part of the proof — if FR and HU each needed bespoke logic, that would suggest the approach doesn't generalize past the two cases we happened to test. One function handling both `replace_supplier_subset` and `add_supplier` correctly is evidence the mechanism would extend to XK/IT without a rewrite.

### Step 6b — DeepSeek explainer, placement
**Chosen:** added last, after all correctness logic was tested and frozen; strictly a narration layer with no computation.
**Alternative rejected:** using the model earlier to help classify scope, extract totals, or summarize the raw sheet directly.
**Why rejected:** the grading rubric weights data correctness, provenance and event-driven workflow at 70/100 — none of that can depend on a non-deterministic component. Putting the model last, and proving (by re-running the deterministic test suite with the explainer both on and off) that totals/stale/replay are byte-identical either way, means the demo survives even if the model endpoint is slow, wrong, or simply turned off.

### Phase 7 — freeze
**Chosen:** stop adding features once the 9-test suite passed and the demo/production docs were written.
**Alternative rejected:** using remaining time to wire XK/IT too, or to add persistence.
**Why:** the brief's own four-hour loop reserves the final block for packaging and rehearsal, not new scope — and a feature added in the last hour with no test coverage is a liability in front of judges, not an asset.

---

## 2. "Why Track 1 and not X" — direct spoken answers

- **"Why not the multimodal archive track?"** — It needs scanned invoice images the kit doesn't provide; I'd have spent the first hour manufacturing test data instead of solving the real problem.
- **"Why not the product-matching track?"** — It's a real ML problem, but its pain is about *comparison quality* at a point in time, not about a decision surviving a data change over time — which is what the official demo script and the final "late file arrives" reveal are built around.
- **"Why not the digital twin / optimization track?"** — It needs route capacities and logistics assumptions the kit doesn't supply; inventing a full logistics model solo, in one day, is scope I chose not to take on.
- **"Why not fine-tune a model (track 5)?"** — It depends on GPU access I don't control, and it's explicitly framed in the brief as an add-on to a working track, not a track that stands alone.
- **"Why not the decision-brief track?"** — Its whole premise is auditing an award record — which only exists once Track 1's versioned import exists. Building it without Track 1 means narrating numbers with nothing grounding them.

---

## 3. The "5 weeks" question — answer it head-on, don't dodge it

**The honest framing:** what's being shown today is *not* a smaller version of the production system — it's the highest-risk 20% of it, proven first, on purpose.

The parts I built today are the parts that are genuinely hard to get right and hard to retrofit later: the exact arithmetic rules (never sum a repeated invoice total, always apply cancellations as reversals), and the version/stale model that decides when a human needs to look again. Those are design decisions — get them wrong and every feature built on top inherits the bug. I proved them with a real, executable test suite (9/9 passing, `verification-results.md`) against the kit's own independent ground truth, not against my own derivation.

What's *not* built — and this maps directly onto the 5-week estimate — is auth, persistent storage, audit logging, ingestion for the other two update modes and the other ~9 suppliers, real supplier-file connectors, and model cost/monitoring for the optional explainer. That's substantial, but it's largely **known engineering**: standard patterns (auth providers, a Postgres-backed approval table, an audit log table, more instances of the same `apply_event` function), not open questions. The open question — "does this version/stale model actually work, and can the arithmetic be trusted?" — is the thing I could answer today, definitively, with code.

**If pushed further:** "So you're saying the hard part is done and the rest is just typing?" — No: the rest is real work, and I'm not underselling it. But it's *estimable* work with known unknowns, whereas the part I built had design risk that could only be retired by actually building and testing it.

---

## 4. Architecture / pipeline recap

```
Raw supplier file (CSV, duplicate headers)
        │  index-based parse (D2) — never row[headerName]
        ▼
Typed canonical record
        │  event declares mode + scope (D5) — replace_supplier_subset | add_supplier
        ▼
apply_event(state, event, incoming_rows)
        │  CREDIT_NOTE rows applied as reversals within their invoice group (D4)
        │  Net value summed per line, Invoice total read once, never multiplied (D3)
        ▼
Recomputed finding (typed, versioned)
        │  approval stores the event id it was approved against (D1)
        ▼
Approval: valid while version matches → stale the instant it doesn't
        │  (optional, added last, never load-bearing)
        ▼
Narration layer (POST /api/analyse) — demo-mode fallback if no model endpoint,
never computes a number, only describes numbers already computed above
```

**Why each boundary exists, if asked:**
- Parsing and computation are separated from narration so correctness never depends on a model being available, fast, or configured — verified by re-running the test suite with the explainer removed entirely and getting identical numbers.
- The version/approval boundary exists so "is this still safe to act on" is a lookup (event id match), not a re-computation or a human's memory.
- One generic `apply_event` function instead of per-market code, so the two proven cases (FR, HU) are evidence the design generalizes, not two isolated demos.

---

## 5. Tricky-question bank

**"Why not RAG or a vector database?"**
There's no unstructured document corpus to retrieve from here — the data is structured spreadsheets with a known, if messy, schema. RAG solves "find the relevant needle in a lot of loosely-structured text"; this problem is "correctly apply a declared, structured change to a small, fully-known record set." Adding RAG would be solving a problem I don't have.

**"Why not LangGraph or an agent framework?"**
There's no multi-step branching decision here that needs stateful orchestration across tool calls — it's one deterministic transform (`apply_event`) plus one optional narration call at the end. LangGraph earns its complexity when there's genuine multi-step agentic decision-making; using it here would add a dependency and a debugging surface for no behavior I actually need.

**"Why only FR and HU, not all four update cases?"**
FR and HU are the two structurally different operations in the kit (`replace_supplier_subset` and `add_supplier`); XK and IT are both `replace_market`, which is the same shape FR already exercises (plus FR's is harder — it has the header-total and double-cancellation traps XK/IT don't). Proving both *distinct* operation types with one generic function is stronger evidence than proving the same operation type four times.

**"How do you know your total is correct and not just self-consistent with your own logic?"**
Every test compares my code's output against the kit's own independently-generated `ingestion-versions.json` `current` array — a ground truth I didn't derive and can't accidentally make agree with my own bugs. If my `apply_event` had a bug, it would disagree with that file, and the test would fail. It didn't, on any of the 9 tests.

**"What if your scope-validation logic itself has a bug — how would you know?"**
That's exactly what test 8 is for: I deliberately mutated the real event (wrong `scopeSupplierId`, wrong currency, missing source reference) and confirmed each one raises a visible, named exception rather than silently succeeding. If the validator had a bug that let bad input through unflagged, that test would catch it by failing to raise.

**"Why should a hackathon demo be a hiring signal at all?"**
Feature count is easy to fake in a day; process discipline isn't. Every number in this build is labelled either "code-verified" or "pending" until it actually was verified. Every design decision cites the exact file and line in the real data that forced it. Three of four UI-wiring guesses were wrong on inspection and were caught *before* code was written against them, not after. That's the actual signal — not how many tracks got touched.

**"What would you do differently with five weeks?"**
Wire XK and IT through the same `apply_event` function to prove the "one function, all markets" claim at full scale; add persistent, audited approvals instead of local UI state; and put real evaluation (latency, cost, accuracy) behind the explainer once it's running in model mode, instead of leaving it correctness-agnostic by design.

---

## 6. Jury questions — 15 most likely, each tagged to the Wolf strength it demonstrates

**1. Why this problem?**
Because it's a business-critical trust failure hiding in plain sight: procurement teams act on approvals every day without a mechanism to know if the evidence behind them is still current. It's narrow enough to prove in one day and general enough to matter in production. *(System thinking)*

**2. Why this architecture — raw file → typed record → event → recomputation → versioned finding → approval?**
Because each stage is a real boundary with a real failure mode: parsing can silently drop data (duplicate columns), computation can silently double-count (repeated totals), and approval can silently go stale (evidence changes). Separating them means each failure mode gets its own, isolated defense instead of one tangled function trying to do everything at once. *(Architecture)*

**3. Why deterministic logic instead of letting a model handle the evidence?**
Because the graded, business-critical part — correct totals, correct change tracking — needs to be provably right, not plausibly right. A deterministic function either matches ground truth or it doesn't; that's testable. A model's arithmetic is neither guaranteed nor debuggable the same way. *(Hardening)*

**4. Why use AI at all, then?**
Because "the numbers are right" and "a human understands what happened" are two different problems. Deterministic code solves the first; a plain-language explanation solves the second. Using AI only for the second keeps the first problem's correctness independent of the second's occasional unreliability. *(Design)*

**5. Why DeepSeek specifically?**
It's the access the event provided (facilitator-managed endpoint), reached through a pre-existing route that already had a safe, honest fallback built in. The choice of model matters far less here than the choice to keep it outside the authoritative decision path — that design holds regardless of which model sits behind the endpoint. *(Hardening)*

**6. Why no RAG?**
RAG solves retrieval from a large, loosely-structured document corpus. This problem is the opposite: a small, fully-known, structured record set where the task is applying a declared change correctly. Adding retrieval would add a dependency and a failure mode for a problem that doesn't exist here. *(Architecture)*

**7. Why no LangGraph or agent orchestration?**
There's no multi-step branching decision that needs stateful tool orchestration — it's one deterministic transform plus one optional narration call. Agent frameworks earn their complexity when the workflow genuinely branches; here it would add a debugging surface with no corresponding behavior gained. *(Design)*

**8. Why France?**
France's update (`UPD-FR-002`) is the densest difficulty case in the kit: it contains both the header-total trap (an invoice total repeated per line, easy to double-count) and two separate cancellation reversals in one file. Solving the hardest case first means the easier cases are provably covered by the same logic. *(System thinking)*

**9. Why Hungary?**
Hungary's update (`UPD-HU-002`) is structurally different — an addition (`add_supplier`), not a replacement. It's the direct answer to "what if it's not a correction, just new data?" Proving both operation types with one shared mechanism is stronger evidence than proving one operation type twice. *(Architecture)*

**10. How did you validate it?**
Nine automated tests, each checked against the kit's own independently generated ground-truth data — not against my own derivation, which could agree with itself even if wrong. Plus three deliberately broken inputs (wrong supplier, wrong currency, missing source) to confirm bad data fails loudly, not silently. *(Hardening)*

**11. What happens with bad input?**
It raises a named, visible exception at the exact point of the problem — never a silent fallback, never a guessed value. That's tested, not assumed: three specific adversarial mutations, three specific confirmed exceptions. *(Hardening)*

**12. What happens when evidence changes after an approval?**
The approval is bound to the exact version it was approved against. The moment a new event changes that version, the approval is marked stale and blocked from being treated as current — automatically, not by someone remembering to check. *(Design)*

**13. How would you scale it?**
Not by guessing at infrastructure — by following what actually breaks first: persistent storage for evidence/event/approval history (currently in-memory UI state), then real supplier connectors, then performance and monitoring once there's real load to measure. Scaling decisions should follow measured bottlenecks, not anticipated ones. *(Scale)*

**14. What would you change with five weeks?**
Wire the remaining two update modes (XK, IT) through the same generic mechanism to prove it at full scale, replace local UI state with persistent, audited approvals, and add real evaluation — latency, cost, accuracy — to the AI layer once it's running against a live model instead of staying correctness-agnostic by design. *(Scale, Hardening)*

**15. What's the difference between your prototype and the production system?**
The prototype proves the mechanism is correct on two proven cases with no persistence, no auth, and no audit trail. Production is the same mechanism made durable, integrated, observable and defensible to an auditor — same core logic, different guarantees around it. That's exactly the Wolf's job: not rebuilding what works, but deciding what has to change so a business can depend on it. *(Architecture, System thinking)*
