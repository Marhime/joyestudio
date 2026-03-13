<template>
  <form ref="formRef" class="interactive-form grid">
    <div ref="step1" class="row row--1 t1-h4">
      <p char>Hi JoyeStudio! My name is</p>
      <input
        ref="nameInputRef"
        class="text-input"
        type="text"
        v-model="form.name"
      />
      <span ref="step1Coma" class="char">,</span>
    </div>
    <div ref="step2" class="row row--2 t1-h4">
      <p char>I would like to know more about</p>
    </div>
    <div ref="step3" class="row row--2 t1-h4">
      <p char>My timeline for this project is 3 months.</p>
    </div>
    <div ref="step4" class="row row--2 t1-h4">
      <p char>I'm hoping to stay around of</p>
    </div>
    <div ref="step5" class="row row--2 t1-h4">
      <p char>You can contact me via oleksandrakorneichuk@outlook.com</p>
    </div>
  </form>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";

const smileyCueRef = useTemplateRef<HTMLElement>("smileyCueRef");
const smiley = useSmiley();

const formRef = ref<HTMLFormElement | null>(null);
const nameInputRef = ref<HTMLInputElement | null>(null);
const step1 = ref<HTMLElement | null>(null);
const step2 = ref<HTMLElement | null>(null);
const step3 = ref<HTMLElement | null>(null);
const step4 = ref<HTMLElement | null>(null);
const step5 = ref<HTMLElement | null>(null);
const step1Coma = ref<HTMLElement | null>(null);

// ── Form state ────────────────────────────────────────────────────────────
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

const toggleService = (s: string) => {
  const idx = form.value.services.indexOf(s);
  if (idx === -1) form.value.services.push(s);
  else form.value.services.splice(idx, 1);
};

const send = () => {
  // TODO: connect to submission handler
  console.log("send", form.value);
};

// ── Smiley carry-over from previous context ────────────────────────────────
// moveTo reads the current position of the smiley (wherever it is) and tweens
// it to the placeholder — no reset, seamless transition from prefooter or mouse-follow.
onMounted(() => {
  nameInputRef.value?.focus();
  const { gsap, SplitText, mm, BP, scheduleRefresh } = useGSAP();
  const step1Split = new SplitText(step1.value, { type: "chars" });
  const step2Split = new SplitText(step2.value, { type: "chars" });
  const step3Split = new SplitText(step3.value, { type: "chars" });
  const step4Split = new SplitText(step4.value, { type: "chars" });
  const step5Split = new SplitText(step5.value, { type: "chars" });

  nextTick(() => {
    // Split the text into chars
    // ── Desktop ─────────────────────────────────────────────────────────────
    // mm.add auto-reverts everything inside when leaving the breakpoint.
    gsap.set(
      [
        ...step1Split.chars,
        ...step2Split.chars,
        ...step3Split.chars,
        ...step4Split.chars,
        ...step5Split.chars,
        step1Coma.value,
      ],
      {
        opacity: 0,
        y: 5,
        x: -5,
      },
    );
    gsap.set(formRef.value, { autoAlpha: 1 }); // prevent FOUC before GSAP can set initial states
    mm.add(BP.desktop, () => {
      // Set initial states before the page paints

      // Entrance sequence
      const tl = gsap.timeline({ delay: 0.1 });

      tl
        // Logos slide in from their respective sides simultaneously
        .to(step1Split.chars, {
          opacity: 1,
          y: 0,
          x: 0,
          stagger: 0.05,
          ease: "power2.out",
        });

      // Returned function runs when leaving BP.desktop (resize / unmount)
      // GSAP reverts the tween states automatically; add non-GSAP cleanup here.
      return () => {};
    });

    // ── Mobile ───────────────────────────────────────────────────────────────
    mm.add(BP.mobile, () => {
      // Simpler: just fade up — no horizontal slide on small screens

      const tl = gsap.timeline({ delay: 0.1 });
      tl.to({}, {});

      return () => {};
    });

    // ── Reduced motion: show everything immediately ───────────────────────
    mm.add(BP.reducedMotion, () => {
      gsap.set([], { clearProps: "all" });

      return () => {};
    });

    // One shared debounced refresh — collapses with calls from other components
    scheduleRefresh();
  });
});

onUnmounted(() => {
  // Return smiley to free mouse-follow when leaving the page
  smiley.release();
});
</script>

<style lang="scss" scoped>
.interactive-form {
  position: relative;
  z-index: 1;
  padding-top: 27rem;
  color: var(--color-white);
  visibility: hidden;

  &__heading {
    display: none;
  }

  .text-input {
    background: none;
    border: none;
    letter-spacing: -0.05em;
    margin-left: 1rem;
    // flex: 1;
    // max-width: 100%;
    field-sizing: content;

    font-size: 2.5rem;
    color: inherit;
  }
}

@include respond-to("desktop") {
  .interactive-form {
    padding-top: 12rem;

    &__heading {
      display: block;
      grid-column: 2 / 4;
      margin-bottom: 4rem;
    }

    .row {
      display: flex;
      align-items: center;

      p {
        flex-shrink: 0;
      }

      &--1 {
        grid-column: 3 / -1;
        padding-right: var(--content-margin);
      }
      &--2 {
        grid-column: 1 / 11;
        margin-left: var(--content-margin);
        visibility: hidden;
      }
    }

    .text-input {
      font-size: 6.6rem;
      outline: none;
    }
  }
}
</style>
