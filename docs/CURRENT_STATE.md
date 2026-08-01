# Celestea · Current State

Last updated: 2026-08-01

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

Lesson: `CREAR-ENGLISH-DEDUCTION-V1`, content/audio version `2026-08-01`,
lesson version `1.7.0`.

The current session contains:

- a direct Spanish orientation that names the learning goal and anchors the
  school-fair poster case with a functional visual artifact;
- a short contrast exercise that asks what changed before giving the rule;
- a consultable explanation of `must have`, `might have`, and `can't have`;
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
- a learner-paced, voiced bridge that names transfer as the same idea in a new
  school-based case instead of presenting it as a second unrelated topic;
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
- the arrival hierarchy is orientation → case → voice → action;
- no `01 CASO` eyebrow, ornamental line, audio card, or visibly truncated
  transcript;
- the introduction audio is an integrated 44×44 control;
- the primary arrival action is ivory and remains in the thumb zone;
- the full narration text stays available to assistive technology and becomes
  visible if audio fails.

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

Most recent checks:

- `npm run typecheck` — passed.
- `pnpm exec playwright test tests/e2e/crear-english-deduction.spec.ts` — 12/12
  passed.
- responsive checks — 320×812, 375×812, 414×896, 768×1024, and 1280×800.
- no horizontal overflow in the tested viewports;
- no vertical overflow in the core practice task at 320×812, 375×812, and
  414×896, including the Spanish clue state at 375×812;
- arrival title remains one line on mobile;
- video fade is verified near zero at both ends of the loop;
- integrated voiced transfer, per-clue attempts, assisted correction,
  translation and guide telemetry, independent transfer certainty and form,
  the typed evidence ledger, D7 certainty and form, fixed-slot word-bank
  behavior, all three initial motion paths, all six directed swaps, tap,
  pointer drag, and reduced motion are covered;
- rendered Hallmark review covers arrival, guided practice, Spanish support,
  transfer bridge, independent certainty, production, and the D7 decision;
- the independent production cue and CTA fit 320×812, 375×812, 414×896, and
  768×1024 without horizontal overflow; at 125% root type on 320×812 the CTA
  remains reachable through the documented accessibility scroll fallback.

The dev server can be started with:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## Git checkpoint

The current worktree is on a detached `HEAD` and is dirty. The uncommitted
changes are founder-approved work: the lesson 1.7 evidence-visible flow,
school-based content, in-place Spanish support, local feedback, voiced transfer
bridge, split independent transfer and D7 checks, construct-level evidence
ledger, fixed-slot bidirectional term motion, functional SVG case artifacts,
responsive layout, Hallmark artifacts, and E2E coverage. Treat all existing
changes as founder-owned work. Do not reset, overwrite, or discard unrelated
files.

Before beginning another substantial feature, review `git status` and create a
checkpoint commit if the founder approves.

## Known boundaries

- TTS output is v1; student input remains text. STT is a fast-follow, not part
  of this checkpoint.
- The arrival and transfer bridge currently use pre-generated local `es-MX`
  system voice assets. Their exact scripts live in lesson JSON and can be
  re-rendered with the founder's ElevenLabs voice without changing the runtime
  contract.
- The evidence ledger is descriptive, not a mastery engine. The next student
  sessions must test whether the split checks reduce operating burden and
  produce interpretable transfer evidence.
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
