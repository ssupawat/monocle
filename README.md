# 🧐 Monocle

Interactive tool for learning propositional logic. Drag blocks, wire premises to a conclusion with lasso-select + click-to-conclude, and check argument validity with a DPLL SAT solver. Build multi-step chains, spot inference patterns and fallacies, and read the whole argument back as a numbered proof.

Open `index.html` in a browser. Single file, vanilla JS, no build step.

## Build an argument

1. Click **+ Add block** to create premise blocks. Type formulas like `p → q`.
2. **Lasso-select** premise blocks by dragging on empty canvas.
3. **Click a block** to set it as the conclusion. The selected premises now entail it.

A concluded block can itself be a premise in the next step, so chains compose: `{A, A→B} ⊨ B`, then `{B, B→C} ⊨ C`, and so on.

## Reading a step on the canvas

Each step is drawn as one unit: a dashed bracket around the premises it draws on, a wire into the conclusion, and the turnstile riding that wire. All three carry the step's own verdict — **⊨ green** when it holds, **⊭ red** when a counterexample exists, and neutral grey while it cannot be judged (an unparseable formula upstream). The negated turnstile means the verdict never rests on colour alone.

A step that does not hold is drawn as a link that does not carry: the solid line runs out partway, ⊭ sits in the break, and what continues past it is dashed, faded and ends in a hollow arrowhead that never lands. Where the wire is too short to hold the mark, it stays whole — still dashed, still hollow-tipped — rather than showing an empty gap that would read as a rendering fault.

Click a wire to select the step: it gains a casing, and the turnstile gives way to a delete control that sits in the same place (`Delete` also removes the selected step). Selecting never changes how a verdict is drawn — the casing breaks with the wire, so a severed step stays visibly severed.

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

## Appearance

Light and dark themes. The toolbar toggle switches between them and remembers the choice in `localStorage`; with no choice saved the app follows the OS setting and tracks changes to it live. The theme is resolved before first paint, so a dark-mode reload never flashes white.

Colour carries meaning consistently: the interface accent (indigo) is never a verdict, **green means the step holds**, **red means a counterexample exists**. A derived block's frame, header, premise bracket and incoming wire all take the colour of its own verdict — an invalid step is red end to end, never a green frame around a false conclusion. Indigo is left to mean "selected", and nothing else.

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

155 Playwright tests (run headlessly against `file://`) cover: DPLL validity at scale, pattern and fallacy detection, multi-step chain propagation, the cycle guard, persistence, shareable URLs, the proof readout, ARIA autocomplete, render re-entrancy, theme persistence, and the verdict-coloured blocks and wires. Tests seed app state directly through `window.__argBuilder` / `window.__logic` hooks for determinism.

## Tech

Single HTML file. Vanilla JS. No frameworks, no build step. Validity engine is a hand-written DPLL SAT solver with CNF conversion.

Styling is one token layer (`:root` for light, `[data-theme="dark"]` for dark) that every rule resolves through, so the dark theme is a token swap rather than a second stylesheet. Icons are an inline SVG sprite — the page requests no icon webfont, so it renders identically offline and over `file://`.
