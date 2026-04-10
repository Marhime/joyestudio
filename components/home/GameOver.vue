<template>
  <div class="game-over">
    <div class="game-over__content grid-container">
      <div class="grid">
        <div class="game-over__main">
          <!-- Score -->
          <div class="game-over__score-block">
            <p class="game-over__label t1-body uppercase">Score</p>
            <p class="game-over__score t1-h2">{{ displayScore }}</p>
          </div>

          <!-- Stats -->
          <div class="game-over__stats">
            <div class="game-over__stat">
              <span class="game-over__stat-value">{{ coins }}</span>
              <span class="game-over__stat-label t1-body">coins</span>
            </div>
            <div class="game-over__stat">
              <span class="game-over__stat-value">{{ localBest }}</span>
              <span class="game-over__stat-label t1-body">best</span>
            </div>
          </div>

          <!-- Name input for leaderboard -->
          <div class="game-over__submit">
            <input
              v-model="playerName"
              type="text"
              maxlength="30"
              placeholder="Your name"
              class="game-over__input"
              @keydown.enter="submitToLeaderboard"
            />
            <button
              class="game-over__submit-btn"
              :disabled="submitting || submitted"
              @click="submitToLeaderboard"
            >
              {{ submitted ? "Submitted ✓" : "Submit Score" }}
            </button>
          </div>

          <!-- Actions -->
          <div class="game-over__actions">
            <button
              class="game-over__btn game-over__btn--primary"
              @click="$emit('replay')"
            >
              Play Again
            </button>
            <button
              class="game-over__btn game-over__btn--secondary"
              @click="$emit('switch')"
            >
              Switch Character
            </button>
          </div>

          <!-- Leaderboard -->
          <div v-if="leaderboard.length" class="game-over__leaderboard">
            <p class="game-over__leaderboard-title t1-body uppercase">
              Top Scores
            </p>
            <div
              v-for="(entry, i) in leaderboard"
              :key="entry.id"
              class="game-over__leaderboard-row"
            >
              <span class="game-over__leaderboard-rank">{{ i + 1 }}.</span>
              <span class="game-over__leaderboard-name">{{
                entry.player_name
              }}</span>
              <span
                class="game-over__leaderboard-char"
                :style="{
                  color: entry.character === 'maxime' ? '#6ebff6' : '#ffa9c9',
                }"
                >{{ entry.character === "maxime" ? "M" : "K" }}</span
              >
              <span class="game-over__leaderboard-score">{{
                entry.score
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Character, LeaderboardEntry } from "~/types/game";
import { useLeaderboard } from "~/composables/useLeaderboard";

const props = defineProps<{
  score: number;
  coins: number;
  character: Character;
}>();

defineEmits<{
  replay: [];
  switch: [];
}>();

const { submitScore, getTopScores, getLocalBest, setLocalBest } =
  useLeaderboard();

const displayScore = ref(0);
const playerName = ref("");
const submitting = ref(false);
const submitted = ref(false);
const leaderboard = ref<LeaderboardEntry[]>([]);
const localBest = ref(0);

onMounted(async () => {
  // Animate score counter
  const duration = 1200;
  const start = performance.now();
  const animate = (now: number) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    displayScore.value = Math.floor(props.score * eased);
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);

  // Save local best
  setLocalBest(props.score);
  localBest.value = getLocalBest();

  // Fetch leaderboard
  leaderboard.value = await getTopScores(10);

  // Resume Lenis
  const { $lenis } = useNuxtApp();
  if ($lenis) {
    ($lenis as any).start?.();
  }
});

async function submitToLeaderboard() {
  if (!playerName.value.trim() || submitting.value || submitted.value) return;

  submitting.value = true;
  const success = await submitScore(
    playerName.value,
    props.character.id,
    props.score,
  );
  submitting.value = false;

  if (success) {
    submitted.value = true;
    // Refresh leaderboard
    leaderboard.value = await getTopScores(10);
  }
}
</script>

<style lang="scss" scoped>
.game-over {
  min-height: 100svh;
  display: flex;
  align-items: center;
  padding-block: 5rem;
  background-color: var(--color-white);

  &__main {
    grid-column: 2 / 12;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2.5rem;

    @include respond-to("desktop") {
      grid-column: 4 / 9;
    }
  }

  &__label {
    color: rgba(#221e1f, 0.4);
    text-align: center;
    letter-spacing: 0.15em;
  }

  &__score {
    text-align: center;
    font-size: 8rem;
    font-weight: 800;
    line-height: 1;
    color: #221e1f;

    @include respond-to("desktop") {
      font-size: 12rem;
    }
  }

  &__stats {
    display: flex;
    gap: 4rem;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;

    &-value {
      font-family: "Inter Tight", sans-serif;
      font-size: 2.4rem;
      font-weight: 700;
      color: #221e1f;
    }

    &-label {
      color: rgba(#221e1f, 0.4);
    }
  }

  &__submit {
    display: flex;
    gap: 1rem;
    width: 100%;
    max-width: 36rem;
  }

  &__input {
    flex: 1;
    padding: 1rem 1.4rem;
    border: 1px solid rgba(#221e1f, 0.15);
    background: transparent;
    font-family: "Inter Tight", sans-serif;
    font-size: 1.3rem;
    color: #221e1f;
    outline: none;

    &:focus {
      border-color: #221e1f;
    }

    &::placeholder {
      color: rgba(#221e1f, 0.3);
    }
  }

  &__submit-btn {
    padding: 1rem 2rem;
    border: none;
    background: #221e1f;
    color: #fff;
    font-family: "Inter Tight", sans-serif;
    font-size: 1.1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }

  &__actions {
    display: flex;
    gap: 1.5rem;
    width: 100%;
    max-width: 36rem;
  }

  &__btn {
    flex: 1;
    padding: 1.2rem;
    font-family: "Inter Tight", sans-serif;
    font-size: 1.2rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: opacity 0.2s;
    border: none;

    &:hover {
      opacity: 0.85;
    }

    &--primary {
      background: #6ebff6;
      color: #fff;
    }

    &--secondary {
      background: transparent;
      border: 1px solid rgba(#221e1f, 0.2);
      color: #221e1f;
    }
  }

  &__leaderboard {
    width: 100%;
    max-width: 36rem;
    margin-top: 1rem;

    &-title {
      color: rgba(#221e1f, 0.4);
      letter-spacing: 0.15em;
      margin-bottom: 1rem;
    }

    &-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid rgba(#221e1f, 0.06);
      font-family: "Inter Tight", sans-serif;
      font-size: 1.2rem;
    }

    &-rank {
      width: 2rem;
      color: rgba(#221e1f, 0.3);
      font-weight: 700;
    }

    &-name {
      flex: 1;
      color: #221e1f;
    }

    &-char {
      font-weight: 700;
    }

    &-score {
      font-weight: 700;
      color: #221e1f;
    }
  }
}
</style>
