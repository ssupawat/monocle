# Argument Builder — TODO

A learning tool for propositional logic. Single-file vanilla JS (`index.html`),
warm-paper palette (3 shades + indigo / teal / red). Every task below respects
those constraints — no framework, no second file, no palette change.

---

## Who is the learner?

- Intro-logic students (philosophy, CS discrete math, critical thinking) working
  through textbook problems on validity, fallacies, and natural-deduction chains.
- Self-learners reading something like *forall x* or *How to Prove It* who want a
  scratchpad to confirm an argument is valid before trusting it.
- Instructors demonstrating one step at a time in lecture.
- Curious people poking at fallacies they've heard named ("affirming the
  consequent") and want to *see* break.

They share a profile: **they don't yet trust their own intuitions**, so the tool
has to make the verdict feel earned — show the counterexample, show the row,
name the pattern.

---

## Use cases

Each scenario is one concrete thing a learner sits down to do. After the goal,
the **Friction today** line names what the current app makes harder than it
should be.

### UC1 — Verify Modus Ponens (`p, p→q ⊨ q`)
Goal: confirm the canonical valid form, see *why* it's valid.
Friction today: works out of the box (preloaded). No "this is the Modus Ponens
pattern" label, so the learner who came in *looking for it* has to take it on
faith that the green badge corresponds to the name they know.

### UC2 — Verify Modus Tollens (`p→q, ¬q ⊨ ¬p`)
Goal: build the second-most-canonical form themselves.
Friction today: must discover `!` or `~` from the help panel to type `¬`. No
preset — the learner must type it from scratch right after the MP preset already
showed them what success looks like. Easy to mistype `~q` vs `¬q` or fumble
operator precedence.

### UC3 — Chain a hypothetical syllogism (`p→q`, `q→r ⊨ p→r`) as multiple steps
Goal: derive `q` from `p, p→q` (Step 1), then derive `r` from `q, q→r` (Step 2),
reusing the derived `q` as a premise in Step 2.
Friction today: re-use of a Derived block as a premise is only described in a
sentence of help text. There's no visual nudge that says "this block is now
usable." Worse, each step is verified independently — if Step 1 is *invalid*,
Step 2 can still display "✓ Valid" because the check assumes its premises. A
learner reading "Step 2 ✓" without context will think the whole proof is sound.

### UC4 — See affirming-the-consequent fail (`p→q, q ⊨ p`)
Goal: build the fallacy, watch the counterexample appear.
Friction today: the counterexample list shows `p=F, q=T` — correct, but the
learner has to mentally map "F means false" and re-check that the premises do
hold there. No plain-English sentence like *"when p is false and q is true, both
premises are true but the conclusion is false."* No "this is the
affirming-the-consequent fallacy" label either.

### UC5 — See denying-the-antecedent fail (`p→q, ¬p ⊨ ¬q`)
Goal: same as UC4 for the dual fallacy.
Friction today: same as UC4. Both fallacies share an `¬` typing problem too.

### UC6 — Reductio: show that an assumption leads to contradiction
Goal: assume `p`, derive both `q` and `¬q` somewhere downstream, conclude `¬p`.
Friction today: the model has no symbol for ⊥ / contradiction and no notion of
"discharge an assumption." A learner can fake it by deriving `q ∧ ¬q` as a
target, but there's no preset, no guidance, and the resulting graph won't look
like the textbook proof shape. This is a genuine model limitation — flag it
honestly rather than pretending to support it.

### UC7 — Find a counterexample to a candidate argument
Goal: "I think this might be invalid — show me a world where it breaks."
Friction today: works. The compact list of CE assignments and the ⚠ row in the
Derived block's truth table together cover it. But the side-panel list and the
truth-table row aren't linked — clicking a CE doesn't scroll to or highlight the
row, and the truth-table view is collapsed by default.

### UC8 — Explore / sandbox: type formulas, look at truth tables
Goal: "is `(p → q) ↔ (¬p ∨ q)` a tautology?"
Friction today: works once you click `table`. Discovery is fine. But there's no
quick verdict above the table ("tautology", "contradiction", "contingent") — the
learner has to scan the φ column themselves.

### UC9 — Demonstrate logical equivalence (e.g. De Morgan: `¬(p∧q) ≡ ¬p∨¬q`)
Goal: show both directions entail each other.
Friction today: requires building the argument twice (one ⊨ each way). Works,
but the two halves aren't visually grouped, and there's no "≡" badge that pops
up once both directions are valid.

### UC10 — Come back tomorrow / share with a classmate
Goal: close the tab, reopen, find work intact. Or paste a link in a chat.
Friction today: **nothing persists.** Refresh loads Modus Ponens and discards
everything. This is the single highest-friction moment in the whole app.

---

## Tasks

Each task is one concrete, verifiable change tied to one or more use cases.
Verifiable = you can write a test in `test.mjs` (or check by eye) that says
"this is now true."

### P0 — without these, the tool fails its core promise

#### P0-1 — Add a preset library (Modus Tollens, HS, DS, AC-fallacy, DA-fallacy)
Replace the single "Load Modus Ponens" button with a small dropdown or a row of
preset chips. Each preset wires up blocks + ∧/⊨ wires the same way `loadExample`
already does.
- Verifiable: clicking "Modus Tollens" produces `p→q`, `¬q ⊨ ¬p` with a ✓
  badge; clicking "Affirming Consequent" produces an ✗ badge with one
  counterexample.
- Rationale: covers **UC2, UC4, UC5, UC13** and gives UC1 a sibling so the
  learner immediately has more than one thing to compare against.

#### P0-2 — Persist state to `localStorage`
Auto-save `state.blocks`, `state.wires`, `state.expanded` on every mutation
(debounce ~200 ms). Restore on boot; only call `loadExample()` if nothing is
stored. Add a small "Reset" affordance so the learner can opt back to the empty
canvas.
- Verifiable: build any argument, refresh, see it intact.
- Rationale: **UC10**. The highest-impact, lowest-cost fix. Refresh-as-data-loss
  is the worst feeling in any learning tool.

#### P0-3 — Operator palette for typing `¬ ∧ ∨ → ↔`
Add a small inline row of clickable symbol buttons near the focused block input
(or as a thin always-on chip strip below the input). Clicking inserts the symbol
at the caret. Use the existing `--ink` / `--muted` palette; no new colors.
- Verifiable: clicking the `→` chip in an empty block produces `→` in the
  textbox without the learner ever touching the help panel.
- Rationale: every use case that involves *building* an argument (UC2, UC4–9)
  starts with this. On a Mac keyboard, typing `→` is impossible without help;
  even `¬` requires knowing `!` or `~` is accepted.

#### P0-4 — Plain-language counterexample sentence
Above the existing tuple list in the verdict panel, add one sentence for the
first counterexample: *"When p is false and q is true, both premises are true
but the conclusion q is false."* Use the parsed premise/conclusion labels.
- Verifiable: an AC fallacy step renders a one-sentence explanation referencing
  the right variable assignment and the conclusion's surface form.
- Rationale: **UC4, UC5, UC7**. Tuples are correct but require translation; the
  sentence is what *teaches*.

### P1 — meaningfully better, not strictly required

#### P1-1 — Overall proof verdict + propagate broken steps down chains
Add an "Overall: ✓ Proof valid / ✗ Step N invalid" line at the top of the
verdict panel that is ✓ only when every step is valid. On a Derived block whose
own step is valid but whose upstream chain isn't, replace the green "✓ valid"
chip in the block body with "⚠ depends on invalid Step N."
- Verifiable: build a chain where Step 1 is the AC fallacy and Step 2 uses its
  Derived block; Step 2's block shows the ⚠ chip and the overall verdict is ✗.
- Rationale: **UC3**. Fixes a real soundness-perception bug: today a learner
  can read "Step 2 ✓" and walk away thinking their proof works.

#### P1-2 — Detect and label classic patterns
A small classifier on each step: given the parsed premises and conclusion, match
Modus Ponens, Modus Tollens, Hypothetical Syllogism, Disjunctive Syllogism,
Affirming the Consequent, Denying the Antecedent (up to consistent variable
renaming). When matched, show a tag next to the Step N header — green for the
valid forms, red for the fallacies (palette already supports both).
- Verifiable: building MP from scratch (without using the preset) tags Step 1
  as "Modus Ponens"; building AC tags it as "Affirming the Consequent (fallacy)".
- Rationale: **UC1, UC2, UC4, UC5**. Names what the learner sees and connects
  the visual to the textbook vocabulary.

#### P1-3 — Tautology / contradiction / contingent badge on single-block tables
When a non-Derived block's table is expanded, show a small badge above it:
"tautology" / "contradiction" / "contingent" based on the φ column.
- Verifiable: expand the table for `(p → q) ↔ (¬p ∨ q)` — see "tautology".
- Rationale: **UC8**. Saves the learner from scanning the φ column manually,
  which is the whole reason they opened the table.

#### P1-4 — Parse errors with caret position
Capture `i` in `tokenize` at the moment of throw; in `parse`, capture token
index. Render the error as `'at position 4: Unexpected character "x"'` and, in
the block, underline or highlight the offending span.
- Verifiable: typing `p &&& q` shows "at position 4" in the err line.
- Rationale: **UC2, UC8**. Today's errors say *what* but not *where*; for a
  beginner that's the difference between "I'll fix it" and "I'll give up".

#### P1-5 — Highlight premises-true rows in single-block truth tables
When a block is part of an active premise cluster, dim rows where its formula is
false in its expanded truth table, so the "relevant worlds" stand out.
- Verifiable: in MP, expand the `p → q` block — the row `p=T, q=F` (where the
  formula is false, hence irrelevant) is visibly de-emphasized.
- Rationale: **UC7, UC8**. Teaches the implicit "we only care about
  premises-true rows" rule that makes validity click.

### P2 — nice-to-haves once the above ships

#### P2-1 — Shareable URL (state encoded in hash)
Encode `{blocks, wires, expanded}` into the URL hash (base64-of-JSON is enough
for now); decode on boot before consulting localStorage.
- Verifiable: copy URL, paste in incognito, see the same argument.
- Rationale: **UC10**. Lets a student paste their work into a study-group chat.

#### P2-2 — Equivalence badge when both directions ⊨ valid
If both `A ⊨ B` and `B ⊨ A` exist and are valid, show a `≡` badge linking the
two steps in the verdict panel.
- Verifiable: build De Morgan in both directions, see the ≡ badge appear.
- Rationale: **UC9**.

#### P2-3 — Click a counterexample row to highlight it in the Derived block's table
Wire the side-panel CE list items to the corresponding ⚠ row: clicking expands
the Derived block's table (if collapsed) and scrolls/flashes that row.
- Verifiable: click a CE entry in the panel → matching `⚠` row briefly flashes.
- Rationale: **UC7**. Closes the loop between the abstract assignment and the
  visible row in the table.

#### P2-4 — Reductio: explicit `⊥` target + honest limitation note
Add `⊥` to the operator palette as a reserved propositional constant (always
false). A step whose target is `⊥` is read as "premises are inconsistent." Add
a one-line note in the help panel that the tool does not model assumption
discharge — for full reductio, the learner still has to do the outer step on
paper.
- Verifiable: building `p, ¬p ⊨ ⊥` shows ✓; help panel explains the caveat.
- Rationale: **UC6**. Be honest about the model's limits while giving the
  learner the most useful piece they can use.

#### P2-5 — Touch-friendly drag + tap-to-link
Replace `mousedown`/`mousemove`/`mouseup` with pointer events so the canvas
works on tablets.
- Verifiable: drag a block on an iPad; tap "∧ Link" and tap a target block.
- Rationale: classroom demos and self-study often happen on tablets.

---

## Out of scope (don't propose these)

- First-order / predicate logic (∀, ∃) — would require a different evaluator and
  a different visual model.
- Natural-deduction line-by-line proof checker — different UX category;
  argument-graph is the thesis of this tool, don't bolt on a second one.
- Server, auth, multi-user sync — vanilla single-file is a feature.
- Visual redesign or palette swap — the design choices are deliberate.
