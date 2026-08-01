# Hallmark audit · Celestea `/crear` · learning flow 1.7

Date: 2026-08-01

Verb: `redesign`

Route: custom, bespoke

Macrostructure: case anchor → direct contrast → supported calibration → split independent proof → delayed retest

Audience: Mexican prepa students, primarily on a phone

Tone: warm, cinematic, quiet

## Design decision

This pass keeps the approved “chalk over film” system but changes what the
screen helps the learner hold in working memory and what the product can
honestly infer:

- the opening names an observable outcome instead of an internal lesson
  concept, states a concrete learning goal, and anchors the case with one
  functional school-poster illustration;
- the contrast asks one direct question before the rule is explained;
- guided practice keeps one clue, one visual cue, one incomplete sentence, and
  the three fixed term positions in the same viewport;
- Spanish support swaps the clue in place; it does not add a striped callout or
  move the task;
- the learner-paced voice bridge creates a real boundary before a new case;
- transfer separates certainty calibration from English modal form, so one
  fluent sentence cannot hide a wrong inference;
- the production and D7 screens keep their source clue visible instead of
  asking the learner to remember it from the previous screen;
- the seven-day retest independently repeats both the certainty decision and
  the English production on a third case;
- hand-built SVGs communicate poster, model, presence, location, glue, and
  travel. They are functional evidence anchors, not generic decoration;
- the compact voice control exposes playback state without reintroducing an
  audio card or visible transcript block;
- the Day 7 header centers its label and removes a clipped one-letter
  wordmark found in the rendered review.

## Evidence contract

The UI now records descriptive observations, not a universal mastery score.
Every authored learning opportunity identifies:

- construct: evidence comprehension, certainty calibration, or modal form;
- condition: supported or independent;
- novelty: same case or new case;
- timing: immediate or delayed.

The local evidence ledger and existing telemetry contract preserve these
dimensions. Translation, guide use, and corrected map answers remain marked as
assisted. Independent transfer and D7 decisions advance without revealing
correctness before the paired English production.

## Pre-emit self-critique

| Axis | Score | Evidence |
|---|---:|---|
| Philosophy | 5 | Every screen either reduces extraneous memory load or produces a named learning observation. |
| Hierarchy | 5 | Each viewport presents one decision, one visible source of evidence, and one primary action. |
| Execution | 5 | Rendered review caught and removed duplicated production copy and the clipped D7 wordmark; geometry and motion regressions pass. |
| Specificity | 5 | Authored school cases, visual clue states, Spanish support, and certainty language are intrinsic to this lesson. |
| Restraint | 5 | No new cards, stripes, ornamental dividers, pills, or runtime-generated copy were introduced. |
| Variety | 5 | The fingerprint adds a split evidence check and delayed paired retest rather than repeating the prior completion-only flow. |

Stamp: `P5 H5 E5 S5 R5 V5`.

## 58-gate result

**58 / 58 passed.** Every Hallmark question resolves to “No” for the active
surface.

| Gates | Result | Verification |
|---|:---:|---|
| 1–9 | Pass | Existing Bricolage/Jakarta system retained; no gradient text, card grid, nested cards, side stripe, centered generic hero, pure base extremes, or repeated page template. |
| 10–19 | Pass | No transition-all, universal hover scale, overshoot, layout-property motion, delayed focus ring, redundant toast, auto-carousel, placeholder person, or startup cliché. |
| 20–27 | Pass | Updated custom stamp and macrostructure; tinted semantic tokens, named spacing, explicit control states, and reduced-motion fallback remain. |
| 28–31 | Pass | Founder wave remains silent, poster-backed, and atmospheric; illustrations are hand-built semantic SVGs; Lucide is the only icon library; no Lottie. |
| 32–39 | Pass | New interaction fingerprint logged; SVG wrapper has an accessible name and visual canvas is hidden; no horizontal overflow; form and term geometry stay stable. |
| 40–49 | Pass | Existing contrast pairs remain legible; N9 utility header, no footer, no invented claims or fake chrome; clickable labels stay on one line. |
| 50–57 | Pass | 320, 375, 414, 768, 812 landscape, and 1280 widths pass; no unsafe image track, radio scroll jump, eyebrow row, sticky collision, cap collision, or studied-DNA loss. |

## Runtime and visual verification

- `npm run typecheck` — passed.
- `npm run lint:workshops` — passed with six unrelated legacy warnings.
- `pnpm exec playwright test tests/e2e/crear-english-deduction.spec.ts`
  — 12/12 passed.
- Motion matrix: 3/3 initial selections and 6/6 directed swaps passed with
  stable source slots, stable sentence geometry, matching font metrics, and
  traveler cleanup.
- Viewports: 320×812, 375×812, 414×896, 768×1024, 812×375, and 1280×800.
- Arrival and independent production also pass at their dedicated responsive
  matrices; no tested viewport has horizontal overflow.
- At 320×812 with the root type scaled to 125%, production remains reachable
  through ordinary vertical scrolling and still has no horizontal overflow.
- Translation preserves clue height within 2 CSS pixels and adds no side
  border.
- Touch: term, translation, voice, and primary controls keep at least a 44 CSS
  pixel target.
- Pointer drag and tap remain equivalent; drag is never mandatory.
- Reduced motion remains covered.
- Arrival narration: mono 22.05 kHz 16-bit local WAV, 13.58 seconds. Its authored
  Spanish script is versioned in lesson JSON and can be replaced by the
  founder's ElevenLabs voice without a runtime change.
- Static scan: no `transition-all`, overshoot easing, ornamental horizon rule,
  mid-component color/font improvisation, or unlabelled new SVG surface.

Rendered artifacts:

- `test-artifacts/celestea-hallmark-arrival-375.png`
- `test-artifacts/celestea-v16-guided-map-mobile.png`
- `test-artifacts/celestea-v16-translation-mobile.png`
- `test-artifacts/celestea-v17-transfer-bridge-mobile.png`
- `test-artifacts/celestea-v17-independent-certainty-mobile.png`
- `test-artifacts/celestea-v17-production-mobile.png`
- `test-artifacts/celestea-v17-d7-certainty-mobile.png`
