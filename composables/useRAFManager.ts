/**
 * Singleton RAF manager — one requestAnimationFrame loop for the entire app.
 *
 * Consumers register/unregister callbacks by id.
 * The loop auto-pauses on `document.hidden` and resumes on visible.
 *
 * Usage:
 *   const raf = useRAFManager()
 *   raf.register('lenis', (time) => lenis.raf(time))
 *   raf.register('three', (time) => renderer.render(scene, camera))
 *   // later:
 *   raf.unregister('three')
 */

type RAFCallback = (time: number) => void;

const callbacks = new Map<string, RAFCallback>();
let frameId: number | null = null;
let running = false;
let initialized = false;

const loop = (time: number) => {
  for (const cb of callbacks.values()) {
    cb(time);
  }
  if (running) {
    frameId = requestAnimationFrame(loop);
  }
};

const start = () => {
  if (running) return;
  running = true;
  frameId = requestAnimationFrame(loop);
};

const stop = () => {
  running = false;
  if (frameId !== null) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
};

const onVisibilityChange = () => {
  if (document.hidden) {
    stop();
  } else if (callbacks.size > 0) {
    start();
  }
};

const ensureInit = () => {
  if (initialized || !import.meta.client) return;
  initialized = true;
  document.addEventListener("visibilitychange", onVisibilityChange);
};

export function useRAFManager() {
  ensureInit();

  return {
    register(id: string, cb: RAFCallback) {
      callbacks.set(id, cb);
      if (!running && !document.hidden) {
        start();
      }
    },

    unregister(id: string) {
      callbacks.delete(id);
      if (callbacks.size === 0) {
        stop();
      }
    },

    /** Force pause (e.g. during page transitions) */
    pause: stop,

    /** Force resume */
    resume() {
      if (callbacks.size > 0 && !document.hidden) {
        start();
      }
    },

    /** Number of active consumers */
    get size() {
      return callbacks.size;
    },
  };
}
