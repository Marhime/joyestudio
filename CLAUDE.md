# CLAUDE.md — Joyestudio

Nuxt 3 + Vue 3.5 + GSAP 3.13 + Three.js 0.182 + Lenis 1.3.16 + Pinia 3.
Creative studio website targeting Awwwards-level animation quality.

---

## Animation Architecture (3 layers)

### Layer 1 — `useGSAP()` (low-level, for complex animations)

```ts
const { gsap, ScrollTrigger, Flip, SplitText, mm, BP, scheduleRefresh } =
  useGSAP();
```

- Returns one `mm` (matchMedia) per component — auto-reverts on unmount
- **Never use `useNuxtApp().$gsap` in components** — only in singletons (`usePixelGrid`, `usePageTransition`)

### Layer 2 — `useSectionReveal()` (mid-level, for scroll sections)

```ts
useSectionReveal(sectionRef, {
  name: "about",
  desktop: (ctx) => fadeUp(ctx, { children: ".card", stagger: 0.08 }),
  mobile: (ctx) => fadeUp(ctx, { stagger: 0.05 }),
});
```

- Handles `onMounted` + `nextTick` + `mm.add` + `scheduleRefresh` + reduced motion automatically
- `name` auto-emits `section:<name>:enter` / `section:<name>:leave` on the animation bus

### Layer 3 — `animations/presets.ts` (high-level, composable presets)

| Preset                     | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `fadeUp(ctx, opts)`        | Slide up + fade in on scroll                        |
| `splitReveal(ctx, opts)`   | SplitText word/char/line reveal with mask           |
| `parallax(ctx, opts)`      | Scroll-speed parallax offset                        |
| `scrubTimeline(ctx, opts)` | Returns a scroll-scrubbed timeline to add tweens to |

### Cross-cutting — `useAnimationBus()`

Event bus for cross-component orchestration. Listeners auto-removed on unmount.

```ts
const { on, emit } = useAnimationBus();
on("section:hero:leave", () => {
  /* show header logo */
});
```

---

## Mandatory Rules (every animation)

1. **`useGSAP()`** — never `useNuxtApp().$gsap` in components
2. **`BP.desktop` / `BP.mobile`** — never raw media query strings
3. **DOM selection inside `mm.add` callbacks** — never outside (positions differ per breakpoint)
4. **`gsap.set()` before timeline** — prevent flash of unstyled content
5. **`invalidateOnRefresh: true`** — on every ScrollTrigger config
6. **`scheduleRefresh()`** after all setup — never `ScrollTrigger.refresh()` directly
7. **`mm.add(BP.reducedMotion)`** — always handle reduced motion
8. **Return `() => {}`** from every `mm.add` callback (non-GSAP cleanup slot)
9. **`useTemplateRef<T>('refName')`** for DOM refs — not `ref<T | null>(null)`

---

## Breakpoints (`BP` constants mirror `_mixins.scss`)

| Key                | Value                                 |
| ------------------ | ------------------------------------- |
| `BP.mobile`        | `(max-width: 900px)`                  |
| `BP.desktop`       | `(min-width: 901px)`                  |
| `BP.reducedMotion` | `(prefers-reduced-motion: reduce)`    |
| `BP.touch`         | `(hover: none) and (pointer: coarse)` |

---

## Page Transition Pattern

Pages use `usePageTransition()` (app.vue) with pixel grid fill/dissolve.

```ts
import type { PageEnterHook } from "~/composables/usePageTransition";
const onPageEnter = inject<PageEnterHook>("onPageEnter")!;
const { gsap, mm, BP, scheduleRefresh } = useGSAP();

onMounted(() => {
  nextTick(() => {
    // ① Set hidden states while grid covers screen
    mm.add(BP.desktop, () => {
      gsap.set(headingRef.value, { autoAlpha: 0, yPercent: 8 });
      return () => {};
    });
    scheduleRefresh();

    // ② Entrance timeline — fires after dissolve + ST.refresh
    onPageEnter(() => {
      mm.add(BP.desktop, () => {
        gsap
          .timeline()
          .to(headingRef.value, {
            autoAlpha: 1,
            yPercent: 0,
            duration: 1,
            ease: "power3.out",
          });
        return () => {};
      });
    });
  });
});

definePageMeta({ pageColor: "var(--color-blue)" });
```

---

## Section Scroll Animation Pattern (full example)

```vue
<template>
  <section ref="section" class="our-work">
    <h2 class="our-work__title">Our Work</h2>
    <div class="our-work__card" v-for="p in projects" :key="p.id">...</div>
  </section>
</template>

<script setup lang="ts">
import { fadeUp, splitReveal } from "~/animations/presets";

const section = useTemplateRef<HTMLElement>("section");

useSectionReveal(section, {
  name: "our-work",
  desktop: (ctx) => {
    splitReveal(ctx, { targets: ".our-work__title", type: "words" });
    fadeUp(ctx, {
      children: ".our-work__card",
      stagger: 0.12,
      start: "top 70%",
    });
  },
  mobile: (ctx) => {
    fadeUp(ctx, {
      children: ".our-work__title, .our-work__card",
      stagger: 0.08,
    });
  },
  // reducedMotion omitted → defaults to clearProps:'all' (everything visible, no motion)
});
</script>
```

---

## useGSAP() Direct Pattern (for complex/custom animations)

```ts
const { gsap, SplitText, mm, BP, scheduleRefresh } = useGSAP();

onMounted(() => {
  nextTick(() => {
    mm.add(BP.desktop, () => {
      gsap.set(titleRef.value, { autoAlpha: 0, yPercent: 20 });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: sectionRef.value,
            start: "top 70%",
            invalidateOnRefresh: true,
          },
        })
        .to(titleRef.value, {
          autoAlpha: 1,
          yPercent: 0,
          duration: 0.8,
          ease: "power3.out",
        });

      return () => {};
    });

    mm.add(BP.mobile, () => {
      gsap.set(titleRef.value, { autoAlpha: 0, yPercent: 10 });
      gsap.to(titleRef.value, {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top 80%",
          invalidateOnRefresh: true,
        },
      });
      return () => {};
    });

    mm.add(BP.reducedMotion, () => {
      gsap.set(titleRef.value, { clearProps: "all" });
      return () => {};
    });

    scheduleRefresh();
  });
});
```

---

## Key Files

| File                               | Role                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `composables/useGSAP.ts`           | GSAP bridge: `mm`, `BP`, `scheduleRefresh`                             |
| `composables/useSectionReveal.ts`  | Section animation composable (wraps mm.add boilerplate)                |
| `animations/presets.ts`            | `fadeUp`, `splitReveal`, `parallax`, `scrubTimeline`                   |
| `composables/useAnimationBus.ts`   | Typed event bus for cross-component orchestration                      |
| `composables/usePageTransition.ts` | GSAP pixel-grid page transition hooks                                  |
| `composables/usePixelGrid.ts`      | Singleton grid API: fill, dissolve, getRows                            |
| `composables/useLogoFlip.ts`       | Logo Flip animation — `useLogoFlip(gsap, Flip)` (dependency injection) |
| `composables/useRAFManager.ts`     | Singleton RAF loop — auto-pauses on `document.hidden`                  |
| `composables/useSmiley.ts`         | Three.js smiley sphere API (moveTo, track, release)                    |
| `composables/useScrollManager.ts`  | Debounced `ScrollTrigger.refresh()` singleton                          |
| `plugins/gsap.ts`                  | Register GSAP plugins once (ScrollTrigger, Flip, SplitText, etc.)      |
| `plugins/lenis.ts`                 | Lenis smooth scroll + ScrollTrigger proxy (uses RAFManager)            |
| `animations/heroGridDissolve.ts`   | Hero scroll-scrubbed pixel dissolve + logo Flip                        |
| `animations/presets.ts`            | Ready-to-use animation presets for useSectionReveal                    |
| `stores/theme.ts`                  | Pinia store for theme CSS vars                                         |
| `utils/debounce.ts`                | Shared debounce utility                                                |
| `utils/domToWorld.ts`              | DOM rect → Three.js world coords                                       |

---

## Three.js Rules

- Single scene: `PixelBlob3.vue` (smiley sphere with custom pixel shader)
- Uses `useRAFManager().register('three', animate)` — no independent `requestAnimationFrame`
- DPR capped: `Math.min(window.devicePixelRatio, 2)`
- Skips entire init if `prefers-reduced-motion` is enabled
- Direct `import { gsap } from 'gsap'` for ticker API (not useNuxtApp)
- Dispose geometry, material, renderer in `onBeforeUnmount`
- Pause/resume handled globally by RAFManager via `visibilitychange`

---

## Singleton Exception Pattern

`usePixelGrid` and `usePageTransition` use `useNuxtApp().$gsap` directly because they are
singleton composables called from non-component contexts (page transitions). This is intentional —
they only fire one-shot tweens, no MatchMedia/ScrollTrigger cleanup needed. All other files must
use `useGSAP()`.

---

## SCSS Grid

- Desktop: 11 cols, `0px` gap, `--content-margin: 2.667vw`
- Mobile: 12 cols
- Breakpoint: `901px` (matches `BP.desktop`)
- Mixins: `assets/scss/utilities/_mixins.scss`
