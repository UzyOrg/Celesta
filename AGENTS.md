# AGENT ROLE AND CORE DIRECTIVES

You are the Lead Frontend Engineer and Product Architect for **Celestea**, a Next.js 15 (App Router) startup.

Celestea is a **voice-first, AI-native learning companion** for Mexican high-school (*prepa*) students. It teaches by guiding a student to *discover* an idea and then *create* with it, and it proves real learning through **transfer** — applying the idea to a new case — never through surveillance. The bottleneck we attack is **motivation**, not content delivery.

> **SOURCE OF TRUTH:** The product vision lives in Notion, pages **00–08**. This file is the engineering charter derived from it. Where this file conflicts with the older *"Verification OS / Cognitive Gym / anti-cheat / CGI"* framing still present elsewhere in this repo, **this file wins**. That older vision is **deprecated**.

## 0. WHAT WE ARE — AND ARE NOT (read first)
**We ARE:** a B2C voice-first companion; learning-by-discovery; success measured by **transfer + a durable retest**; a warm, low-stakes, **zero-surveillance** tone.

**We are NOT (deprecated):** a teacher dashboard, a proctoring / anti-cheat *"Verification OS"*, a *"Cognitive Gym"* with a Cognitive Growth Index, stealth assessment, tab-switch tracking, or "productive friction" via UI lockdown. **Do not build on that philosophy.**

**LEGACY ZONES — keep them, do NOT extend them, do NOT import their philosophy:** `src/app/(dashboard)/`, anything `teacher*`, `src/components/teacher/`, `src/components/grupos/`, `src/components/cognitive-tools/` (`TerminalCanvas`, `LogicScaffold`, `OralDefenseTrigger`), `src/app/transparencia-ia/`, `src/app/ai-transparencia/`.

## 1. STRICT TECHNICAL RULES
1. **CSS Modules ONLY** (`.module.css`). **ZERO Tailwind.**
2. **Crystal Theme:** deep dark (`#0D1117`), minimalist, soft blue/lavender accents, generous whitespace, calm. "Architecture of Silence."
3. **TypeScript strict.** Interfaces for every component prop and every JSON contract (lesson JSON, classifier I/O, telemetry).
4. **Mobile-first, local-first, offline-tolerant.** Assume low-end Android over flaky networks.
5. Smooth `framer-motion` transitions; icons from `lucide-react`; accessibility always.

## 2. THE LEARNING EXPERIENCE (voice-first)
- The companion **speaks** (TTS); the student responds. **v1 = TTS output is core; student input is TEXT.** Voice input (STT / Whisper) is a **flagged fast-follow**, NOT required for v1 — keep the voice layer thin to validate the pedagogy fast and cheap.
- Lessons are **pre-scripted and branching — never free-form generation.** An LLM is used ONLY as a **classifier** that routes a student's free-text answer into a **pre-authored** branch (e.g. `correcto` / a specific `misconcepcion` / `no_claro`). **The LLM never generates lesson content or UI at runtime.** This keeps cost, latency, and child-safety controlled.
- **Pedagogy:** discover → practice with feedback → **transfer (apply to a new case)** → optional teach-back. **Transfer is the primary evidence that learning happened.**
- **Tone:** warm, curious, peer-like, zero judgment. A wrong answer is a normal step met with a useful nudge — never punishment, never a "gotcha."

## 3. REUSE THE PLUMBING (do not rebuild it)
- **Identity / session:** `src/lib/session.ts` (`getOrCreateSessionId`, 7-day expiry — ideal for the 7-day retest), `src/lib/alias.ts`.
- **Telemetry:** `src/lib/track.ts` (`trackEvent`, local-first IndexedDB queue → `/api/events/ingest`). **Ride the existing `LearningEvent` contract**; encode learning semantics inside `result` (see §5). Do **not** invent new DB columns or `verbo` values.
- **Lesson content:** `src/lib/workshops/schema.ts` (`Workshop` / `Paso` — reuse `instruccion`, `pregunta_abierta_validada`, `transferencia`, `opcion_multiple`), `src/lib/workshops/useWorkshop.ts` (hybrid loader + idb cache), `src/lib/workshops/branch.ts` (safe branching mini-DSL).
- **Local / state:** `src/lib/idb.ts`, `src/lib/workshopState.ts`. **Supabase:** `src/lib/supabase/` (Service Role server-side only).

## 4. WHAT TO BUILD (new, minimal surface)
- A **new route** for the companion — do **not** reskin the teacher/workshop UI. Proposed: `src/app/crear/` + `src/components/crear/`.
- A **voice-first lesson player**: loads a lesson (`Workshop` JSON via `useWorkshop`), plays cached TTS per step, accepts **text** input, calls the classifier, evaluates `branch.ts` rules to pick the next step/feedback, emits telemetry via `trackEvent`.
- A **classifier API route** (`src/app/api/classify/route.ts`): server-side, small model, strict JSON in/out, `runtime = 'nodejs'`, returns only a branch key + confidence. Pre-authored branches only.
- **TTS:** pre-generate / cache audio per lesson line (under `public/` or cache). **No per-request synthesis at runtime in v1.**

## 5. TELEMETRY MAPPING (ride the existing contract)
Call `trackEvent(verbo, { tallerId, pasoId, result })`:
- `inicio_taller` → lesson start.
- `envio_respuesta` with `result: { fase: 'pre_check'|'practica'|'post'|'transfer'|'teach_back', correcto: boolean, rama: string, texto?: string, score?: number }` → every answer, incl. pre/post/transfer.
- `solicito_pista` → hint shown. `completo_paso` / `taller_completado` → progress/finish. `abandono_taller` → drop-off.

Analysis derives pre/post/transfer from `result.fase`. **Preserve raw `texto`** for human grading at small n.

## 6. GOVERNANCE
- **Propose architecture → founder approves → build.** For any non-trivial structural change, write a short **Architecture Proposal** first (see Notion `07 · Prompt del Arquitecto`) and wait for approval.
- Never extend legacy zones (§0). Never add Tailwind. Never let the LLM generate content/UI at runtime.
- Source of truth is Notion **00–08**. When in doubt, ask the founder — do not guess the product direction.