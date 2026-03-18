type AnimationEventCallback = (...args: any[]) => void;

/**
 * Singleton event bus for animation orchestration across components.
 *
 * Typical events:
 *   page:beforeLeave  page:afterLeave  page:beforeEnter  page:afterEnter
 *   section:<name>:enter  section:<name>:leave
 *   hero:complete  smiley:appear
 */
class AnimationBus {
  private listeners = new Map<string, Set<AnimationEventCallback>>();

  on(event: string, cb: AnimationEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => this.off(event, cb);
  }

  once(event: string, cb: AnimationEventCallback): () => void {
    const wrapper: AnimationEventCallback = (...args) => {
      this.off(event, wrapper);
      cb(...args);
    };
    return this.on(event, wrapper);
  }

  off(event: string, cb: AnimationEventCallback): void {
    this.listeners.get(event)?.delete(cb);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }

  clear(): void {
    this.listeners.clear();
  }
}

// Single instance shared across the entire app
const bus = new AnimationBus();

/**
 * Component-scoped access to the global animation bus.
 * Listeners registered via on() / once() are auto-removed on unmount.
 *
 * Usage:
 *   const { on, once, emit } = useAnimationBus()
 *
 *   // Listen (auto-cleaned on unmount)
 *   on('hero:complete', () => startHeaderAnimation())
 *
 *   // Emit from anywhere
 *   emit('hero:complete')
 *
 *   // One-shot listener
 *   once('page:afterEnter', () => revealSection())
 */
export function useAnimationBus() {
  const cleanups: (() => void)[] = [];

  const on = (event: string, cb: AnimationEventCallback): (() => void) => {
    const unsub = bus.on(event, cb);
    cleanups.push(unsub);
    return unsub;
  };

  const once = (event: string, cb: AnimationEventCallback): (() => void) => {
    const unsub = bus.once(event, cb);
    cleanups.push(unsub);
    return unsub;
  };

  // Auto-cleanup when the component unmounts
  if (getCurrentInstance()) {
    onUnmounted(() => cleanups.forEach((fn) => fn()));
  }

  return {
    on,
    once,
    off: bus.off.bind(bus),
    emit: bus.emit.bind(bus),
  };
}
