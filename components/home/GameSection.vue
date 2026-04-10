<template>
  <section ref="section" class="game-section">
    <!-- Character Select (= Team section) -->
    <CharacterSelect v-if="state === 'select'" @select="onCharacterSelect" />

    <!-- Game Canvas -->
    <GameCanvas
      v-if="state === 'countdown' || state === 'playing'"
      :character="selectedCharacter!"
      @gameover="onGameOver"
      @started="state = 'playing'"
    />

    <!-- Game Over -->
    <GameOver
      v-if="state === 'gameover'"
      :score="finalScore"
      :coins="finalCoins"
      :character="selectedCharacter!"
      @replay="onReplay"
      @switch="onSwitch"
    />
  </section>
</template>

<script setup lang="ts">
import type { Character, GameState } from "~/types/game";
import CharacterSelect from "./CharacterSelect.vue";
import GameCanvas from "./GameCanvas.vue";
import GameOver from "./GameOver.vue";

const section = useTemplateRef<HTMLElement>("section");
const state = ref<GameState>("select");
const selectedCharacter = ref<Character | null>(null);
const finalScore = ref(0);
const finalCoins = ref(0);

function onCharacterSelect(character: Character) {
  selectedCharacter.value = character;
  state.value = "countdown";
}

function onGameOver(data: { score: number; coins: number }) {
  finalScore.value = data.score;
  finalCoins.value = data.coins;
  state.value = "gameover";
}

function onReplay() {
  state.value = "countdown";
}

function onSwitch() {
  selectedCharacter.value = null;
  state.value = "select";
}
</script>

<style lang="scss" scoped>
.game-section {
  position: relative;
  min-height: 100svh;
  background-color: var(--color-white);
  z-index: 1;
  overflow: hidden;
}
</style>
