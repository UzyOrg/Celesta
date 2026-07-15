# Celestea — Stitch prompt V2

Design **FROM SCRATCH** a complete premium mobile-first product experience for **CELESTEA**, a voice-first, AI-native learning companion for Mexican high-school students.

Do not redesign an existing dashboard. Create a new visual and interaction system called **Living Aurora / Crystal Voice**.

## Product purpose

Celestea helps a student discover an idea, practice it, apply it to a genuinely new case, and return after seven days to prove durable learning. It never uses surveillance, anti-cheat mechanics, points, streaks, punishment, or runtime-generated lesson content.

## MVP lesson

Create one 7–8 minute B1+/B2 English experience:

> **Can you sound certain without pretending you know?**

The student reconstructs a past event from evidence and learns to calibrate:

- `must have + past participle` — strong evidence;
- `might / could have + past participle` — open possibility;
- `can't have + past participle` — ruled out by evidence.

The difficulty comes from reasoning, producing language, and transferring the pattern—not from a childish grammar quiz.

## Audience and language

- Mexican students aged 15–18.
- Product shell in natural Mexican Spanish.
- English prompts, evidence, examples, and captions visibly marked as English.
- Tone: warm, intelligent, curious, peer-like, and zero judgment.

## User-facing progression

Show only:

**DESCUBRE · PRACTICA · APLICA**

Never show `1 / 13`, a long step counter, a grade, or a dashboard.

## Design these connected mobile screens at 390 × 844

### 1. Arrival — `11:58 PM`

- CELESTEA wordmark.
- Label: `ENGLISH LAB · B1+/B2 · 8 MIN`.
- Headline: `Can you sound certain without pretending you know?`
- Three clues about a scholarship video that vanished before a deadline.
- One iconic voice presence and one CTA: `Entrar al reto`.
- Cinematic cyan, blue, and lavender aurora rising from the bottom third.

### 2. Cold pre-check

- Voice prompt and always-visible English caption.
- Prompt: write what almost certainly happened, what possibly happened, and what could not have happened.
- Calm multiline response dock.
- No hints, grammar labels, correctness colors, or answer stems beyond three neutral certainty labels.

### 3. Discovery contrast

Compare:

- `The cloud replaced the file.`
- `The cloud must have replaced the file.`

Ask what the second speaker actually knows. Let the student predict before revealing the rule.

### 4. Certainty prism

- Three elegant fragments: `MUST HAVE`, `MIGHT HAVE`, `CAN'T HAVE`.
- Meaning labels: strong evidence, open possibility, ruled out.
- Assemble the formula `MODAL + HAVE + PAST PARTICIPLE` through motion.
- Keep this visual and editorial; never make it look like a textbook table.

### 5. Guided calibration

- Three fast evidence cases inside one coherent visual world.
- The learner chooses the confidence level earned by each clue.
- Immediate, pre-authored feedback.
- An error stays visible for revision; no red, shaking, lockout, or punishment.

### 6. Open production

- Evidence suggests Diego often renames files, but does not prove he renamed this one.
- Prompt the learner to write the most careful deduction.
- Compact the voice presence while the keyboard is open.
- Show one calm branch-feedback sheet and a revision state.

### 7. Post-check

- New file and new evidence.
- One strong conclusion, one possibility, and one impossible conclusion.
- First attempt is saved; no hint and no retry before measurement.

### 8. Transfer

- Transform the visual context from a cloud log into a music-release signal.
- New evidence: scheduled release, incomplete caption log, and a person on a flight without internet.
- No grammar labels, stems, or hints.
- Prompt three calibrated deductions.
- Visually quieter and more focused than practice.

### 9. Honest evidence receipt

- Solid transfer: `Aplicaste el patrón en un caso nuevo.`
- Partial transfer: `Parte del patrón llegó al caso nuevo.`
- Not demonstrated: `Guardamos tu intento. Todavía no hay evidencia de transferencia.`
- Never claim mastery from completion alone.
- Show `First attempt saved · durability pending` and `Revisión en 7 días`.
- No confetti, score, badge, streak, or celebratory manipulation.

### 10. D7 retest

- Headline: `¿Sigue contigo?`
- Fresh robotics-team evidence with no recap, hints, or examples.
- Same three-deduction task and same rubric.
- Calm, compact, trustworthy visual state.

## Visual system

- Background: `#0D1117`, with deeper `#070A10` areas.
- Text: `#F4F7FF`; muted: `#A1ABBC`.
- Accents: cyan `#76D8FF`, blue `#708FFF`, lavender `#B39BFF`, mint `#8DE8CE`, warm `#FFD39A`.
- Use large negative space, a subtle dotted field, and an organic living aurora.
- Surfaces are deep navy with thin cool borders; do not place every element inside a glass card.
- Primary CTA: crystal blue-to-lavender gradient with dark text.
- Strong editorial type scale and selective rounded panels.

## Voice presence

Create one abstract, iconic presence inspired by the best premium AI voice interfaces:

- idle — slow breathing rings;
- speaking — layered rhythmic energy;
- paused — compact static state;
- thinking — one slow orbital highlight;
- feedback — one controlled color sweep;
- complete — mint/cyan horizon opening.

It must not be a literal microphone, assistant avatar, fake precision waveform, or decorative sphere disconnected from state.

## Motion direction

- Aurora drift: 18–22 seconds, using only transform and opacity.
- Scene entry: 520 ms, `opacity + translateY(16px) + scale(.985)`.
- Scene exit: 180–220 ms.
- Option selection: 170 ms with slight compression and illumination.
- Feedback: calm bottom sheet, 360 ms.
- Phase change: full-screen light passage, 650–700 ms.
- Voice idle rhythm: 4.8 seconds; speaking rhythm: 1.1–1.4 seconds.
- Keep the thinking surface calm while the environment carries the motion.

## Responsive output

Design mobile first at 390 × 844. Also show Arrival, Open Production, Transfer, and Evidence Receipt at 1440px desktop. Desktop must feel expansive and editorial—not like a mobile card centered in empty space.

## Accessibility and production constraints

- 48px minimum touch targets and WCAG AA contrast.
- Captions always visible; pause and replay always available.
- Reduced-motion version with static gradients and short fades.
- Keyboard-safe response dock and focus continuity.
- Implementable with CSS Modules, Framer Motion, and Lucide icons.
- No WebGL, canvas, 3D scene, video background, or GPU-heavy fullscreen blur.
- Optimized for low-end Android, data saver, offline cache, and unstable networks.

## Do not use

Teacher dashboards, sci-fi terminals, radiation/laboratory jargon, a mystery-game picker, chat bubbles, mascots, gamification, streaks, points, surveillance, anti-cheat visuals, red failure states, literal diamonds, excessive glass cards, dense navigation, or generic EdTech illustrations.

The result should feel like a world-class AI product: emotionally cinematic, visually unforgettable, warm, fast, and extremely focused.
