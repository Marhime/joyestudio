/**
 * Singleton cooldown for smiley actions across the app.
 *
 * Ensures no two expression triggers fire within COOLDOWN_MS of each other —
 * preserves the "restraint" cadence regardless of which source is asking
 * (ambient idle, scroll bus, UI hover, easter eggs).
 *
 * Shared by useSmileyAmbient (Phase 1) and the upcoming Phase 2/3/4 sources.
 */

const COOLDOWN_MS = 1500;

let lastActionAt = 0;
// Multi-second gestures (a glance runs ~2.7-3.5s) hold this lock for their
// whole duration — the 1500ms cooldown alone would let a blink land on the
// hold or return tail of a gesture in flight.
let gestureDepth = 0;

export function canTriggerSmileyAction(): boolean {
  return gestureDepth === 0 && performance.now() - lastActionAt > COOLDOWN_MS;
}

export function markSmileyAction(): void {
  lastActionAt = performance.now();
}

/** Hold the action lock for the duration of a long-running gesture. */
export function beginSmileyGesture(): void {
  gestureDepth++;
}

/** Release the gesture lock; the cooldown re-arms from the gesture's END. */
export function endSmileyGesture(): void {
  gestureDepth = Math.max(0, gestureDepth - 1);
  markSmileyAction();
}

/**
 * Run a smiley action only if the cooldown is expired. Marks the action
 * timestamp BEFORE running fn() so the cooldown is locked the instant we
 * commit to firing (prevents two parallel awaits from slipping through).
 */
export async function trySmileyAction(
  fn: () => Promise<void> | void,
): Promise<void> {
  if (!canTriggerSmileyAction()) return;
  markSmileyAction();
  await fn();
}
