# Hallmark audit · Celestea `/crear` · fixed certainty motion

Date: 2026-07-31  
Verb: `redesign`  
Route: custom, bespoke  
Macrostructure: fixed source slots → measured bidirectional term completion  
Audience: Mexican prepa students, primarily on a phone  
Tone: warm, cinematic, quiet

## Design decision

This pass corrects the temporal and spacing defects observed in the certainty
map without changing the approved “chalk over film” system:

- three permanent semantic option slots preserve the source position of every
  term;
- choosing or replacing an answer moves only the terms involved; the other
  controls never recenter;
- all three initial paths and all six directed replacement paths use spatial
  motion between measured source and destination rectangles rather than
  opacity-only substitution;
- the bank label, sentence label, and portal traveler share one locked
  typographic token, so the motion never changes font metrics at either end;
- the sentence row reserves the target's full touch height from the empty state,
  aligns the sentence words to one baseline, and keeps the term within 10 CSS
  pixels of its rule;
- the source controls use a 44 CSS-pixel visual/touch surface; their border
  belongs to the control rather than inflating the reserved slot;
- the decorative gradient horizon rule is removed from the renderer and both
  active and fallback CSS;
- title, progress, clue, option bank, and primary action use distinct spacing
  tiers from the existing token scale;
- the transfer voice uses one exact authored script in JSON and the local WAV.

The interaction contract lives with its Playwright regression: screenshots
alone cannot prove a temporal path or a correct resting state.

## Pre-emit self-critique

| Axis | Score | Evidence |
|---|---:|---|
| Philosophy | 5 | Motion now explains cause and destination while stable slots reduce operating burden. |
| Hierarchy | 5 | The task still has one clue, one sentence, one bank, and one primary action. |
| Execution | 5 | Nine temporal paths, final visible terms, traveler cleanup, and all slot rectangles are regression-tested. |
| Specificity | 5 | Semantic certainty terms, school clues, authored voice, and the founder wave remain integral. |
| Restraint | 5 | The gradient horizon line is removed and no replacement decoration was added. |
| Variety | 5 | This is a deliberate stateful interaction contract, not a repeated page template. |

Stamp: `P5 H5 E5 S5 R5 V5`.

## 58-gate result

**58 / 58 passed.** Every Hallmark question resolves to “No” for the active
surface.

| Gates | Result | Verification |
|---|:---:|---|
| 1–9 | Pass | Existing Bricolage + Jakarta system retained; no gradient text, card grid, nesting, side stripe, centred hero, pure base extremes, or duplicated macrostructure. |
| 10–19 | Pass | No transition-all, universal hover scale, overshoot, layout-property animation, delayed focus, redundant toast, autoplay carousel, placeholder person, or startup cliché. |
| 20–27 | Pass | Custom stamp retained; tinted tokens and named spacing used; readable measure, complete control states, and reduced motion remain authored. |
| 28–31 | Pass | Founder wave remains muted and poster-backed; the audio is pre-generated; Lucide remains the sole icon set; no Lottie. |
| 32–39 | Pass | New interaction fingerprint logged; decorative media is hidden; no horizontal overflow; typography and input geometry remain stable. |
| 40–49 | Pass | Existing contrast pairs pass; N9 utility header, no footer, no invented claims or fake chrome; CTA labels stay on one line. |
| 50–57 | Pass | 320, 375, 414, and 768 px checks pass; no unsafe image grid, scroll-jump tabs, eyebrow row, sticky collision, uppercase collision, or studied-DNA loss. |

## Runtime and visual verification

- `npm run typecheck` — passed.
- `npm run lint:workshops` — passed with six unrelated legacy warnings.
- `npx playwright test tests/e2e/crear-english-deduction.spec.ts --project=mobile-chrome`
  — 11/11 passed.
- Motion matrix: 3/3 initial selections and 6/6 directed swaps passed.
- Typography matrix: source, traveler, and sentence match in family, size,
  weight, tracking, line-height, and text transform during motion.
- Geometry matrix: the sentence `x`, `y`, `width`, and `height` remain stable
  before, during, and after every initial selection and directed replacement.
- Touch matrix: source controls remain at least 44 CSS pixels high after the
  visual compaction.
- Geometry: `x`, `y`, `width`, and `height` remain stable for all three option
  slots after selection, replacement, and clearing.
- Viewports: 320×812, 375×812, 414×896, 768×1024, 812×375, and 1280×800.
- Horizontal overflow: none at every tested viewport.
- Core practice vertical overflow: none at 320×812, 375×812, and 414×896.
- Touch: term and translation controls remain at least 44 CSS pixels tall.
- Reduced motion and real pointer drag remain covered.
- Transfer bridge: mono 24 kHz 16-bit WAV, 14.43 seconds.
- Static scan: no `horizonLine`, `transition-all`, overshoot easing, or
  mid-component color/font improvisation in the active interaction files.

Visual artifact:

- `test-artifacts/celestea-v161-fixed-term-slots-mobile.png`
