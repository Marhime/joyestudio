/**
 * Singleton perf monitor.
 *
 * Collects per-frame timing samples from instrumented hot spots (e.g. Three's
 * renderer.render()) plus a global RAF tick count. PerfHud reads the rolling
 * stats and renders them.
 *
 * Zero-cost when disabled: callers wrap their hot code in `mark()` calls which
 * short-circuit if monitoring is off.
 */

interface Stats {
  fps: number;
  frameMs: number;
  threeMs: number;
  otherMs: number;
  rafSize: number;
  stCount: number;
}

const SAMPLES = 60; // ~1s window @ 60fps

let enabled = false;
let lastFrameAt = 0;

// Ring buffers
const frameSamples: number[] = [];
const threeSamples: number[] = [];

// Per-frame accumulators (reset on each frame tick)
let threeAccum = 0;
let markStarts = new Map<string, number>();

function pushSample(buf: number[], value: number) {
  buf.push(value);
  if (buf.length > SAMPLES) buf.shift();
}

function avg(buf: number[]): number {
  if (!buf.length) return 0;
  let sum = 0;
  for (const v of buf) sum += v;
  return sum / buf.length;
}

export const perfMonitor = {
  enable() {
    enabled = true;
    lastFrameAt = performance.now();
  },

  disable() {
    enabled = false;
    frameSamples.length = 0;
    threeSamples.length = 0;
    threeAccum = 0;
    markStarts.clear();
  },

  isEnabled() {
    return enabled;
  },

  /** Start a named measurement window. */
  markStart(name: string) {
    if (!enabled) return;
    markStarts.set(name, performance.now());
  },

  /** End a named measurement window. Currently only "three" is tracked specially. */
  markEnd(name: string) {
    if (!enabled) return;
    const start = markStarts.get(name);
    if (start === undefined) return;
    const elapsed = performance.now() - start;
    markStarts.delete(name);
    if (name === "three") threeAccum += elapsed;
  },

  /**
   * Call once per RAF tick (from the singleton RAF loop). Computes the frame
   * delta, snapshots accumulators into the rolling buffers, and resets.
   */
  tickFrame() {
    if (!enabled) return;
    const now = performance.now();
    const delta = now - lastFrameAt;
    lastFrameAt = now;

    // Ignore pathological deltas (tab visibility resume, debugger pauses, etc.)
    if (delta > 0 && delta < 1000) {
      pushSample(frameSamples, delta);
      pushSample(threeSamples, threeAccum);
    }
    threeAccum = 0;
  },

  getStats(rafSize: number, stCount: number): Stats {
    const frameMs = avg(frameSamples);
    const threeMs = avg(threeSamples);
    return {
      fps: frameMs > 0 ? 1000 / frameMs : 0,
      frameMs,
      threeMs,
      otherMs: Math.max(0, frameMs - threeMs),
      rafSize,
      stCount,
    };
  },
};

export type { Stats };
