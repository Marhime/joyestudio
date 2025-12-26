<template>
  <section
    data-scroll
    data-scroll-offset="0%, 100%"
    data-scroll-event-progress="ProcessPageEvent"
    ref="processSectionRef"
    class="process-section"
  >
    <div
      data-scroll
      data-scroll-offset="0%, 100%"
      data-scroll-event-progress="InfoBarEvent"
      :style="{ '--progress': String(progressRef ?? '') }"
      class="process-container"
    >
      <div class="process-pin">
        <div data-process-panel class="process process-3">
          <div class="step-container">
            <div class="process-step">Ship</div>
          </div>
          <div class="container-grid">
            <h1 ref="titleRef" class="title heading-1">Release the Magic</h1>
            <p class="subtitle text-body-1">
              ship with confidence, monitor real user results, then iterate
              quickly to grow impact and smiles.
            </p>
          </div>
        </div>
        <div data-process-panel class="process process-2">
          <div class="step-container">
            <div class="process-step">Build</div>
          </div>
          <div class="container-grid">
            <h1 ref="titleRef" class="title heading-1">Build the Thing</h1>
            <p class="subtitle text-body-1">
              Navigators are shaped by the data you share and are your gateway
              to earning Navigate points.
            </p>
          </div>
        </div>

        <div data-process-panel class="process process-1">
          <div class="step-container">
            <div class="process-step">Concept</div>
          </div>
          <div class="container-grid">
            <h1 ref="titleRef" class="title heading-1">Concepting the Ideas</h1>
            <p class="subtitle text-body-1">
              we sketch playful directions, test ideas quickly with moodboards
              and users to choose the strongest concept.
            </p>
          </div>
        </div>
        <div data-process-panel class="process process-0">
          <div class="step-container">
            <div class="process-step">Scope</div>
          </div>
          <div class="container-grid">
            <h1 ref="titleRef" class="title heading-1">Scope the Win</h1>
            <p class="subtitle text-body-1">
              We nail goals, constraints and priorities so everyone agrees on
              what we'll build and why.
            </p>
          </div>
        </div>
      </div>
    </div>
    <div ref="infoBarRef" class="info-bar blend-mode">
      <div class="container info-wrapper">
        <div class="bullet-container">
          <div class="bullet bullet--0"></div>
          <div class="bullet bullet--1"></div>
          <div class="bullet bullet--2"></div>
          <div class="bullet bullet--3"></div>
        </div>
        <div ref="stepWrapperRef" class="step-wrapper">
          <div class="step-container">
            <div class="step">
              <p data-name-placeholder class="name-placeholder">0</p>
              <p class="step-name step-name--0">
                <svg
                  width="74"
                  height="59"
                  viewBox="0 0 20 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9.17977 14.569C9.27151 14.7022 9.39426 14.8112 9.53746 14.8864C9.68065 14.9617 9.84 15.001 10.0018 15.001C10.1635 15.001 10.3229 14.9617 10.4661 14.8864C10.6093 14.8112 10.732 14.7022 10.8238 14.569L19.8238 1.569C19.9279 1.41906 19.989 1.24343 20.0004 1.06121C20.0118 0.87898 19.973 0.697123 19.8883 0.535394C19.8035 0.373665 19.6761 0.238248 19.5198 0.143858C19.3635 0.049468 19.1843 -0.000286344 19.0018 1.23965e-06H1.00177C0.819611 0.000753649 0.641106 0.0511479 0.485448 0.145764C0.329791 0.24038 0.202871 0.375639 0.118336 0.536994C0.0338024 0.698349 -0.00514691 0.879696 0.00567705 1.06153C0.016501 1.24337 0.0766887 1.41881 0.179768 1.569L9.17977 14.569Z"
                    fill="white"
                  />
                </svg>
              </p>
              <p class="step-name step-name--1">1</p>
              <p class="step-name step-name--2">2</p>
              <p class="step-name step-name--3">3</p>
              <p class="step-name step-name--4">4</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
const { $gsap } = useNuxtApp();
const processRefs = ref<(HTMLElement | null)[]>([]);
const progressRef = ref<number | null>(null);
const infoBarRef = ref<HTMLElement | null>(null);
const stepWrapperRef = ref<HTMLElement | null>(null);

onMounted(() => {
  processRefs.value = $gsap.utils.toArray([
    "[data-process-panel]",
  ]) as HTMLElement[];
  const reversedRefs = [...processRefs.value].reverse();
  const stepNames = $gsap.utils.toArray(".step-name") as HTMLElement[];
  const stepCounters = $gsap.utils
    .toArray(".counter")
    .reverse() as HTMLElement[];

  // Créer un tableau des largeurs pour chaque étape
  const stepWidths = stepNames.map((el) => el.offsetWidth);

  // Initialiser la largeur du placeholder avec la première étape
  // $gsap.set(".name-placeholder", {
  //   width: `${stepWidths[0]}px`,
  // });

  $gsap.set(stepNames.slice(1), {
    yPercent: 100,
  });
  // $gsap.set(stepCounters.slice(1), {
  //   xPercent: -100,
  // });

  const tlPanels = $gsap.timeline({ paused: true, duration: 1 });
  const tlBullets = $gsap.timeline({ paused: true, duration: 1 });

  stepNames.forEach((el, index) => {
    const currentIndex = index;
    const nextIndex = index + 1;

    if (
      index !== stepNames.length - 1 &&
      stepWidths?.[currentIndex] &&
      stepWidths[nextIndex]
    ) {
      const isBigger = stepWidths?.[nextIndex] >= stepWidths[currentIndex];
      tlBullets
        .to(
          `.step-name--${currentIndex}`,
          {
            yPercent: -100,
            duration: 0.25,
            ease: "power4.inOut",
          },
          0.25 * index
        )
        .to(
          `.step-name--${nextIndex}`,
          {
            yPercent: 0,
            duration: 0.25,
            ease: "power4.inOut",
          },
          "<"
        );
    }
    if (index === stepCounters.length - 1) {
      tlBullets.fromTo(
        `.counter--${index}`,
        {
          xPercent: -100,
          duration: 0.125,
        },
        {
          xPercent: 0,
          duration: 0.125,
        },
        0.75
      );
    }
  });

  reversedRefs.forEach((el, index) => {
    if (el && index !== reversedRefs.length - 1) {
      tlPanels
        .to(el, {
          ease: "power4.inOut",
          clipPath: "inset(0 0 100% 0)",
          transformOrigin: "bottom",
          duration: 1,
        })
        .add(() => {
          // Update the progress when the panel animation completes
          infoBarRef.value?.classList.toggle("blend-mode");
        }, 0.33);
    }
    if (index === 0) {
      tlBullets.from(
        `.bullet--${index}`,
        {
          keyframes: {
            "0%": { yPercent: 0 },
            "50%": { yPercent: -250 },
            "100%": { yPercent: 0 },
          },
          duration: 0.33,
          ease: "power4.inOut",
        },
        0
      );
    }
    if (index === 1) {
      tlBullets.from(
        `.bullet--${index}`,
        {
          keyframes: {
            "0%": { yPercent: 0 },
            "50%": { yPercent: -250 },
            "100%": { yPercent: 0 },
          },
          duration: 0.33,
        },
        0.25
      );
    }
    if (index === 2) {
      tlBullets.from(
        `.bullet--${index}`,
        {
          keyframes: {
            "0%": { yPercent: 0 },
            "50%": { yPercent: -250 },
            "100%": { yPercent: 0 },
          },
          duration: 0.33,
        },
        0.5
      );
    }
    if (index === reversedRefs.length - 1) {
      tlBullets.fromTo(
        `.bullet--${index}`,
        {
          yPercent: 0,
          duration: 0.165,
        },
        {
          yPercent: -250,
          duration: 0.165,
        },
        0.75
      );
    }
  });

  window.addEventListener("ProcessPageEvent", (event: any) => {
    const { progress } = event.detail;
    tlPanels.progress(progress);
  });

  let previousProgress = 0;

  const stepStates = {
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  };

  // function to reset all step states except the current one
  function resetStepStates(exceptStep: keyof typeof stepStates) {
    for (const key in stepStates) {
      if (key !== exceptStep) {
        stepStates[key as keyof typeof stepStates] = false;
      }
    }
  }

  window.addEventListener("InfoBarEvent", (event) => {
    const { progress } = event.detail;
    const isScrollingDown = progress > previousProgress;

    // Step 1 - Scope (0.12 - 0.25)
    if (progress >= 0.125 && progress < 0.5) {
      if (!stepStates.step1) {
        resetStepStates("step1");

        // action
        stepStates.step1 = true;
        console.log("🎯 ACTION Step 1 - UNE SEULE FOIS!");
      }
    } else if (progress >= 0.5 && progress < 0.75) {
      resetStepStates("step2");
      // action
      stepStates.step2 = true;
      console.log("🎯 ACTION Step 2 - UNE SEULE FOIS!");
    } else if (progress >= 0.75 && progress < 0.865) {
      resetStepStates("step3");

      // action
      stepStates.step3 = true;
      console.log("🎯 ACTION Step 3 - UNE SEULE FOIS!");
    } else if (progress >= 0.865) {
      resetStepStates("step4");

      // action
      stepStates.step4 = true;
      console.log("🎯 ACTION Step 4 - UNE SEULE FOIS!");
    }

    // Répéter pour les autres steps...

    tlBullets.progress(progress);
    previousProgress = progress;
  });
});

onUnmounted(() => {
  window.removeEventListener("ProcessPageEvent", () => {});
  window.removeEventListener("InfoBarEvent", () => {});
});
</script>

<style>
.process-container {
  height: 350vh;
  position: relative;
}

.process-pin {
  position: sticky;
  top: 0;
  min-height: 100vh;
}

.process {
  text-align: center;
  height: 100vh;
  padding-top: 10vh;
  position: absolute;
  inset: 0;
  z-index: 2;
}

.info-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  color: var(--color-white);
}

.info-wrapper {
  margin-block: var(--gutter-y);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
}

.bullet-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10rem 5rem;
  background-color: var(--color-white);
  border-radius: 20px;
  gap: 1rem;
  display: none;
}

.bullet {
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  background-color: var(--color-white);
}

.step-wrapper {
  display: flex;
  align-items: center;
}

.step-container {
  color: var(--color-light);
  height: auto;
  border-radius: 200px;
  font-weight: 600;
  display: inline-flex;
  justify-content: center;
  z-index: 2;
  /* transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); */
}

.step {
  overflow: hidden;
  position: relative;
}

.name-placeholder,
.step-name {
  font-size: 17rem;
  font-weight: 900;
  line-height: 1;
}

.process-step {
  font-size: 2rem;
  font-weight: 600;
}

.name-placeholder {
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  white-space: nowrap;
}

.step-name {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: max-content;
}

.process-step {
  display: flex;
  justify-content: center;
  align-items: center;
  width: max-content;
}

.process-0 {
  background-color: var(--color-black);
  color: var(--color-white);
}

.process-1 {
  background-color: var(--color-orange);
  color: var(--color-white);
}

.process-1 .process-step {
  display: flex;
  justify-content: center;
  align-items: center;
  width: max-content;
}

.process-2 {
  background-color: var(--color-blue);
  color: var(--color-white);
}

.process-3 {
  background-color: var(--color-yellow);
  color: var(--color-white);
}

.title {
  grid-column: 3 / 11;
}

.subtitle {
  margin-top: 6.5rem;
  grid-column: 5 / 9;
}

/*  min width 1024 */
@media (min-width: 1024px) {
  .process-container {
    height: 500vh;
  }
}
</style>
