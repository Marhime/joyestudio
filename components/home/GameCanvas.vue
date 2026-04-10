<template>
  <div class="game-canvas">
    <!-- Countdown overlay -->
    <Transition name="fade">
      <div v-if="showCountdown" class="game-canvas__countdown">
        <span ref="countdownText" class="game-canvas__countdown-text">{{
          countdownValue
        }}</span>
      </div>
    </Transition>

    <!-- Phaser container -->
    <div ref="gameContainer" class="game-canvas__container" />

    <!-- Touch controls (mobile) -->
    <div v-if="isTouchDevice" class="game-canvas__touch">
      <button
        class="game-canvas__touch-btn game-canvas__touch-btn--jump"
        @touchstart.prevent="() => {}"
      >
        JUMP
      </button>
      <button
        class="game-canvas__touch-btn game-canvas__touch-btn--dash"
        @touchstart.prevent="() => {}"
      >
        DASH
      </button>
    </div>

    <!-- Restart button -->
    <button
      v-if="!showCountdown"
      class="game-canvas__restart"
      @click="restartGame"
    >
      ↻
    </button>

    <!-- Controls hint (desktop) -->
    <div v-if="showControls" class="game-canvas__controls-hint">
      <span>SPACE / ↑ = Jump</span>
      <span>SHIFT = Dash</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Character } from "~/types/game";

const props = defineProps<{
  character: Character;
}>();

const emit = defineEmits<{
  gameover: [data: { score: number; coins: number }];
  started: [];
}>();

const gameContainer = useTemplateRef<HTMLElement>("gameContainer");
const countdownText = useTemplateRef<HTMLElement>("countdownText");

const showCountdown = ref(true);
const countdownValue = ref(3);
const showControls = ref(true);
const isTouchDevice = ref(false);

let game: any = null;

onMounted(async () => {
  if (!import.meta.client) return;

  isTouchDevice.value = "ontouchstart" in window;

  // Run countdown
  await runCountdown();

  // Dynamic import Phaser (heavy, client-only)
  const Phaser = (await import("phaser")).default;
  const { createGameConfig } = await import("~/game/config");

  if (!gameContainer.value) return;

  const config = createGameConfig(gameContainer.value);
  game = new Phaser.Game(config);

  // Pass character to the game
  game.registry.set("characterId", props.character.id);

  // Listen for game events
  game.events.on("game:started", () => {
    emit("started");
    // Hide controls hint after 3s
    setTimeout(() => {
      showControls.value = false;
    }, 3000);
  });

  game.events.on("game:over", (data: { score: number; coins: number }) => {
    emit("gameover", data);
  });

  // Stop Lenis smooth scroll during gameplay
  const { $lenis } = useNuxtApp();
  if ($lenis) {
    ($lenis as any).stop?.();
  }
});

onBeforeUnmount(() => {
  if (game) {
    game.destroy(true);
    game = null;
  }

  // Resume Lenis
  const { $lenis } = useNuxtApp();
  if ($lenis) {
    ($lenis as any).start?.();
  }
});

function restartGame() {
  if (!game) return;
  // Restart GameScene + UIScene from scratch
  game.scene.stop("UIScene");
  game.scene.stop("GameScene");
  game.registry.set("characterId", props.character.id);
  game.scene.start("GameScene", { characterId: props.character.id });
  game.scene.start("UIScene");
}

async function runCountdown() {
  for (let i = 3; i >= 1; i--) {
    countdownValue.value = i;
    await new Promise((r) => setTimeout(r, 800));
  }
  countdownValue.value = 0;
  showCountdown.value = false;
}
</script>

<style lang="scss" scoped>
.game-canvas {
  position: relative;
  width: 100%;
  height: 100svh;

  &__container {
    width: 100%;
    height: 100%;

    :deep(canvas) {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }
  }

  &__countdown {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(#221e1f, 0.85);
    z-index: 20;

    &-text {
      font-family: "Inter Tight", sans-serif;
      font-size: 12rem;
      font-weight: 800;
      color: #fff;
      line-height: 1;
    }
  }

  &__touch {
    position: absolute;
    bottom: 2rem;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    padding: 0 2rem;
    pointer-events: none;
    z-index: 15;

    &-btn {
      pointer-events: auto;
      padding: 1.5rem 3rem;
      border: 2px solid rgba(#221e1f, 0.3);
      background: rgba(#fff, 0.15);
      backdrop-filter: blur(4px);
      color: #221e1f;
      font-family: "Inter Tight", sans-serif;
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      border-radius: 0;
      cursor: pointer;

      &:active {
        background: rgba(#221e1f, 0.15);
      }
    }
  }

  &__restart {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    z-index: 20;
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(#221e1f, 0.15);
    background: rgba(#fff, 0.25);
    backdrop-filter: blur(4px);
    color: #221e1f;
    font-size: 2rem;
    cursor: pointer;
    transition: background 0.2s;
    line-height: 1;

    &:hover {
      background: rgba(#fff, 0.6);
    }
  }

  &__controls-hint {
    position: absolute;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 2rem;
    z-index: 15;

    span {
      font-family: "Inter Tight", sans-serif;
      font-size: 1.1rem;
      color: rgba(#221e1f, 0.4);
      letter-spacing: 0.05em;
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
