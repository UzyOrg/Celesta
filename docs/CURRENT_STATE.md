# Celestea · Current State

Last updated: 2026-08-02

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
`2026-08-03-baseline-clarity`, lesson version `1.11.0`.

Content and audio versions must stay identical. `audioAssetsReady` in
`CinematicEnglishPlayer.tsx` compares them and disables the entire voice layer
when they diverge, so a content bump without an audio decision silently removes
narration from every scene.

The current session contains:

- a direct Spanish orientation that frames one concrete challenge: discover
  who may have worked on the poster and explain it in English;
- a one-line precheck promise in a 22 px heading; the secondary instruction
  was removed so the learner sees the three decisions without duplicate copy;
- a neutral, Spanish three-touch pre-check before instruction: one visible
  school clue at a time, three certainty choices, no English modal labels,
  no learner-facing correctness feedback, and no free production; each touch
  records its answer and latency as independent/same-case/immediate evidence
  and resumes after a reload;
- a compact diagnostic contrast that asks directly what sentence B communicates
  and keeps sentence A, sentence B, the emphasized `must have`, and authored
  audio inside one semantic surface;
- three tactile answer rows whose distractors distinguish observation,
  inference, and obligation without revealing the answer in explanatory copy;
- a consultable explanation headed by “Depende de qué tan seguro estás.” for
  `must have`, `might have`, and `can't have`;
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
- a learner-paced, voiced bridge that explicitly confirms the first part is
  complete before naming the same idea in a new school-based case;
- a guided transfer map on a genuinely new school case;
- a separate independent certainty decision followed by independent English
  production, so evidence calibration and modal form are not collapsed into
  one score;
- production screens that keep the source clue visible and put the primary
  action in the mobile thumb zone;
- a seven-day retest that again separates certainty from English production on
  a third case;
- a typed local evidence ledger that records construct, support condition,
  novelty, timing, correctness, and assistance without claiming universal
  mastery from one response;
- local-first study state and telemetry;
- a constrained classifier that returns authored branch keys only.

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
- `tests/e2e/crear-english-deduction.spec.ts` — behavioral and responsive
  regression suite.
- `.hallmark/audit-chalk-over-film-2026-08-01.md` — current design audit.

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

Most recent checks (2026-08-03):

- `npm run typecheck` — passed.
- `npm run lint:workshops` — passed with six unrelated legacy warnings.
- `npx playwright test tests/e2e/crear-english-deduction.spec.ts --project=mobile-chrome`
  — 15/15 passed, run on the founder's machine.
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
- The pre-check establishes a cheap baseline and ceiling filter for certainty;
  it is not itself proof of learning and must remain neutral until after the
  contrast.
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
