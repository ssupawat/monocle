# Good morning — Argument Builder overnight work

Open any file in your browser to try it. **Start here:**
```
open index.html
```

## What's in each file

| File | What it is | Try it |
|------|------------|--------|
| **index.html** | The reviewed, tested **baseline**. Has everything below except presets & pattern detection. | Boot → Modus Ponens. Type, wire, refresh (survives!), chain steps. |
| **index-A.html** | Baseline **+ preset dropdown** (MP/MT/HS/DS/AC/DA in a `<select>`). | Header → "Presets:" dropdown → pick one. |
| **index-B.html** | Baseline **+ preset chip row** (same 6 presets as pills; fallacies marked ✗). | Header → click any chip. |
| **index-C.html** | Baseline **+ pattern detection** — auto-tags each step (Modus Ponens, Modus Tollens, Hypothetical Syllogism, Disjunctive Syllogism; Affirming/Denying the Consequent/Antecedent fallacies). | Boot → "Modus Ponens" tag appears. Build MT by hand → "Modus Tollens" tag. |

## What got built overnight (all on the baseline `index.html`)

From Opus's `TODO.md`, these **clear wins** shipped directly:

- **P0-2 — Persistence.** Your work survives refresh (localStorage, debounced + flushed on `beforeunload`). Clear button wipes it.
- **P0-3 — Operator palette.** Each block has clickable `¬ ∧ ∨ → ↔` buttons that insert at the caret. No more hunting for `!`/`~`/`->`.
- **P0-4 — "Why invalid" sentence.** Verdict panel reads, e.g.: *"Why invalid: When p is true and q is true, the premise is true but the conclusion ¬q is false."*
- **P1-1 — Chain validity propagation.** New "Overall" verdict at top of panel. A Derived block built on an invalid upstream step shows `⚠ depends on invalid Step N` instead of `✓ valid` — fixes the false-confidence bug where Step 2 looked fine but Step 1 was broken.
- **P1-3 — Tautology/contradiction/contingent badge** on single-block truth tables.
- **Hide-table-button on trivial blocks.** A plain premise that's just `p` or `¬p` no longer shows a useless `table` button (its table is just T/F). Derived blocks always keep theirs.

Plus a cycle-guard in the chain logic (defensive — proven unreachable through the UI, but the fix is correct).

## Decisions waiting for you (the variants)

These are **genuine design choices** I did not make unilaterally — pick one and I'll merge it back into `index.html`:

1. **Presets:** dropdown (A) or chip row (B)? — or skip presets entirely?
2. **Pattern detection (C):** keep it? It's purely additive and the safest merge.

My recommendation: **B + C**. Chips are more discoverable than a dropdown for a learning tool, and pattern detection *teaches* by naming what the learner just built.

## Testing

`test.mjs` — **36 Playwright tests, all passing** on `index.html`:
- Halo semantics, arrow-from-halo-edge, rewire thought-experiment, single-premise
- Multi-step chain, block "why invalid" line, argument truth-table (φ column)
- Persistence round-trip, tautology badge, chain propagation, **cycle guard**

Variants A/B/C are smoke-tested (dropdown loads MT valid + AC invalid; chips load 6 presets; C tags MP on boot and MT/AC when built).

## Process notes

- Opus 4.7 wrote `TODO.md` (10 use cases, prioritized P0–P2 tasks) — worth reading.
- Opus reviewed my P0-2/P0-3/P0-4/P1-3 implementation; I fixed every finding (ops-button click hijack, beforeunload flush, loadState hardening).
- Opus reviewed P1-1 + the 3 variants; flagged the cycle hazard (fixed) and confirmed variants are internally consistent.

## tmux session

`claude-fix` is still open if you want to ask it anything: `tmux attach -t claude-fix`. Kill with `tmux kill-session -t claude-fix` when done.
