<template>
  <div ref="selectRef" class="char-select">
    <!-- Scanline overlay for retro CRT feel -->
    <div class="char-select__scanlines" aria-hidden="true" />

    <!-- Title -->
    <div class="char-select__header">
      <h2 class="char-select__title">
        <span class="char-select__title-sub t1-body uppercase"
          >// Choose your</span
        >
        <span class="char-select__title-main t1-h2">
          <span class="t1-h2-accent font-como font-italic">P</span>layer
          <span class="t1-h2-accent font-como font-italic">S</span>elect
        </span>
      </h2>
    </div>

    <!-- Cards -->
    <div class="char-select__arena">
      <div class="char-select__cards">
        <div
          v-for="character in team"
          :key="character.id"
          class="player-card"
          :class="[
            `player-card--${character.id}`,
            {
              'player-card--active': selectedId === character.id,
              'player-card--idle': selectedId && selectedId !== character.id,
            },
          ]"
          @click="selectedId = character.id"
        >
          <!-- Selected badge -->
          <Transition name="badge">
            <div
              v-if="selectedId === character.id"
              class="player-card__badge"
              :style="{ backgroundColor: character.color }"
            >
              <span>PLAYER</span>
            </div>
          </Transition>

          <!-- Card frame -->
          <div
            class="player-card__frame"
            :style="{
              '--card-color': character.color,
              borderColor:
                selectedId === character.id ? character.color : 'transparent',
            }"
          >
            <!-- Avatar -->
            <div class="player-card__avatar">
              <NuxtImg
                :src="character.avatar"
                :alt="character.name"
                width="400"
                height="500"
                class="player-card__img"
              />
            </div>

            <!-- Corner accents -->
            <div class="player-card__corner player-card__corner--tl" />
            <div class="player-card__corner player-card__corner--tr" />
            <div class="player-card__corner player-card__corner--bl" />
            <div class="player-card__corner player-card__corner--br" />
          </div>

          <!-- Info below card -->
          <div class="player-card__info">
            <p v-if="character.id === 'maxime'" class="player-card__name t1-h3">
              Max<span class="t1-h3-accent font-como font-italic">i</span>me
            </p>
            <p v-else class="player-card__name t1-h3">
              K<span class="t1-h3-accent font-como font-italic">a</span>rla
            </p>

            <p class="player-card__role t1-body">{{ character.role }}</p>

            <!-- Ability -->
            <div class="player-card__ability">
              <span
                class="player-card__ability-tag"
                :style="{ color: character.color }"
              >
                ★ {{ character.ability }}
              </span>
            </div>

            <!-- Stats -->
            <div class="player-card__stats">
              <div
                v-for="(value, key) in character.stats"
                :key="key"
                class="stat"
              >
                <span class="stat__label">{{ key }}</span>
                <div class="stat__bar">
                  <div
                    class="stat__fill"
                    :style="{
                      width: `${value * 10}%`,
                      backgroundColor: character.color,
                    }"
                  />
                </div>
                <span class="stat__value" :style="{ color: character.color }">{{
                  value
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VS divider -->
      <div class="char-select__vs">
        <span class="char-select__vs-text font-como font-italic">VS</span>
      </div>
    </div>

    <!-- Select button -->
    <div class="char-select__action">
      <button
        class="char-select__btn"
        :class="{ 'char-select__btn--ready': selectedId }"
        :disabled="!selectedId"
        :style="{
          '--btn-color': selectedCharacter?.color ?? '#c5cdcf',
        }"
        @click="selectedCharacter && $emit('select', selectedCharacter)"
      >
        <span class="char-select__btn-text">{{
          selectedId ? "SELECT" : "PICK A PLAYER"
        }}</span>
      </button>
    </div>

    <!-- Team info panel (shown when selected) -->
    <Transition name="panel">
      <div
        v-if="selectedCharacter"
        :key="selectedCharacter.id"
        class="char-select__panel"
      >
        <div class="char-select__panel-inner">
          <p class="char-select__panel-desc t1-body">
            {{ selectedCharacter.description }}
          </p>
          <div class="char-select__panel-brands">
            <span
              class="char-select__panel-brands-label t1-body"
              :style="{ color: selectedCharacter.color }"
              >Worked with</span
            >
            <span
              v-for="brand in selectedCharacter.workedWith"
              :key="brand"
              class="char-select__panel-brand t1-body"
            >
              {{ brand }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Character } from "~/types/game";
import { team, getCharacter } from "~/content/team";

defineEmits<{
  select: [character: Character];
}>();

const selectRef = useTemplateRef<HTMLElement>("selectRef");
const selectedId = ref<string | null>(null);

const selectedCharacter = computed<Character | null>(() =>
  selectedId.value
    ? getCharacter(selectedId.value as "maxime" | "karla")
    : null,
);
</script>

<style lang="scss" scoped>
.char-select {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100svh;
  padding: 4rem 2rem;
  background-color: #221e1f;
  overflow: hidden;

  @include respond-to("desktop") {
    padding: 6rem var(--content-margin);
  }

  // Scanline CRT overlay
  &__scanlines {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.03) 0px,
      rgba(0, 0, 0, 0.03) 1px,
      transparent 1px,
      transparent 3px
    );
  }

  // Header
  &__header {
    text-align: center;
    margin-bottom: 3rem;
    position: relative;
    z-index: 2;

    @include respond-to("desktop") {
      margin-bottom: 4rem;
    }
  }

  &__title {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;

    &-sub {
      color: rgba(#f9f9f9, 0.35);
      letter-spacing: 0.3em;
      font-size: 1rem;

      @include respond-to("desktop") {
        font-size: 1.2rem;
      }
    }

    &-main {
      color: #f9f9f9;
      font-weight: 700;
      letter-spacing: -0.04em;

      .t1-h2-accent {
        color: #6ebff6;
      }
    }
  }

  // Arena (cards + VS)
  &__arena {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    z-index: 2;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3rem;
    width: 100%;
    max-width: 72rem;

    @include respond-to("desktop") {
      flex-direction: row;
      justify-content: center;
      gap: 6rem;
    }
  }

  // VS divider
  &__vs {
    display: none;

    @include respond-to("desktop") {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 4;
    }

    &-text {
      font-size: 4rem;
      color: rgba(#f9f9f9, 0.12);
      font-weight: 700;
      letter-spacing: 0.05em;
      user-select: none;

      @include respond-to("desktop") {
        font-size: 6rem;
      }
    }
  }

  // Select button
  &__action {
    margin-top: 3rem;
    position: relative;
    z-index: 2;

    @include respond-to("desktop") {
      margin-top: 4rem;
    }
  }

  &__btn {
    position: relative;
    padding: 1.4rem 5rem;
    border: 2px solid rgba(#f9f9f9, 0.15);
    background: transparent;
    color: rgba(#f9f9f9, 0.3);
    font-family: "Inter Tight", sans-serif;
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: not-allowed;
    transition: all 0.35s ease;

    @include respond-to("desktop") {
      padding: 1.6rem 7rem;
      font-size: 1.6rem;
    }

    &--ready {
      cursor: pointer;
      border-color: var(--btn-color);
      color: #f9f9f9;
      background: var(--btn-color);

      &:hover {
        filter: brightness(1.15);
        transform: translateY(-2px);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }

  // Team info panel
  &__panel {
    margin-top: 3rem;
    max-width: 60rem;
    text-align: center;
    position: relative;
    z-index: 2;
  }

  &__panel-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  &__panel-desc {
    color: rgba(#f9f9f9, 0.5);
    max-width: 45ch;
    line-height: 1.5;
  }

  &__panel-brands {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.6rem 1.2rem;

    &-label {
      font-weight: 600;
    }
  }

  &__panel-brand {
    color: rgba(#f9f9f9, 0.35);
  }
}

// Player card
.player-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition:
    transform 0.35s ease,
    opacity 0.35s ease;
  flex: 0 0 auto;
  width: 100%;
  max-width: 26rem;

  @include respond-to("desktop") {
    max-width: 30rem;
  }

  &--idle {
    opacity: 0.4;
    transform: scale(0.95);
  }

  &--active {
    transform: scale(1.03);

    @include respond-to("desktop") {
      transform: scale(1.06);
    }
  }

  &:hover:not(.player-card--active) {
    transform: scale(1.02);
    opacity: 1;
  }

  // PLAYER badge
  &__badge {
    position: absolute;
    top: -1.4rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    padding: 0.3rem 1.6rem;
    font-family: "Inter Tight", sans-serif;
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    color: #221e1f;
    text-transform: uppercase;
    white-space: nowrap;
  }

  // Card frame
  &__frame {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 4;
    border: 3px solid transparent;
    background-color: rgba(#f9f9f9, 0.04);
    overflow: hidden;
    transition:
      border-color 0.3s ease,
      background-color 0.3s ease,
      box-shadow 0.3s ease;

    .player-card--active & {
      background-color: rgba(#f9f9f9, 0.08);
      box-shadow:
        0 0 40px -10px var(--card-color),
        inset 0 0 30px -15px var(--card-color);
    }
  }

  // Corner accents
  &__corner {
    position: absolute;
    width: 12px;
    height: 12px;
    opacity: 0;
    transition: opacity 0.3s ease;

    .player-card--active & {
      opacity: 1;
    }

    &--tl {
      top: 6px;
      left: 6px;
      border-top: 2px solid var(--card-color);
      border-left: 2px solid var(--card-color);
    }
    &--tr {
      top: 6px;
      right: 6px;
      border-top: 2px solid var(--card-color);
      border-right: 2px solid var(--card-color);
    }
    &--bl {
      bottom: 6px;
      left: 6px;
      border-bottom: 2px solid var(--card-color);
      border-left: 2px solid var(--card-color);
    }
    &--br {
      bottom: 6px;
      right: 6px;
      border-bottom: 2px solid var(--card-color);
      border-right: 2px solid var(--card-color);
    }
  }

  // Avatar
  &__avatar {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-top: 2rem;
  }

  &__img {
    width: 85%;
    height: auto;
    image-rendering: pixelated;
    object-fit: contain;
    transition: transform 0.35s ease;

    .player-card--active & {
      transform: scale(1.05);
    }
  }

  // Info
  &__info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding-top: 1.2rem;
    width: 100%;
  }

  &__name {
    color: #f9f9f9;
    font-weight: 400;
    font-size: 3.5rem;
    line-height: 0.7;
    text-align: center;

    .t1-h3-accent {
      font-size: 4.5rem;
    }

    @include respond-to("desktop") {
      font-size: 4.5rem;

      .t1-h3-accent {
        font-size: 5.8rem;
      }
    }
  }

  &__role {
    color: rgba(#f9f9f9, 0.35);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 0.9rem;
    margin-top: 0.3rem;
  }

  &__ability {
    margin-top: 0.5rem;

    &-tag {
      font-family: "Inter Tight", sans-serif;
      font-size: 1.1rem;
      font-weight: 700;
    }
  }

  // Stats
  &__stats {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    width: 100%;
    margin-top: 0.8rem;
  }
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.8rem;

  &__label {
    width: 4.5rem;
    font-family: "Inter Tight", sans-serif;
    font-size: 0.9rem;
    color: rgba(#f9f9f9, 0.25);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  &__bar {
    flex: 1;
    height: 4px;
    background-color: rgba(#f9f9f9, 0.08);
    position: relative;
  }

  &__fill {
    height: 100%;
    transition: width 0.5s ease;
  }

  &__value {
    width: 2rem;
    text-align: right;
    font-family: "Inter Tight", sans-serif;
    font-size: 1rem;
    font-weight: 700;
  }
}

// Transitions
.badge-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.badge-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.badge-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}
.badge-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

.panel-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}
.panel-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.panel-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.panel-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
