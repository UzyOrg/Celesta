# Celestea · Current State

Last updated: 2026-08-09

This is a compact handoff for a fresh Codex task. It records the current
checkpoint, not permanent repository policy. Read `AGENTS.md` first; it wins
over deprecated documents in this repository.

## Product decision

Celestea is a B2C, voice-first learning companion for Mexican prepa students.
The current MVP uses English deduction at B1+/B2 as the test domain, not as the
entire long-term company.

The learning loop is:

1. discover the distinction;
2. practice with feedback;
3. apply it to a new case (transfer);
4. return for a durable retest.

The product must reduce cognitive and emotional friction without making the
learning evidence dishonest. Transfer and the later retest matter more than
completion, surveillance, streaks, or decorative gamification.

## Current MVP

Route: `/crear`

Lesson: `CREAR-ENGLISH-DEDUCTION-V1`, content/audio version
`2026-08-07-medicion-separada`, lesson version `1.17.1`.

Content and audio versions must stay identical. `audioAssetsReady` in
`CinematicEnglishPlayer.tsx` compares them and disables the entire voice layer
when they diverge, so a content bump without an audio decision silently removes
narration from every scene.

`content_version` moved in 1.15.0, and it had to. It is the `localStorage` key
for study state, and a baseline collected under the old translation-framed copy
is not comparable with one collected under the corrected copy — keeping both in
one partition would be worse than losing them. Pilot data is still zero, so the
bump is free. No audio script changed, so both versions moved together and the
voice layer stays on. **The freeze resumes from this bump** — no further
`content_version` change until all five pilot learners have completed the day 7
retest. Every bump partitions the cohort, and n=5 cannot absorb a single
partition. See `docs/adr/0003-sincronizacion-audio-copy-y-documentos.md`,
`docs/adr/0005-el-gate-compromete-la-certeza-la-pone-el-alumno.md` and
`docs/adr/0006-medir-forma-y-certeza-por-separado.md`.

Lesson 1.17.1 makes a presentation-only polish: the baseline helper now reads
*“Todavía no, también es una respuesta.”*, title wrapping is natural rather
than balanced, and active `/crear` type roles use the documented token scale.
No narration script or measurement construct changed, so `content_version` and
`audio_asset_version` remain pinned together at `2026-08-07-medicion-separada`
under ADR 0003; the pilot cohort stays in one local-state partition.

The current session contains:

- a direct Spanish orientation that frames one concrete challenge: discover
  who may have worked on the poster and explain it in English;
- a precheck with a 28 px screen title, 14 px supporting copy and short clues,
  an 18 px question, and 16 px controls before instruction; the hierarchy is
  lighter without making the decision controls harder to read;
- a neutral, Spanish three-touch pre-check before instruction: one visible
  school clue at a time, three certainty choices, no English modal labels and
  no learner-facing correctness feedback; each touch records its answer and
  latency as independent/same-case/immediate evidence and resumes after a
  reload;
- a pre-instruction production baseline on its own screen (`precheck-production`,
  the Camila/blackboard case, which appears nowhere else): a closed
  self-efficacy gate that names the target deduction rather than the clue and
  asks for the **degree** of certainty, exactly as transfer and retest will
  (*"¿Podrías escribir en inglés qué tan seguro es que fue Camila quien lo
  borró?"* → Sí / Todavía no) and nothing else on screen until it is answered —
  no field,
  no CTA, no skip exist in the DOM before that. Answering discloses the field
  and **one** primary action, and the gate answer decides what that action
  does. After *"Sí"* it reads *"Guardar y continuar"* and stays disabled until
  the field holds non-whitespace text, with a hint naming the way out
  (*"Si no te sale, elige «Todavía no». También es una respuesta."*); after
  *"Todavía no"* it reads *"Continuar sin escribir"* and an empty submission
  stays a measured behaviour. Offering the same escape after both answers
  priced the belief measure at zero and collapsed it into the behaviour
  measure. Nobody is trapped: both gate buttons stay live, and moving to
  *"Todavía no"* is a recorded second gate event, not a leak. The field carries
  one line — *"Esto no se califica."* — because that is the only sentence there
  that changes behaviour; the gate already says what to write. Asserting the
  certainty here instead of asking for it made the baseline easier than the
  transfer and turned part of the closing comparison into an artifact of the
  prompt. It measures without teaching: no guide, no classifier, no corrective
  feedback, raw text preserved for hand labelling;
- a compact diagnostic contrast that asks directly what sentence B communicates
  and keeps sentence A, sentence B, the emphasized `must have`, and authored
  audio inside one semantic surface;
- three tactile answer rows whose distractors distinguish observation,
  inference, and obligation without revealing the answer in explanatory copy;
- a consultable explanation headed by “La forma cambia según la fuerza de la
  evidencia.” for `must have`, `might have`, and `can't have`. The structural
  rule is stated **once**, by the formula rail, which now sits directly under
  the heading and before the three-force selector. The rail reads as one
  annotated sentence rather than three columns of text, and its middle slot
  swaps with every force — that swap is the teaching mechanism. Its third label
  is *"acción en participio"* because the expected errors are `might has
  worked` and `might have work`, not only the wrong modal. The flat paragraph
  that used to restate the same rule at the top is gone;
- a low-friction certainty interaction that keeps each clue beside its
  incomplete sentence and validates one decision at a time;
- a three-term word bank with permanent source slots: the chosen term visibly
  travels into the sentence, its original space remains reserved, and changing
  an answer uses two explicitly measured paths for the outgoing and incoming
  terms without recentering untouched options; all three term states share one
  locked typographic token so the transition does not change font metrics; the
  sentence row reserves its target height and keeps the term close to its rule;
- optional, pre-authored Spanish translations that replace the English clue
  in the same stable text area and are recorded as assistance;
- specific, local error feedback without clearing other answers or creating a
  multi-error review loop;
- a consultable guide whose use is recorded as assisted;
- a learner-paced, voiced bridge whose heading is the recording's own sentence
  — *“Cambia el caso, no la idea.”* — and whose body names both objects (*“Ya
  resolviste el cartel con ayuda. Ahora la maqueta de la feria, con menos
  apoyo.”*). It explains **why** the case changes rather than counting the
  tasks ahead; screen and voice say the same thing for the first time;
- a guided transfer map on a genuinely new school case;
- a separate independent certainty decision followed by independent English
  production, so evidence calibration and modal form are not collapsed into
  one score. From 1.17.0 that separation reaches the **scoring**, not only the
  screens: a production attempt is read twice. The classifier branch decides
  which authored feedback the learner sees; `readModalForm` decides what the
  ledger records — `expressedCategory`, `wellFormed`, `subjectPresent` — from
  the authored `productionTarget`. Before that, `misconcepcion_certeza` marked
  `modal_form` wrong, so a flawless `must have` carrying the wrong certainty
  was filed as a form error and the receipt told the learner so. Telemetry also
  carries `certaintyConsistent`: whether the written modal matches the decision
  made one screen earlier, which is a different question from whether that
  decision was right. `productionTarget` is fail-closed — a step declaring
  `modal_form` without it does not validate. From 1.12.0 both Nora screens and both Emi screens present the
  clue in English in `display.body` with the Spanish support in
  `caseArtifact.cue.detail`, so the final measurement no longer changes the
  language of the stimulus relative to practice. From 1.13.0 all four of those
  screens also **state the proposition in Spanish inside the question**
  (*“¿Qué tan segura es esta conclusión: Nora trabajó en la maqueta?”*). Asking
  how sure a conclusion is without naming the conclusion added a
  guess-the-proposition task nobody wanted to measure and made a wrong answer
  un-attributable; naming the verb in Spanish removes a vocabulary hunt while
  leaving `modal + have + participle` entirely to the learner. A test now reads
  each step's accepted participles and fails if any of them appears in anything
  that step puts on screen;
- production screens built on **the gap the practice map already taught**. The
  guided map drills `sentenceStart` ␣ `sentenceEnd` with the modal dragged into
  the space; transfer and retest show the same gap in Spanish next to its
  English twin in the placeholder — *“Es … que Nora haya trabajado en la
  maqueta.”* over *“Nora … the model.”* — under one line, *“Escríbelo como hemos
  practicado”*. `haya` + participle rhymes with modal + `have` + participle, so
  the Spanish frame is a mould, not just a blank; it is also the only tense that
  survives all three certainty values. Two earlier framings failed: stating the
  proposition flatly (*“Escribe tu deducción en inglés: Nora trabajó en la
  maqueta.”*) reads as a translation order whose correct output is what the
  classifier scores as an error — and on the retest it asked the learner to
  write a proposition the evidence rules out; naming the certainty outright
  hands back the answer to the calibration step before it, which runs with
  `revealFeedback: false`. The English clue is not reprinted on the production
  screens: it was read one screen earlier and it cost the space the frame needs.
  The retest copy is identical to the transfer copy on purpose, so the day 1 /
  day 7 difference stays attributable to time. From 1.17.0 the retest is a
  genuine **parallel form**, not only identical copy: it changes the case (Emi,
  the entrance mural, a new `mural` artifact) and holds the target certainty at
  `posible`, the same as transfer. Day 1 asking `might have` while day 7 asked
  `can't have` meant a drop between sittings was equally well explained by
  forgetting and by the modal changing, and n≈5 cannot separate those. Two
  schema rules hold it: `productionTarget.category` must match the certainty
  authored on the preceding step, and every `delayed` independent production
  step must target the same certainty as the `immediate` one;
- **per-learner item order.** The pre-check and the guided map rotate their
  items, seeded from `studyId` — stable across reloads, different between
  learners, and recorded as `shownOrder` on every answer event. The authored
  order put every correct answer on the option sharing its position, so tapping
  straight down the column scored 3/3 on the only pre-measure the study has. The
  three certainty options never rotate: they are a scale, and the diagonal lived
  in the item order, not the option order;
- **no case breadcrumb.** The case rótulo shows on `arrival` only. It was
  briefly promoted to persistent chrome to fix a real problem — the case changed
  three times in silence — but that problem already had a better answer:
  `transfer-bridge` narrates the change in Spanish with audio, on its own
  screen, at the moment it happens, and every screen names the person and the
  object in its own body. The breadcrumb was a second, weaker answer charged
  against every screen's width and height. Narrative orientation over chrome
  orientation; the tests now assert its absence so it does not creep back;
- a closing screen shaped as a **receipt**, not a paragraph: a deliverable
  label (*“Lo que guardamos de hoy”*), the two measured dimensions as two
  parallel labelled rows separated by hairlines, and below them the day 1
  baseline sentence next to today's, as one unit where today's carries the
  weight. State is carried by a `lucide-react` icon and typographic hierarchy —
  never a red/green verdict. No score, no percentage, no “1 de 2”. When the
  baseline was skipped the comparison is not rendered and the two-dimension
  block still reads as a finished block;
- production screens that keep the source clue visible and put the primary
  action in the mobile thumb zone;
- a seven-day retest that again separates certainty from English production on
  a third case;
- a typed local evidence ledger that records construct, support condition,
  novelty, timing, **cue frame**, correctness, and assistance without claiming
  universal mastery from one response. `cueFrame` (`physical_trace` /
  `presence_unobserved` / `absence_elsewhere`) exists because `novelty:
  new_case` only says the surface changed: the clue frames are isomorphic with
  substituted nouns, so without it the analysis reads near transfer as far
  transfer. On multi-clue steps the frame is per item. `assisted` is also per
  item from 1.17.0 — a retry or a translation on clue 1 no longer marks clue 3
  assisted;
- local-first study state and telemetry;
- a constrained classifier that returns authored branch keys only, with two
  intermediate branches per production step (`misconcepcion_forma_general`,
  priority 70, and `significado_sin_forma`, priority 60) so a near miss —
  `might have work`, `might of worked`, `Maybe Nora worked`, or a Spanish
  answer — reaches authored feedback instead of `no_claro`;
- classifier arbitration in `/api/classify`: local and model predictions are
  both recorded, a high-confidence structural local match wins over a
  disagreeing model, and the answer event carries `classifierSource` and
  `classifierAgreed` so human labels can later be compared against the machine;
- a `?retest=1` bypass that reopens the day 7 retest from a link, and the
  `retestDueAt` mirrored into the `taller_completado` event, so a lost
  `localStorage` cannot cost the cohort a learner.

Do not reintroduce the old three-long-free-text-answer flow. It caused stress,
repetition, fatigue, and poor recall of the explanation in the first observed
student test.

## Approved UX direction

The active visual system is custom Hallmark, called **“chalk over film”**:

- dark, quiet, cinematic, and mobile-first;
- neutral chalk interface instead of cyan/lavender neon UI;
- the founder-provided wave MP4 remains the atmospheric layer;
- the arrival hierarchy is orientation → case → action: the opening keeps one
  centered evidence artifact and does not add a competing audio row;
- the arrival promise describes the learner's challenge, not an internal
  grammar taxonomy;
- the baseline is a compact diagnostic, not a mini-lesson: it uses one clue,
  one choice, and one primary action per viewport without revealing the
  English mapping or a correct/incorrect state;
- the production baseline keeps the same restraint and adds progressive
  disclosure: before the gate is answered nothing below it exists in the DOM —
  no disabled control is ever shown to a learner who has not been taught
  anything yet. Answering discloses the field and a single primary action in
  the thumb zone whose label follows the field; the gate is a reframe, never a
  door that closes the field;
- the contrast uses one comparison surface, integrated sentence audio, and
  spaced tactile choices instead of a divider-heavy document layout;
- no `01 CASO` eyebrow, ornamental line, audio card, or visibly truncated
  transcript;
- a segmented progress bar with `n de 3` replaces the ambiguous header dots;
- authored voice controls remain available where narration supports the task
  (contrast and bridge); the arrival screen stays visually quiet;
- the primary arrival action is ivory and remains in the thumb zone;
- the full narration text stays available to assistive technology and becomes
  visible if audio fails;
- the locked Day 7 screen uses logical safe-area gutters for header, copy,
  date, and action.

The background loop is intentional: opacity fades from 0 → 1 → 0 around the
real video duration. **Do not add an opacity floor or replace this behavior**
without founder approval. A poster extracted from the same MP4 prevents a dead
loading frame.

The previous Hallmark Aurora direction was rejected because it preserved too
much of the old composition and used recognizable AI-tool neon colors.

Every new design or material visual change on `/crear` must run the complete
Hallmark preflight, rendered review, 58-gate slop test, responsive checks, and
updated audit before handoff. A typecheck or behavioral test alone is not a
design sign-off.

The practice and transfer layout is designed to fit the complete core task in
typical 320×812 and 375×812 mobile viewports without normal scrolling. The
header participates in layout instead of covering content. Landscape and
large-text cases retain ordinary page scrolling as an accessibility fallback.

## Source files

- `AGENTS.md` — durable engineering and product rules.
- `public/workshops/CREAR-ENGLISH-DEDUCTION-V1.json` — authored lesson.
- `src/app/crear/page.tsx` — route and video preload.
- `src/components/crear/v2/CinematicEnglishPlayer.tsx` — experience player.
- `src/components/crear/v2/CinematicEnglishPlayer.hallmark.module.css` — active
  visual and interaction layer.
- `src/components/crear/v2/CinematicPrecheck.tsx` — neutral baseline flow and
  per-item latency capture.
- `src/components/crear/v2/CinematicBaselineProduction.tsx` — pre-instruction
  self-efficacy gate and production attempt, with separate latencies and
  progressive disclosure of everything past the gate.
- `src/components/crear/v2/CinematicBaselineProduction.module.css` — its
  Hallmark-stamped interaction surface.
- `src/components/crear/v2/CinematicPrecheck.module.css` — its Hallmark-stamped
  interaction surface and eight-state development fixture styles.
- `src/components/crear/v2/CinematicCaseArtifact.tsx` — functional visual case
  artifacts and clue states.
- `src/components/crear/v2/CinematicCertaintyMap.tsx` — tap/drag certainty task.
- `src/components/crear/v2/CinematicAnswer.tsx` — answer surfaces.
- `src/components/crear/v2/CinematicVoice.tsx` — narration control.
- `src/lib/crear/` — study state, telemetry, contracts, and validation.
- `src/lib/crear/learningEvidence.ts` — descriptive construct-level evidence
  observations.
- `tokens.css` — active Celestea design tokens.
- `docs/design-system/typography.md` — canonical type-scale roles and usage
  rules for active product surfaces.
- `tests/e2e/crear-english-deduction.spec.ts` — behavioral and responsive
  regression suite.
- `.hallmark/audit-chalk-over-film-2026-08-01.md` — current design audit.
- `docs/adr/` — append-only decision records, 0001–0006.
- `src/lib/crear/modalForm.ts` — structural reading of a production attempt.
- `src/lib/crear/shuffle.ts` — per-study item order.
- `.claude/launch.json` — `dev` (port 3000) and `dev-retest` (port 3005, sets
  `NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS=0` and `CREAR_CLASSIFIER_FORCE_LOCAL=1`
  so the day 7 screens are reachable in a manual walkthrough).

## Verification checkpoint

Run these three from the repo root. They are verified to pass on the founder's
machine, not only in an agent container:

```bash
npm run typecheck
npm run lint:workshops
npx playwright test tests/e2e/crear-english-deduction.spec.ts --project=mobile-chrome
```

Use `npx`, not `pnpm exec`: `pnpm` runs a dependency-status check that decides
`node_modules` is stale, then asks to purge and reinstall it. Without a TTY the
prompt aborts, and with `CI=true` it purges silently — so the same command
behaves differently for the founder and for an agent. Playwright browsers are a
one-time install: `npx playwright install chromium`.

Most recent checks (2026-08-06, lesson 1.13.0):

- `npm run typecheck` — passed.
- `npm run lint:workshops` — passed with six unrelated legacy warnings.
- `npx playwright test tests/e2e/crear-english-deduction.spec.ts --project=mobile-chrome`
  — 28/28 passed.
- full manual walkthrough of all thirteen screens at **320×812 and 375×812**
  with `NEXT_PUBLIC_CREAR_RETEST_DELAY_HOURS=0`: no horizontal overflow, no
  console errors, no 404s, and the primary action fully inside the viewport on
  every screen without page scrolling. A second walkthrough skipping the
  baseline confirms the closing receipt renders complete without the
  comparison. `.claude/launch.json` carries a `dev-retest` configuration
  (port 3005) that sets the retest delay and forces the local classifier;
- telemetry re-verified in the browser, not only in tests: `baseline_gate_no`
  and `baseline_gate_yes` with separate latencies, `baseline_produccion` with
  raw `texto` and `baselineGate`, `baseline_produccion_omitida` with
  `baselineGate` and no `texto`, all three carrying
  `learningOpportunity.id === 'baseline-modal-form'`; `classifierSource` on the
  production steps; a numeric `retestDueAt` inside `taller_completado`.
- the classifier case table passes end to end through `/api/classify` with
  `CREAR_CLASSIFIER_FORCE_LOCAL=1`: the only input that reaches `no_claro` is
  `I don't know`, including the L1 interference forms (`must to have`,
  `must had`) and Spanish answers;
- `guideAvailable` is declared on every step with a `learningOpportunity`, the
  schema rejects a JSON that declares `independent` while offering the guide,
  and no guide affordance exists in the DOM on `transfer-check-certainty` or
  `transfer-production`.
- responsive checks — 320×812, 375×812, 414×896, 768×1024, and 1280×800.
- no horizontal overflow in the tested viewports;
- no vertical overflow in the core practice task at 320×812, 375×812, and
  414×896, including the Spanish clue state at 375×812;
- the pre-check stays entirely inside 320×812, 375×812, 414×896, and 768×1024:
  its three choices retain 52 px targets, its CTA retains 56 px, labels do not
  wrap, and no horizontal or vertical overflow appears;
- arrival title remains within its two-line mobile measure;
- video fade is verified near zero at both ends of the loop;
- integrated voiced transfer, per-clue attempts, assisted correction,
  translation and guide telemetry, independent transfer certainty and form,
  the typed evidence ledger, D7 certainty and form, fixed-slot word-bank
  behavior, all three initial motion paths, all six directed swaps, tap,
  pointer drag, and reduced motion are covered;
- the compact contrast keeps both compared sentences, integrated audio, three
  answer choices, and the primary action inside the common mobile viewports;
- the `must have` practice clue now includes an authored eyewitness signal so
  it is not interchangeable with `might have`; feedback describes a strong
  deduction and never invents that someone failed to see Valeria;
- the locked D7 gate keeps at least 16 CSS pixels of horizontal gutter around
  its header, copy, date, and primary action;
- rendered Hallmark review covers arrival, the neutral pre-check, the diagnostic
  contrast, guided practice, Spanish support, transfer bridge, independent certainty,
  production, the D7 decision, and the locked D7 gate;
- the independent production cue and CTA fit 320×812, 375×812, 414×896, and
  768×1024 without horizontal overflow; at 125% root type on 320×812 the CTA
  remains reachable through the documented accessibility scroll fallback.

The dev server can be started with:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## Git checkpoint

Lesson 1.12.0 (the pre-pilot pass: production baseline, copy contradictions,
language confound, classifier branches and arbitration, `guideAvailable`
contract, two-dimension closing, day 7 hardening), lesson 1.13.0 (the UI/UX
and pedagogical-clarity pass: progressive disclosure on the baseline, a single
statement of the structural rule on `prism`, the explicit proposition on all
four Nora/Emi screens, the closing receipt, and the visible case rótulo) and
lesson 1.16.0 (the second and third founder walkthroughs: the gate now commits,
the production screens reuse the practice gap instead of ordering a translation,
and the case breadcrumb is gone) and lesson 1.17.0 (the pre-pilot measurement
audit: token-boundary matching and a verified subject, form scored apart from
certainty, per-learner item order, a day 7 parallel form, and five smaller
attribution fixes), plus lesson 1.17.1 (typography and helper-copy polish
without a `content_version` bump) are all applied on top of commit `c8046df` and are
uncommitted at this handoff. Their decisions are recorded as ADRs 0001–0006 in
`docs/adr/`. ADR 0005 reverts ADR 0004 §1's *"the gate never blocks"* and
§6.2's persistent rótulo, and corrects the copy ADR 0004 §4 considered settled.
ADR 0006 reverts nothing: it delivers in the scoring what ADR 0004 §5 had
already delivered in the screens.

One pattern runs through all three of ADR 0005's sections and is worth applying
before writing the next screen: **every time a screen failed to communicate, the
first fix was to add explanatory copy, and the real fix was to remove it and
move the work into a form the learner already recognises** — the practice gap,
the button that blocks, the bridge screen that already narrated the case change.
Copy that explains the design is a signal the design is not yet communicating on
its own.

**Verified for 1.17.1 in this checkout (2026-08-09):** `npm run typecheck`,
`npm run lint:workshops` (the same six unrelated legacy warnings), and
`npx playwright test tests/e2e/crear-english-deduction.spec.ts --project=mobile-chrome`
at 34/34. The rendered mobile review covers the arrival and pre-check at
320×812 and 375×812, including the natural title wrap and the 28 / 14 / 16 px
hierarchy; no horizontal overflow or hidden primary action appeared.

The lesson 1.7 baseline is integrated into `main`. Commit `6c99754` preserves
the founder-owned dirty state that already existed in the primary checkout;
commit `b917365` applies the verified evidence-visible flow on top. Their final
product tree was compared byte for byte with the implementation snapshot before
the auxiliary worktree was retired.

The integrated state includes the school-based content, in-place Spanish
support, local feedback, voiced transfer bridge, split independent transfer and
D7 checks, construct-level evidence ledger, fixed-slot bidirectional term
motion, functional SVG case artifacts, responsive layout, Hallmark artifacts,
and E2E coverage.

The lesson 1.8 redesign and additive 1.9 pre-check described above are
implemented in the primary checkout and intentionally remain uncommitted at
this handoff. Preserve them together with the founder-owned CSS change that
already removed the translucent background from `.caseArtifactCanvas`; do not
restore or discard that earlier decision.

Temporary worktrees are disposable after their commits are integrated and
verified; the primary checkout and Git history are the continuing source of
truth. Before another substantial feature, review `git status` and preserve any
new founder-owned changes.

## Open debt before the pilot runs

- **Set `CREAR_CLASSIFIER_MODEL` to a current model.** The code default is
  still `gpt-4o-mini`, and the distinction that matters most — correct
  reasoning with incorrect form versus incorrect reasoning — is exactly where a
  weak model collapses both into `no_claro`. The whole initial dataset inherits
  this choice. It is an environment change, not a code change.
- **Audio not re-rendered in 1.13.0 either.** The `transfer-bridge`, `prism`
  and `close` scripts still hold their earlier wording and all three remain
  true next to the new copy, which is why `content_version` did not move. The
  bridge went further than compatible: its heading now *is* the recorded
  sentence *"Ahora cambia el caso, no la idea"*.
- ~~**`Mateo` appears in both `precheck` and `guided-map`.**~~ Closed in
  1.17.0: the pre-check clue is now `Tadeo`, with a different location, so the
  baseline no longer shares an identity with guided practice. What the two do
  still share is the *evidential frame*, which is now recorded rather than
  hidden — see `cueFrame` in the ledger.
- **`can't have` has no independent measurement.** Deliberate, as of 1.17.0:
  day 7 is a parallel form of day 1 and both target `posible`, so the delayed
  comparison isolates time. Impossibility is still practised in the guided map.
  Revisit only with a cohort large enough to counterbalance.
- **No `board` case artifact.** The baseline step deliberately carries no
  `caseArtifact`: `CinematicCaseArtifact` has no blackboard drawing, and an
  empty 9 rem canvas would take the vertical space the gate and field need.
  Add the artifact kind with its SVG if the screen ever needs it.
- **Route-level arbitration is untested end to end.** No model runs against the
  Playwright server, so the disagreement path is covered by a stubbed
  `/api/classify` response. Watch the first real sessions for
  `classifierAgreed: false`.
- ~~**`evidence_comprehension` is a decorative construct.**~~ Closed by
  `docs/adr/0007`: `contrast` declares `learningOpportunity.evidentiary: false`,
  so it stays in the ledger as process and is barred from every claim.
  Validation now rejects any construct that is never observed independently and
  not declared, so this cannot regress silently.
- ~~**The ledger records observations and never aggregates them.**~~ Closed by
  `docs/adr/0007`: `aggregateCrearConstructStates` projects the ledger to one
  state per construct, with a derived `claim` that needs a baseline to leave
  `unproven` and reports `preexisting` when the baseline was already correct.
  It rides `taller_completado`, so the projection survives a lost
  `localStorage`.

## Known boundaries

- TTS output is v1; student input remains text. STT is a fast-follow, not part
  of this checkpoint.
- The arrival, contrast, and transfer bridge currently use pre-generated local
  system voice assets. Their exact scripts live in lesson JSON and can be
  re-rendered with the founder's ElevenLabs voice without changing the runtime
  contract.
- The evidence ledger is descriptive, not a mastery engine. The next student
  sessions must test whether the compact contrast and split checks reduce
  operating burden and produce interpretable transfer evidence.
- The pre-check and the production baseline establish cheap pre-measures for
  certainty and for modal form; neither is proof of learning, and both must
  remain neutral until after the contrast. With n≈5 and no control group they
  are the only attribution mechanism available: without them, "already knew"
  and "learned it here" are indistinguishable.
- Lesson content is pre-authored. The LLM classifies; it does not generate
  lesson content or UI at runtime.
- Do not extend legacy teacher, dashboard, anti-cheat, Cognitive Gym, or
  Verification OS areas.
- Do not add Tailwind to the new `/crear` work.
- Do not interpret visual polish as market validation. The next meaningful
  evidence comes from observed student sessions and learning/transfer data.

## How to resume in a fresh Codex task

Use the same local project, open a completely new task (not a fork), and send:

> Read `AGENTS.md` and `docs/CURRENT_STATE.md`. Inspect `git status` before
> changing anything. Preserve the approved decisions and current uncommitted
> work. My next task is: [one concrete objective].

Update this file only when the product checkpoint changes materially. Do not
turn it into a chronological diary.
