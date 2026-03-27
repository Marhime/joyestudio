<template>
  <div ref="pageRef" class="contact-page">
    <div class="grid">
      <div ref="headingRef" class="contact-page__heading">
        <h1 class="title">
          Let's m<span class="title-char font-como font-italic">a</span
          >ke&nbsp;it tog<span class="title-char font-como font-italic">e</span
          >ther!
        </h1>
      </div>
      <div contact-smiley-anchor class="contact-smiley-anchor"></div>
    </div>
    <div ref="formRef">
      <InteractiveForm ref="interactiveFormRef" />
    </div>
    <LayoutLines color="white" />
  </div>
</template>

<script setup lang="ts">
import InteractiveForm from "~/components/contact/InteractiveForm.vue";
import type { PageEnterHook } from "~/composables/usePageTransition";
import { useGSAP } from "~/composables/useGSAP";

// ── Refs ───────────────────────────────────────────────────────────────────────
const pageRef = useTemplateRef<HTMLElement>("pageRef");
const headingRef = useTemplateRef<HTMLElement>("headingRef");
const formRef = useTemplateRef<HTMLElement>("formRef");
const interactiveFormRef = useTemplateRef<{ start: () => void }>(
  "interactiveFormRef",
);

// ── GSAP ───────────────────────────────────────────────────────────────────────
const { gsap, mm, BP, scheduleRefresh } = useGSAP();

// ── Page enter hook (provided by app.vue via usePageTransition) ────────────────
const onPageEnter = inject<PageEnterHook>("onPageEnter")!;

onMounted(() => {
  nextTick(() => {
    // ① Initial hidden states — set while grid covers the screen.
    //    Must be inside mm.add so they're breakpoint-aware and auto-reverted.
    mm.add(BP.desktop, () => {
      gsap.set(headingRef.value, { autoAlpha: 0, yPercent: 6 });
      gsap.set(formRef.value, { autoAlpha: 0, yPercent: 4 });
      return () => {};
    });

    mm.add(BP.mobile, () => {
      gsap.set(formRef.value, { autoAlpha: 0, yPercent: 4 });
      return () => {};
    });

    mm.add(BP.reducedMotion, () => {
      gsap.set([headingRef.value, formRef.value], { clearProps: "all" });
      return () => {};
    });

    scheduleRefresh();

    // ② Entrance timeline — fires after dissolve + ST.refresh.
    //    On first load (no active transition) fires on next animation frame.
    onPageEnter(() => {
      mm.add(BP.desktop, () => {
        gsap
          .timeline()
          .to(headingRef.value, {
            autoAlpha: 1,
            yPercent: 0,
            duration: 1,
            ease: "power3.out",
          })
          .to(
            formRef.value,
            {
              autoAlpha: 1,
              yPercent: 0,
              duration: 0.9,
              ease: "power3.out",
              onStart: () => interactiveFormRef.value?.start(),
            },
            "-=0.6",
          );
        return () => {};
      });

      mm.add(BP.mobile, () => {
        gsap.to(formRef.value, {
          autoAlpha: 1,
          yPercent: 0,
          duration: 0.9,
          ease: "power3.out",
          onStart: () => interactiveFormRef.value?.start(),
        });
        return () => {};
      });
    });
  });
});

definePageMeta({
  pageColor: "var(--color-blue)",
});
</script>

<style lang="scss" scoped>
.contact-page {
  position: relative;
  z-index: 1;
  padding-top: 27rem;
  background-color: var(--color-blue);
  min-height: 100svh;

  &__heading {
    display: none;
  }
}

.contact-smiley-anchor {
  display: none;
}

@include respond-to("desktop") {
  .contact-page {
    padding-top: 15.6rem;

    &__heading {
      display: block;
      grid-column: 1 / 6;
      margin-left: var(--content-margin);
      color: var(--color-white);

      .title {
        font-size: 9.2rem;
        line-height: 0.65;
        letter-spacing: -0.075em;
      }
      .title-char {
        font-size: 12.4rem;
        line-height: 0.65;
      }
    }

    .contact-smiley-anchor {
      display: block;
      grid-column: 9 / 13;
      align-self: start;
      height: 10rem;
    }
  }
}
</style>
