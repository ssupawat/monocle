# 🧐 Monocle

Interactive tool for learning propositional logic. Drag blocks, wire premises to a conclusion with lasso-select + click-to-conclude, and check argument validity with a DPLL SAT solver. Build multi-step chains, spot inference patterns and fallacies, and read the whole argument back as a numbered proof.

Open `index.html` in a browser. Single file, vanilla JS, no build step.

## Build an argument

1. Click **+ Add block** to create premise blocks. Type formulas like `p → q`.
2. **Lasso-select** premise blocks by dragging on empty canvas.
3. **Click a block** to set it as the conclusion. The selected premises now entail it.

A concluded block can itself be a premise in the next step, so chains compose: `{A, A→B} ⊨ B`, then `{B, B→C} ⊨ C`, and so on.

## Check validity

The verdict comes from a **DPLL SAT solver**, not enumeration. An argument is valid iff `premises ∧ ¬conclusion` is UNSAT; a satisfying model (when one exists) is a counterexample. This scales to any number of variables (the old truth-table engine misreported valid for `n>20`; DPLL fixes that).

- **Valid** = no truth assignment where all premises are true and the conclusion is false.
- **Invalid** = a counterexample exists, shown with a plain-English witness ("when p is true and q is false...").
- **Trivial** = the conclusion is already one of the premises (valid, but adds no new information).
- Per-block **truth tables** are shown for reference, display-capped at 12 variables (the verdict is always from DPLL, regardless of table size).
- A single formula can be classified as **tautology / contradiction / contingent** (also via DPLL).

## Inference patterns and fallacies

Each derived step is tagged with the rule it matches (when one does):

- **Valid rules:** Modus Ponens, Modus Tollens, Hypothetical Syllogism, Disjunctive Syllogism, Constructive Dilemma, Destructive Dilemma, Simplification, Addition, Conjunction
- **Fallacies:** Affirming the Consequent, Denying the Antecedent

## Panels

Toggle buttons sit anchored above the panels they control:

- **Premises** (left) — define symbol + plain-English meaning; symbols autocomplete into block formulas from a custom dropdown.
- **Validity** (right) — per-branch verdicts for multi-step arguments. Includes **View as proof**, a read-only linearization of the current argument into a numbered natural-deduction proof (premises first, each derived step with its rule and the line numbers it cites), with copy-to-clipboard.

## Share

The **Share** button copies a URL whose hash encodes the full canvas state (blocks, wires, premises) as base64url with an `a=` version prefix. Opening the link restores the exact argument. Works over `file://` with a clipboard fallback.

## Navigate the canvas

- Two-finger trackpad drag, plain scroll wheel, or middle-click drag = pan
- Cmd/Ctrl + scroll = zoom
- Click zoom % = reset to 100%; fit-to-screen button available

Work persists to `localStorage` and reloads on next open. Pick a starting point from the **examples** dropdown (Rain, Socrates, Fire, Dog, Witch).

## Operators

| Symbol | Meaning | Typing |
|--------|---------|--------|
| ¬ | not | `!` |
| ∧ | and | `&` |
| ∨ | or | `\|` |
| → | implies | `->` |
| ↔ | iff | `<->` |

Variables are single letters like `p`, `q`, `r`.

## Tests

```bash
npm install
npx playwright install chrome   # real Chrome channel; bundled Chromium renders differently
node test.mjs
```

126 Playwright tests (run headlessly against `file://`) cover: DPLL validity at scale, pattern and fallacy detection, multi-step chain propagation, the cycle guard, persistence, shareable URLs, the proof readout, ARIA autocomplete, and render re-entrancy. Tests seed app state directly through `window.__argBuilder` / `window.__logic` hooks for determinism.

## Tech

Single HTML file (~2100 lines). Vanilla JS. No frameworks, no build step. Validity engine is a hand-written DPLL SAT solver with CNF conversion.
