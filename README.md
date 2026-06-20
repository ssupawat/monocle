# 🧐 Argument Builder

Interactive tool for learning propositional logic. Drag blocks, wire them with lasso-select + click-to-conclude, and check argument validity via truth tables.

## Use

Open `index.html` in a browser. No build step.

**Build an argument:**
1. Click **+ Add block** to create premise blocks. Type formulas like `p → q`.
2. **Lasso-select** premise blocks by dragging on empty canvas.
3. **Click a block** to set it as the conclusion. The selected premises now entail it.

**Navigate the canvas:**
- Two-finger trackpad drag, plain scroll wheel, or middle-click drag = pan
- Cmd/Ctrl + scroll = zoom
- Click zoom %  = reset to 100%

**Check validity:**
- Valid = no truth assignment where all premises are true and conclusion is false
- Truth table on each derived block shows premise columns + conclusion + conditional φ
- Steps group into branches; each branch shows its own verdict
- Trivial badge = conclusion is already a premise (valid but adds nothing)

## Features

- Semantic validity checking via exhaustive truth tables
- Pattern detection: Modus Ponens, Modus Tollens, Hypothetical Syllogism, Disjunctive Syllogism
- Fallacy detection: Affirming the Consequent, Denying the Antecedent
- Multi-step chains (derived blocks can be reused as premises)
- Counterexample display with plain-English explanation
- localStorage persistence

## Operators

| Symbol | Meaning | Typing |
|--------|---------|--------|
| ¬ | not | `!` |
| ∧ | and | `&` or `·` |
| ∨ | or | `\|` |
| → | implies | `->` |
| ↔ | iff | `<->` |

Variables are single letters like `p`, `q`, `r`.

## Tests

```bash
npm install
node test.mjs
```

38 Playwright tests cover: validity, halo rendering, chain propagation, cycle guard, pattern detection, persistence.

## Tech

Single HTML file. Vanilla JS. No frameworks, no build step.
