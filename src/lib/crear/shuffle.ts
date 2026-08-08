/**
 * Order that changes per learner and never per render.
 *
 * The baseline and the guided map both authored their correct answers in the
 * same order as the option list — item 1 was option 1, item 2 was option 2,
 * item 3 was option 3. A learner tapping straight down the column scored 3/3
 * on the pre-test without reading a clue, and with n≈5 the pre-test is the
 * whole attribution mechanism. Fixed order was the bug; a random order per
 * render would be worse, because a reload would reshuffle mid-task and the
 * position a learner actually saw could never be reconstructed.
 *
 * So the order is a pure function of the study id and a per-step salt. It is
 * stable across reloads within a study, different between learners, and
 * reproducible from the telemetry — the shown order rides on every answer
 * event, so position bias is measurable instead of merely avoided.
 */
function hash(seed: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** Deterministic Fisher–Yates driven by a mulberry32 stream. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const shuffled = [...items];
  let state = hash(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    const random = ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    const target = Math.floor(random * (index + 1));
    const held = shuffled[index]!;
    shuffled[index] = shuffled[target]!;
    shuffled[target] = held;
  }
  return shuffled;
}
