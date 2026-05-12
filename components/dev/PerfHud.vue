<template>
  <div v-if="visible" class="perf-hud" :class="{ 'perf-hud--bad': stats.fps < 50 }">
    <div class="perf-hud__row">
      <span>FPS</span><b>{{ stats.fps.toFixed(1) }}</b>
    </div>
    <div class="perf-hud__row">
      <span>Frame</span><b>{{ stats.frameMs.toFixed(1) }} ms</b>
    </div>
    <div class="perf-hud__row perf-hud__sub">
      <span>Three</span><b>{{ stats.threeMs.toFixed(1) }} ms</b>
    </div>
    <div class="perf-hud__row perf-hud__sub">
      <span>Other</span><b>{{ stats.otherMs.toFixed(1) }} ms</b>
    </div>
    <div class="perf-hud__row">
      <span>ST</span><b>{{ stats.stCount }}</b>
    </div>
    <div class="perf-hud__row">
      <span>RAF</span><b>{{ stats.rafSize }}</b>
    </div>
    <div class="perf-hud__hint">Shift+P to toggle</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { perfMonitor, type Stats } from "~/utils/perfMonitor";
import { useRAFManager } from "~/composables/useRAFManager";

const visible = ref(false);
const stats = ref<Stats>({
  fps: 0,
  frameMs: 0,
  threeMs: 0,
  otherMs: 0,
  rafSize: 0,
  stCount: 0,
});

let interval: ReturnType<typeof setInterval> | null = null;
const raf = useRAFManager();
const nuxtApp = useNuxtApp();

function refresh() {
  const ST = (nuxtApp as any).$ScrollTrigger;
  const stCount = ST?.getAll?.()?.length ?? 0;
  stats.value = perfMonitor.getStats(raf.size, stCount);
}

function setEnabled(v: boolean) {
  visible.value = v;
  if (v) {
    perfMonitor.enable();
    sessionStorage.setItem("perfHud", "1");
    if (!interval) interval = setInterval(refresh, 250);
  } else {
    perfMonitor.disable();
    sessionStorage.removeItem("perfHud");
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }
}

function onKey(e: KeyboardEvent) {
  if (e.shiftKey && (e.key === "P" || e.key === "p")) {
    e.preventDefault();
    setEnabled(!visible.value);
  }
}

onMounted(() => {
  if (!import.meta.client) return;
  const fromUrl = new URLSearchParams(window.location.search).get("perf") === "1";
  const fromStorage = sessionStorage.getItem("perfHud") === "1";
  if (fromUrl || fromStorage) setEnabled(true);
  window.addEventListener("keydown", onKey);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  if (interval) clearInterval(interval);
  perfMonitor.disable();
});
</script>

<style scoped>
.perf-hud {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 99999;
  padding: 0.8rem 1rem 0.6rem;
  background: rgba(0, 0, 0, 0.82);
  color: #fff;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 1.1rem;
  line-height: 1.45;
  min-width: 16rem;
  border-radius: 4px;
  pointer-events: none;
  user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.perf-hud--bad {
  border-color: rgba(255, 110, 110, 0.6);
}

.perf-hud__row {
  display: flex;
  justify-content: space-between;
  gap: 1.2rem;
}

.perf-hud__row span {
  opacity: 0.55;
}

.perf-hud__row b {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.perf-hud__sub {
  padding-left: 0.6rem;
  opacity: 0.85;
}

.perf-hud__sub span::before {
  content: "└ ";
  opacity: 0.4;
}

.perf-hud__hint {
  margin-top: 0.4rem;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.9rem;
  opacity: 0.35;
  text-align: center;
}
</style>
