import type { WatchSource } from "vue";

export function useGSAP(
  callback: (isReducedMotion: boolean) => void,
  watchSource?: WatchSource
): () => void {
  const { $gsap, $ScrollTrigger } = useNuxtApp();
  let ctx: gsap.Context | undefined;

  function _callback() {
    ctx?.revert();
    nextTick(() => {
      ctx = $gsap.context(() => {
        callback(
          window?.matchMedia("(prefers-reduced-motion: reduce)").matches ??
            false
        );

        $ScrollTrigger.refresh();
      });
    });
  }

  onMounted(_callback);
  if (watchSource) {
    watch(watchSource, _callback);
  }
  onUnmounted(() => ctx?.revert());

  // Return a teardown function so callers can manually revert the current context
  return () => {
    ctx?.revert();
    ctx = undefined;
  };
}
