<template>
  <section ref="sectionRef" class="hero-home" data-scroll>
    <div class="container-grid">
      <h1 ref="titleRef" class="title heading-1">
        <span class="hero-title-1">We make brands</span>
        <span class="highlight">
          <span class="rise-word"> rise </span
          ><span class="shine-word"> shine </span></span
        >
      </h1>
    </div>
    <svg
      width="861"
      height="844"
      viewBox="0 0 861 844"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="hero-smiley"
    >
      <rect
        x="187.483"
        y="1.54357"
        width="700.129"
        height="674.161"
        rx="337.081"
        transform="rotate(16.0531 187.483 1.54357)"
        fill="currentColor"
        stroke="currentColor"
      />
      <path
        d="M285.527 448.822C277.553 450.567 269.505 445.679 267.553 437.906C265.6 430.132 270.481 422.415 278.456 420.67C286.43 418.925 294.478 423.813 296.43 431.586C298.383 439.36 293.501 447.077 285.527 448.822Z"
        fill="#221E1F"
      />
      <path
        d="M154.537 367.255C156.494 375.029 164.539 379.916 172.516 378.172C180.494 376.427 185.372 368.709 183.415 360.934C181.458 353.161 173.414 348.274 165.436 350.019C157.473 351.766 152.581 359.48 154.537 367.255Z"
        fill="#221E1F"
      />
      <path
        d="M192.236 416.414C190.956 418.061 190.078 419.972 189.637 422.033C189.197 424.093 189.217 426.261 189.692 428.406C190.166 430.549 191.089 432.626 192.407 434.511C193.711 436.392 195.387 438.045 197.32 439.362C199.253 440.681 201.418 441.644 203.674 442.187C205.916 442.729 208.206 442.844 210.412 442.524C212.617 442.205 214.677 441.456 216.477 440.324C218.277 439.192 219.784 437.701 220.89 435.939"
        stroke="#221E1F"
        stroke-width="5.5"
        stroke-linecap="round"
      />
    </svg>
  </section>
</template>

<script lang="ts" setup>
import { heroTimeline } from "~/animations/heroTimeline";

const titleRef = ref<HTMLElement | null>(null);
const sectionRef = ref<HTMLElement | null>(null);
const changingWordRef = ref<HTMLElement | null>(null);

onMounted(() => {
  const timeline = heroTimeline(sectionRef, changingWordRef);
  timeline.play();
});
</script>

<style scoped>
section {
  min-height: 100vh;
  padding-top: 22.97vh;
  text-align: center;
  background-color: var(--color-black);
  color: var(--color-white);
  background: linear-gradient(
    -180deg,
    var(--color-black),
    var(--color-black),
    var(--color-light),
    var(--color-light)
  );
  background-size: 500% 500%;
}

.hero-smiley {
  position: absolute;
  width: 100%;
  height: auto;
  z-index: 1;
  color: var(--color-yellow);
}

.title {
  grid-column: 2 / 12;
}

.hero-title-1 {
  mix-blend-mode: difference;
}

.highlight {
  margin-left: 0.3ch;
}

.highlight {
  color: var(--color-yellow);
  font-weight: 900;
  display: inline-flex;
  justify-content: flex-start;
  overflow: hidden;
  position: relative;
  width: 5ch;
}

.shine-word,
.smile-word {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  color: var(--color-yellow);
  font-weight: 900;
  display: inline-flex;
  word-break: keep-all;
}
</style>
