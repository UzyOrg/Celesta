# Celestea Typography

**Status:** canonical implementation reference for active product surfaces.

This document turns the active CSS scale into a stable contract for people and
agents working on Celestea. Product direction remains in Notion and durable
engineering rules remain in `AGENTS.md`; the executable token values live in
[`tokens.css`](../../tokens.css).

## Scale

Use these tokens for all readable UI text in `/crear`. Values are documented in
pixels for review and implemented in `rem` so browser text preferences still
work.

| Role | Token | Size | Typical use | Mobile leading |
| --- | --- | ---: | --- | ---: |
| Micro | `--celestea-text-xs` | 12 px | metadata and compact, non-essential labels | 16 px |
| Support | `--celestea-text-sm` | 14 px | subtitles, progress, helper copy, short one-fact clues, secondary feedback | 20–22 px |
| Body / control | `--celestea-text-base` | 16 px | long-form lesson evidence, inputs, choices, buttons, CTA labels | 24 px |
| Prompt | `--celestea-text-md` | 18 px | short question, instruction, or narrow arrival statement | 24–28 px |
| Section | `--celestea-text-lg` | 22 px | section heading or compact task heading | 28 px |
| Screen title | `--celestea-text-title` | 28 px | one primary screen heading | 32–36 px |
| Display | `--celestea-text-display` | 36 px | deliberate, short hero or larger-screen emphasis only | 40–44 px |

The intended mobile ladder is **12 / 14 / 16 / 18 / 22 / 28 / 36**. Do not use
15 px, 17 px, or other in-between values for ordinary lesson text. Do not use
text below 12 px for instructional or interactive content.

## Role rules

- Each screen has one primary title: `--celestea-text-title` (28 px), with a
  strong display weight and no competing title of similar size.
- Supporting context is `--celestea-text-sm` (14 px); it should not compete
  with the task.
- Long-form evidence and all tappable labels stay at
  `--celestea-text-base` (16 px) or larger. A short, one-fact pre-check clue
  may use `--celestea-text-sm` (14 px) when the following prompt and controls
  retain their larger roles. Do not shrink core lesson content merely to make a
  screen look less dense.
- A question inside a task is normally `--celestea-text-md` (18 px). Reserve
  `--celestea-text-lg` (22 px) for a true section heading or compact task
  heading, not a second screen title.
- `--celestea-text-display` is exceptional. It is not the default mobile H1.

## Wrapping and responsiveness

- Let sentences wrap only when they exhaust their available inline space:
  `text-wrap: wrap; word-break: normal; overflow-wrap: break-word`.
- Do not use `text-wrap: balance` or manual `<br>` elements for authored lesson
  headlines. Balance moves words to a new line early and makes the available
  measure look broken.
- Do not use `vw`/`clamp()` as the primary sizing method for readable copy.
  Keep the mobile roles fixed and use layout, spacing, or a deliberate
  breakpoint when a component truly needs a different role.
- A compact, fixed-layout learning widget may use a bounded responsive size
  only when a fixed token would cause overflow; document that exception beside
  the selector and verify it at 320 px and with enlarged text.

Current exception: the certainty-map `.mapSentence` and `.mapTermLabel` use
bounded sizes because the sentence, modal target, and term label must remain in
one non-wrapping interaction. The mobile regression suite verifies that layout
at 375 px; do not reuse this exception for ordinary reading copy.

## Implementation checklist

1. Start with the semantic role above, then use the corresponding token rather
   than a literal `font-size`.
2. Preserve at least 16 px for controls and core learning evidence on mobile.
3. Check 320 px and 375 px widths, plus browser text enlargement, before
   accepting a type change.
4. When a new role is genuinely needed, update this document and `tokens.css`
   together, then record why in the change or ADR. Do not introduce a local
   one-off value.

## Basis

Material 3 groups typography into semantic display, headline, title, body and
label roles, and explicitly notes that a product can use a reduced subset of
the full scale. Its mobile body roles include 16/24 and 14/20. Celestea adopts
that role discipline while retaining its existing “chalk over film” typefaces.
Duolingo's public typography guidance similarly separates short, prominent
headlines from highly legible supporting text; Celestea adopts the hierarchy,
not Duolingo's brand fonts.

- [Material 3 typography and reduced type scales](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [Android accessibility guidance](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility)
- [Duolingo typography guidance](https://design.duolingo.com/identity/typography)
- [WCAG: resize text](https://www.w3.org/WAI/WCAG21/Understanding/resize-text)
