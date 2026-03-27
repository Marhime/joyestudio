<template>
  <form ref="formRef" class="interactive-form grid" @submit.prevent>
    <!-- ── Step 1: Name ──────────────────────────────────────────────────── -->
    <div
      ref="row1Ref"
      class="row row--1 t1-h4"
      :class="{ 'row--completed': currentStep > 1 }"
      @click="currentStep > 1 ? editStep(1) : null"
    >
      <p ref="text1Ref"></p>
      <span ref="wrap1Ref" class="input-wrap">
        <input
          ref="input1Ref"
          class="text-input text-input--italic"
          type="text"
          v-model="form.name"
          maxlength="25"
          autocomplete="off"
          @keydown.enter.prevent="validateStep(1)"
        />
        <span v-if="form.name && currentStep > 1">.</span>
        <span
          ref="measure1Ref"
          class="measure-span text-input text-input--italic"
          aria-hidden="true"
        ></span>
        <button
          v-if="form.name && currentStep === 1"
          type="button"
          class="enter-cue"
          @click.stop="validateStep(1)"
        >
          ↵
        </button>
      </span>
    </div>

    <!-- ── Step 2: Services (multi-select chips) ─────────────────────────── -->
    <div
      ref="row2Ref"
      class="row row--2 t1-h4"
      :class="{ 'row--completed': currentStep > 2 }"
      @click="currentStep > 2 ? editStep(2) : null"
    >
      <p ref="text2Ref"></p>
      <span ref="wrap2Ref" class="chips-wrap">
        <button
          v-for="s in serviceOptions"
          :key="s"
          type="button"
          class="chip"
          :class="{ 'chip--active': form.services.includes(s) }"
          @click.stop="toggleService(s)"
        >
          {{ s }}
        </button>
        <button
          v-if="form.services.length > 0 && currentStep === 2"
          type="button"
          class="enter-cue"
          @click.stop="validateStep(2)"
        >
          ↵
        </button>
      </span>
    </div>

    <!-- ── Step 3: Timeline (free text) ─────────────────────────────────── -->
    <div
      ref="row3Ref"
      class="row row--3 t1-h4"
      :class="{ 'row--completed': currentStep > 3 }"
      @click="currentStep > 3 ? editStep(3) : null"
    >
      <p ref="text3Ref"></p>
      <span ref="wrap3Ref" class="input-wrap">
        <input
          ref="input3Ref"
          class="text-input text-input--italic"
          type="text"
          v-model="form.timeline"
          maxlength="20"
          autocomplete="off"
          @keydown.enter.prevent="validateStep(3)"
        />
        <span v-if="!form.timeline" class="input-hint" aria-hidden="true"
          >3 months.</span
        >
        <span v-if="form.name && currentStep !== 3">.</span>
        <span
          ref="measure3Ref"
          class="measure-span text-input text-input--italic"
          aria-hidden="true"
        ></span>
        <button
          v-if="form.timeline && currentStep === 3"
          type="button"
          class="enter-cue"
          @click.stop="validateStep(3)"
        >
          ↵
        </button>
      </span>
    </div>

    <!-- ── Step 4: Budget (single-select chips, auto-advance) ────────────── -->
    <div
      ref="row4Ref"
      class="row row--4 t1-h4"
      :class="{ 'row--completed': currentStep > 4 }"
      @click="currentStep > 4 ? editStep(4) : null"
    >
      <p ref="text4Ref"></p>
      <span ref="wrap4Ref" class="chips-wrap">
        <button
          v-for="b in budgetOptions"
          :key="b"
          type="button"
          class="chip"
          :class="{ 'chip--active': form.budget === b }"
          @click.stop="selectBudget(b)"
        >
          {{ b }}
        </button>
      </span>
    </div>

    <!-- ── Step 5: Email ─────────────────────────────────────────────────── -->
    <div
      ref="row5Ref"
      class="row row--5 t1-h4"
      :class="{ 'row--completed': currentStep > 5 }"
      @click="currentStep > 5 ? editStep(5) : null"
    >
      <p ref="text5Ref"></p>
      <span ref="wrap5Ref" class="input-wrap">
        <input
          ref="input5Ref"
          class="text-input text-input--italic"
          type="email"
          v-model="form.email"
          autocomplete="off"
          @keydown.enter.prevent="validateStep(5)"
        />
        <span v-if="!form.email" class="input-hint" aria-hidden="true"
          >your@email.com</span
        >
        <span
          ref="measure5Ref"
          class="measure-span text-input text-input--italic"
          aria-hidden="true"
        ></span>
        <button
          v-if="form.email && currentStep === 5"
          type="button"
          class="enter-cue"
          @click.stop="validateStep(5)"
        >
          ↵
        </button>
      </span>
    </div>

    <!-- ── Step hint ─────────────────────────────────────────────────────── -->
    <div
      class="step-hint"
      v-if="currentStep > 0 && currentStep <= 5"
      v-html="stepHintsHTML[currentStep - 1]"
    ></div>
  </form>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";

// ── Composables ───────────────────────────────────────────────────────────────
const { gsap, mm, BP, scheduleRefresh } = useGSAP();
const smiley = useSmiley();

// ── Template refs ─────────────────────────────────────────────────────────────
const formRef = useTemplateRef<HTMLFormElement>("formRef");

const row1Ref = useTemplateRef<HTMLElement>("row1Ref");
const row2Ref = useTemplateRef<HTMLElement>("row2Ref");
const row3Ref = useTemplateRef<HTMLElement>("row3Ref");
const row4Ref = useTemplateRef<HTMLElement>("row4Ref");
const row5Ref = useTemplateRef<HTMLElement>("row5Ref");

const text1Ref = useTemplateRef<HTMLElement>("text1Ref");
const text2Ref = useTemplateRef<HTMLElement>("text2Ref");
const text3Ref = useTemplateRef<HTMLElement>("text3Ref");
const text4Ref = useTemplateRef<HTMLElement>("text4Ref");
const text5Ref = useTemplateRef<HTMLElement>("text5Ref");

const wrap1Ref = useTemplateRef<HTMLElement>("wrap1Ref");
const wrap2Ref = useTemplateRef<HTMLElement>("wrap2Ref");
const wrap3Ref = useTemplateRef<HTMLElement>("wrap3Ref");
const wrap4Ref = useTemplateRef<HTMLElement>("wrap4Ref");
const wrap5Ref = useTemplateRef<HTMLElement>("wrap5Ref");

const input1Ref = useTemplateRef<HTMLInputElement>("input1Ref");
const input3Ref = useTemplateRef<HTMLInputElement>("input3Ref");
const input5Ref = useTemplateRef<HTMLInputElement>("input5Ref");

const measure1Ref = useTemplateRef<HTMLElement>("measure1Ref");
const measure3Ref = useTemplateRef<HTMLElement>("measure3Ref");
const measure5Ref = useTemplateRef<HTMLElement>("measure5Ref");

// ── Static texts typed by TextPlugin (one per step) ─────────────────────────
// STEP_TEXTS: plain text used during the animation (no HTML tags)
// STEP_TEXTS_HTML: final HTML with <span class="text-dim"> for de-emphasised
//   words — applied instantly in onComplete so the swap is imperceptible.
//   Set to null to keep plain text for that step.
const STEP_TEXTS = [
  "Hi JoyeStudio! My name is",
  "I would like to know more about",
  "My timeline for this project is",
  "I'm hoping to stay around of",
  "You can contact me via",
] as const;

// ── Form state ────────────────────────────────────────────────────────────────
const currentStep = ref(0); // 0 = not yet started
const isAnimating = ref(false);
const animatedSteps = new Set<number>(); // steps whose typewriter already ran

const serviceOptions = ["Web & Mobile", "Brand strategy", "Strategy & Content"];
const budgetOptions = [
  "$5.000-15.000",
  "$15.000-30.000",
  "$30.000-50.000",
  "$50.000 +",
];

const form = ref({
  name: "",
  services: [] as string[],
  timeline: "",
  budget: "",
  email: "",
});

const stepHintsHTML = [
  '1/ <span class="text-dim">TYPE IN</span> YOUR NAME AND PRESS ENTER',
  '2/ <span class="text-dim">SELECT</span> YOUR SERVICES AND PRESS ENTER',
  '3/ <span class="text-dim">TYPE</span> YOUR TIMELINE AND PRESS ENTER',
  '4/ <span class="text-dim">SELECT</span> YOUR BUDGET',
  '5/ <span class="text-dim">TYPE IN</span> YOUR E-MAIL AND PRESS ENTER',
];

// ── Handlers ──────────────────────────────────────────────────────────────────
const toggleService = (s: string) => {
  const idx = form.value.services.indexOf(s);
  if (idx === -1) {
    form.value.services.push(s);
    validateStep(2);
  } else {
    form.value.services.splice(idx, 1);
  }
};

const selectBudget = (b: string) => {
  form.value.budget = b;
  // Brief delay so user sees the chip selection before advancing
  setTimeout(() => validateStep(4), 220);
};

const send = () => {
  console.log("send", form.value);
};

// ── typeIn: TextPlugin typewriter, CSS ::after handles the blinking cursor ────
const typeIn = (
  textEl: HTMLElement,
  text: string,
  htmlFinal: string | null,
  onComplete?: () => void,
) => {
  const duration = text.length * 0.045; // ~22 chars/sec
  textEl.classList.add("is-typing");
  gsap.to(textEl, {
    duration,
    text: { value: text },
    ease: "none",
    onComplete: () => {
      // Swap plain text → styled HTML instantly (same visible content, no flash)
      if (htmlFinal) textEl.innerHTML = htmlFinal;
      textEl.classList.remove("is-typing");
      onComplete?.();
    },
  });
};

// ── revealWrap: fade in wrap, focus input ─────────────────────────────────────
const revealWrap = (
  wrapEl: HTMLElement | null,
  inputEl?: HTMLInputElement | null,
) => {
  if (!wrapEl) return;
  gsap.to(wrapEl, {
    opacity: 1,
    y: 0,
    duration: 0.25,
    ease: "power2.out",
    onComplete: () => {
      nextTick(() => inputEl?.focus());
    },
  });
};

// ── Helpers to resolve elements by step number (1-indexed) ───────────────────
const getRowEl = (n: number) =>
  [null, row1Ref, row2Ref, row3Ref, row4Ref, row5Ref][n]?.value ?? null;
const getTextEl = (n: number) =>
  [null, text1Ref, text2Ref, text3Ref, text4Ref, text5Ref][n]?.value ?? null;
const getWrapEl = (n: number) =>
  [null, wrap1Ref, wrap2Ref, wrap3Ref, wrap4Ref, wrap5Ref][n]?.value ?? null;
const getInputEl = (n: number): HTMLInputElement | null =>
  (
    ({ 1: input1Ref.value, 3: input3Ref.value, 5: input5Ref.value }) as Record<
      number,
      HTMLInputElement | null
    >
  )[n] ?? null;

// ── blurAll: remove caret from every input so only the active step shows one ──
const blurAll = () => {
  [input1Ref.value, input3Ref.value, input5Ref.value].forEach((el) =>
    el?.blur(),
  );
};

// ── syncWidth: mirror span technique — cross-browser auto-sizing ─────────────
// A hidden <span> with identical CSS classes measures the rendered text width.
// The +6px slack accounts for italic glyph overhang on the right edge.
const syncWidth = (
  inputEl: HTMLInputElement | null,
  measureEl: HTMLElement | null,
  value: string,
  placeholder = "",
) => {
  if (!inputEl || !measureEl) return;
  measureEl.textContent = value || placeholder || "\u00a0";
  const w = measureEl.getBoundingClientRect().width;
  inputEl.style.width = `${w + 6}px`;
};

watch(
  () => form.value.name,
  (v) => syncWidth(input1Ref.value, measure1Ref.value, v),
);
watch(
  () => form.value.timeline,
  (v) => syncWidth(input3Ref.value, measure3Ref.value, v, "3 months"),
);
watch(
  () => form.value.email,
  (v) => syncWidth(input5Ref.value, measure5Ref.value, v, "your@email.com"),
);

// Re-sync when a step becomes active (empty input needs placeholder width)
watch(currentStep, (step) => {
  nextTick(() => {
    if (step === 1)
      syncWidth(input1Ref.value, measure1Ref.value, form.value.name);
    if (step === 3)
      syncWidth(
        input3Ref.value,
        measure3Ref.value,
        form.value.timeline,
        "3 months",
      );
    if (step === 5)
      syncWidth(
        input5Ref.value,
        measure5Ref.value,
        form.value.email,
        "your@email.com",
      );
  });
});

// ── activateStep ──────────────────────────────────────────────────────────────
/**
 * Make a step visible and play its typewriter entrance.
 * If the step was already animated before (re-visit via editStep), skip the
 * typewriter and just reveal the wrap / focus the input directly.
 */
const activateStep = (step: number) => {
  if (step < 1 || step > 5) return;

  const rowEl = getRowEl(step);
  const textEl = getTextEl(step);
  const wrapEl = getWrapEl(step);
  const inputEl = getInputEl(step);

  if (!rowEl || !textEl) return;

  blurAll(); // remove previous caret before switching step
  gsap.set(rowEl, { visibility: "visible" });
  currentStep.value = step;

  if (animatedSteps.has(step)) {
    // Text already present — skip typewriter, just focus
    revealWrap(wrapEl, inputEl);
    return;
  }

  // First time: run typewriter
  gsap.set(textEl, { text: "" });
  isAnimating.value = true;
  animatedSteps.add(step);

  typeIn(
    textEl,
    STEP_TEXTS[step - 1] ?? "",
    STEP_TEXTS[step - 1] ?? null,
    () => {
      isAnimating.value = false;
      revealWrap(wrapEl, inputEl);
    },
  );
};

// ── validateStep ──────────────────────────────────────────────────────────────
const validateStep = (step: number) => {
  if (isAnimating.value) return;

  const valid =
    step === 1
      ? !!form.value.name.trim()
      : step === 2
        ? form.value.services.length > 0
        : step === 3
          ? !!form.value.timeline.trim()
          : step === 4
            ? !!form.value.budget
            : !!form.value.email.trim();

  if (!valid) return;
  if (step === 5) {
    send();
    return;
  }

  activateStep(step + 1);
};

// ── editStep: click a completed row to re-edit it ────────────────────────────
const editStep = (step: number) => {
  if (isAnimating.value) return;
  // activateStep handles blurAll + skip-typewriter-if-already-seen
  activateStep(step);
};

// ── onMounted ─────────────────────────────────────────────────────────────────
onMounted(() => {
  nextTick(() => {
    const allWraps = [
      wrap1Ref.value,
      wrap2Ref.value,
      wrap3Ref.value,
      wrap4Ref.value,
      wrap5Ref.value,
    ].filter(Boolean);

    const allRows = [
      row1Ref.value,
      row2Ref.value,
      row3Ref.value,
      row4Ref.value,
      row5Ref.value,
    ].filter(Boolean);

    // Initial hidden states — GSAP owns the rows from the start
    gsap.set(allWraps, { opacity: 0, y: 5 });
    gsap.set(allRows, { visibility: "hidden" });

    // Reduced motion: fill text instantly, no animation
    mm.add(BP.reducedMotion, () => {
      const textEls = [
        text1Ref.value,
        text2Ref.value,
        text3Ref.value,
        text4Ref.value,
        text5Ref.value,
      ];
      textEls.forEach((el, i) => {
        if (el) el.textContent = STEP_TEXTS[i] ?? "";
      });
      gsap.set(allWraps, { clearProps: "all" });
      gsap.set(allRows, { visibility: "visible" });
      for (let i = 1; i <= 5; i++) animatedSteps.add(i);
      currentStep.value = 1;
      return () => {};
    });

    scheduleRefresh();
  });
});

// Called by the parent page (contact.vue) from its onPageEnter callback,
// so the typewriter starts in sync with the form container fading in.
const start = () => {
  const anchor = document.querySelector(
    "[contact-smiley-anchor]",
  ) as HTMLElement | null;
  if (anchor) smiley.track(anchor);
  if (!window.matchMedia(BP.reducedMotion).matches) {
    activateStep(1);
  }
};
defineExpose({ start });

onUnmounted(() => {
  smiley.release();
});
</script>

<style lang="scss" scoped>
.interactive-form {
  position: relative;
  z-index: 1;
  padding-top: 27rem;
  color: var(--color-white);
  // No visibility: hidden here — the form container is always visible.
  // Individual rows are hidden by GSAP and revealed step-by-step.
  // (visibility: hidden here would break client-side navigation since
  //  gsap.set autoAlpha only works reliably on elements GSAP previously touched)

  // ── Rows ────────────────────────────────────────────────────────────────
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.2em;
    visibility: hidden; // revealed per-step by GSAP

    &--completed {
      cursor: pointer;
    }
  }

  // ── Inputs ──────────────────────────────────────────────────────────────
  .text-input {
    background: none;
    border: none;
    letter-spacing: -0.05em;
    font-size: 2.5rem;
    color: inherit;
    position: relative;
    min-width: 3ch;
    &:-webkit-autofill,
    &:-webkit-autofill:hover,
    &:-webkit-autofill:focus,
    &:-webkit-autofill:active {
      transition: background-color 5000s ease-in-out 0s;
    }
    -webkit-text-fill-color: var(--color-white) !important;
    // Native white caret — matches the typewriter bar visually
    caret-color: white;

    &--italic {
      font-family: var(--font-como);
      font-style: italic;
    }

    &::placeholder {
      opacity: 0.25;
    }
    &:focus {
      outline: none;
    }
  }

  // ── Wrappers ─────────────────────────────────────────────────────────────
  .input-wrap {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0; // cursor doit être flush contre l'input
  }

  // Hidden mirror span — same CSS classes as the input, measures rendered text
  // width including italic overhang. JS reads this to set input width.
  .measure-span {
    position: absolute;
    visibility: hidden;
    white-space: pre;
    pointer-events: none;
    user-select: none;
  }

  // Custom label shown when input is empty — replaces native placeholder.
  // Absolutely positioned so it overlays the input without affecting flow.
  // pointer-events: none lets clicks pass through to the input beneath.
  .input-hint {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--font-como);
    font-style: italic;
    font-size: inherit;
    letter-spacing: -0.05em;
    color: currentColor;
    opacity: 0.3;
    pointer-events: none;
    white-space: nowrap;
  }

  .chips-wrap {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  // ── Chips ────────────────────────────────────────────────────────────────
  .chip {
    display: inline-flex;
    align-items: center;
    padding: 0.4em 0.9em;
    border: 1px solid rgba(255, 255, 255, 0.45);
    border-radius: 100px;
    background: transparent;
    color: var(--color-white);
    font-size: 1.4rem;
    letter-spacing: -0.02em;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;

    &:hover {
      border-color: rgba(255, 255, 255, 0.8);
    }

    &--active {
      background: var(--color-white);
      color: var(--color-blue);
      border-color: var(--color-white);
    }
  }

  // ── Enter cue ────────────────────────────────────────────────────────────
  .enter-cue {
    position: absolute;
    right: -3rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.5);
    background: transparent;
    color: var(--color-white);
    font-size: 1.2rem;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }

  // ── Step hint ─────────────────────────────────────────────────────────────
  .step-hint {
    grid-column: 1 / -1;
    margin-left: var(--content-margin);
    font-size: 1.1rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 3rem;
  }

  // ── Typewriter cursor ──────────────────────────────────────────────────
  // Thin CSS bar that matches the native input caret (caret-color: white).
  // Only visible during TextPlugin animation — JS adds/removes .is-typing.

  // Dimmed words inside step texts — wrap any word in <span class="text-dim">
  // inside STEP_TEXTS_HTML to de-emphasise it vs the full-white key words.
  // :deep() is required because the spans are injected via innerHTML, which
  // bypasses Vue's scoped attribute injection.
  :deep(.text-dim) {
    opacity: 0.45;
  }

  p.is-typing::after {
    content: "";
    display: inline-block;
    width: 1px;
    height: 0.73em;
    background: currentColor;
    margin-left: 1px;
    vertical-align: baseline;
    animation: cursor-blink 0.65s step-start infinite;
  }

  @keyframes cursor-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
}

// ── Desktop ──────────────────────────────────────────────────────────────────
@include respond-to("desktop") {
  .interactive-form {
    padding-top: 8rem;

    .row {
      &--1 {
        grid-column: 3 / -1;
        padding-right: var(--content-margin);
      }

      &--2,
      &--3,
      &--4,
      &--5 {
        grid-column: 1 / 11;
        margin-left: var(--content-margin);
      }
    }

    .text-input {
      font-size: 5.5rem;
    }

    .chip {
      font-size: 1.6rem;
    }

    .step-hint {
      grid-column: 3 / 7;
      margin-left: 0;
      margin-top: 4rem;
      font-size: 2rem;
    }
  }
}
</style>
