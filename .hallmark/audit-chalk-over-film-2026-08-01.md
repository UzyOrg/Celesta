# Hallmark audit · Celestea `/crear` · learning flow 1.9.1

Date: 2026-08-02

Verb: `redesign`

Route: custom, bespoke

Macrostructure: case promise → neutral three-touch baseline → compact diagnostic contrast → supported calibration → split independent proof → delayed retest

Audience: Mexican prepa students, primarily on a phone

Tone: warm, cinematic, quiet

## Design decision

This pass keeps the approved “chalk over film” system but changes what the
screen helps the learner hold in working memory and what the product can
honestly infer:

- the opening frames a concrete challenge — discover who may have worked on
  the poster and explain it in English — before naming the case;
- the opening and precheck use one purposeful heading each: the precheck's
  three-decision promise is set at 22 px and its duplicate helper line is gone;
- before the English labels appear, a neutral Spanish pre-check asks three
  one-tap certainty decisions from the same school case; it gives no
  correctness feedback, reserves each clue's height, and resumes after a
  reload without making the learner repeat an answered item;
- the contrast is one bounded diagnostic surface: sentence A, sentence B,
  emphasized `must have`, and its authored audio remain together, with the
  direct prompt “¿Qué comunica la frase B?”;
- the answer choices are tactile rows separated by space rather than seven
  horizontal rules, and the prompt no longer reveals the answer before the
  learner responds;
- guided practice keeps one clue, one visual cue, one incomplete sentence, and
  the three fixed term positions in the same viewport;
- the authored `must have` clue now contains an eyewitness signal, separating
  strong evidence from an open `might have` possibility;
- Spanish support swaps the clue in place; it does not add a striped callout or
  move the task;
- the learner-paced voice bridge confirms completion before a new case;
- transfer separates certainty calibration from English modal form, so one
  fluent sentence cannot hide a wrong inference;
- the production and D7 screens keep their source clue visible instead of
  asking the learner to remember it from the previous screen;
- the seven-day retest independently repeats both the certainty decision and
  the English production on a third case;
- hand-built SVGs communicate poster, model, presence, location, glue, and
  travel. They are functional evidence anchors, not generic decoration;
- the compact voice control sits inside sentence B without reintroducing an
  audio card or visible transcript block;
- the locked Day 7 screen keeps its header, copy, date, and action inside
  logical safe-area gutters at every tested mobile width.
- the in-flow header uses a segmented progress bar and a visible `n de 3`
  status instead of three ambiguous circles;

## Evidence contract

The UI now records descriptive observations, not a universal mastery score.
Every authored learning opportunity identifies:

- construct: evidence comprehension, certainty calibration, or modal form;
- condition: supported or independent;
- novelty: same case or new case;
- timing: immediate or delayed.

The baseline has its own honest label: `pre_check`, `independent`,
`same_case`, and `immediate`. Each touch records its answer, correctness for
later analysis, and item latency. It does not expose the authored category or
teach the English mapping before the contrast.

The local evidence ledger and existing telemetry contract preserve these
dimensions. Translation, guide use, and corrected map answers remain marked as
assisted. Independent transfer and D7 decisions advance without revealing
correctness before the paired English production.

## Pre-emit self-critique

| Axis | Score | Evidence |
|---|---:|---|
| Philosophy | 5 | The baseline measures prior certainty without turning an introduction into a test or teaching the answer early. |
| Hierarchy | 5 | Each viewport presents one clue, one certainty decision, and one primary action. |
| Execution | 5 | Rendered review confirms the compact baseline, 52–56 px targets, no 320 px overflow, reload resumption, and opacity-safe reduced motion. |
| Specificity | 5 | Authored school cases, neutral Spanish certainty language, visual clue states, and English mapping are intrinsic to this lesson. |
| Restraint | 5 | Three taps replace free production; no result card, stripe, icon decoration, filler heading, or premature explanation is added. |
| Variety | 4 | The approved route stays cohesive while the baseline uses a distinct one-question-at-a-time diagnostic structure. |

Stamp: `P5 H5 E5 S5 R5 V4`.

## 58-gate result

**58 / 58 passed.** Every Hallmark question resolves to “No” for the active
surface.

| Gates | Result | Verification |
|---|:---:|---|
| 1–9 | Pass | Existing Bricolage/Jakarta system retained; no gradient text, card grid, nested cards, side stripe, centered generic hero, pure base extremes, or repeated page template. |
| 10–19 | Pass | No transition-all, universal hover scale, overshoot, layout-property motion, delayed focus ring, redundant toast, auto-carousel, placeholder person, or startup cliché. |
| 20–27 | Pass | Updated custom stamp and macrostructure; tinted semantic tokens, 45ch prose measure, named spacing, eight previewed control states, and reduced-motion fallback remain. |
| 28–31 | Pass | Founder wave remains silent, poster-backed, and atmospheric; illustrations are hand-built semantic SVGs; Lucide is the only icon library; no Lottie. |
| 32–39 | Pass | Component scope preserves the approved macrostructure while adding the distinct three-touch diagnostic; no decorative SVG is added, no horizontal overflow occurs, and the native radios retain focus, active, and disabled states without a scroll jump. |
| 40–49 | Pass | Existing contrast pairs remain legible; N9 utility header, no footer, no invented claims or fake chrome; clickable labels stay on one line. |
| 50–57 | Pass | 320, 375, 414, 768, 812 landscape, and 1280 widths pass; the baseline's labels stay single-line, all controls fit 320×812, and no unsafe image track, radio scroll jump, eyebrow row, sticky collision, cap collision, or studied-DNA loss appears. |

## Runtime and visual verification

- `npm run typecheck` — passed.
- `npm run lint:workshops` — passed with six unrelated legacy warnings.
- `pnpm exec playwright test tests/e2e/crear-english-deduction.spec.ts`
  — 15/15 passed.
- Motion matrix: 3/3 initial selections and 6/6 directed swaps passed with
  stable source slots, stable sentence geometry, matching font metrics, and
  traveler cleanup.
- Viewports: 320×812, 375×812, 414×896, 768×1024, 812×375, and 1280×800.
- Arrival and independent production also pass at their dedicated responsive
  matrices; no tested viewport has horizontal overflow.
- The contrast keeps both sentences, integrated audio, three choices, and the
  primary action inside 320×812, 375×812, 414×896, and 768×1024.
- The neutral baseline keeps its three 52 px choice targets and 56 px primary
  action inside 320×812, 375×812, 414×896, and 768×1024 with no vertical or
  horizontal overflow. It contains no `must have`, `might have`, or `can't
  have` label and no learner-facing correctness state.
- Reloading after one baseline decision resumes at touch two; telemetry has
  three unique item events (`sofia`, `mateo`, `renata`). Retry delivery can be
  duplicated only at transport level and is intentionally de-duplicated by
  `client_event_id` at ingest.
- The locked Day 7 header, content, date, and primary action retain at least
  16 CSS pixels of horizontal gutter on the mobile matrix.
- At 320×812 with the root type scaled to 125%, production remains reachable
  through ordinary vertical scrolling and still has no horizontal overflow.
- Translation preserves a reserved clue viewport within 2 CSS pixels and adds
  no side border.
- Touch: term, translation, voice, and primary controls keep at least a 44 CSS
  pixel target.
- Pointer drag and tap remain equivalent; drag is never mandatory.
- Reduced motion remains covered.
- Arrival narration: mono 22.05 kHz 16-bit local WAV, 13.58 seconds. Its authored
  Spanish script is versioned in lesson JSON and can be replaced by the
  founder's ElevenLabs voice without a runtime change.
- Static scan: no `transition-all`, overshoot easing, ornamental horizon rule,
  mid-component color/font improvisation, unlabelled new SVG surface,
  side-stripe translation treatment, or baseline correctness copy.

Rendered artifacts:

- `test-artifacts/celestea-hallmark-arrival-375.png`
- `test-artifacts/celestea-hallmark-precheck-320.png`
- `test-artifacts/celestea-hallmark-precheck-375.png`
- `test-artifacts/celestea-hallmark-precheck-414.png`
- `test-artifacts/celestea-hallmark-precheck-768.png`
- `test-artifacts/celestea-hallmark-contrast-375.png`
- `test-artifacts/celestea-v14-guide-mobile.png`
- `test-artifacts/celestea-v16-translation-mobile.png`
- `test-artifacts/celestea-v17-transfer-bridge-mobile.png`
- `test-artifacts/celestea-v17-independent-certainty-mobile.png`
- `test-artifacts/celestea-v17-production-mobile.png`
- `test-artifacts/celestea-v17-d7-certainty-mobile.png`
- `test-artifacts/celestea-hallmark-d7-gate-375.png`
