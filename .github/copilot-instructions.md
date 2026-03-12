# Copilot Instructions — Joyestudio

Nuxt 3 application with GSAP animations, Three.js, and full responsive support.
These rules apply to every file in this repo.

---

## Stack

- **Nuxt 3** + Vue 3 Composition API (`<script setup lang="ts">`)
- **GSAP** (ScrollTrigger, Flip, SplitText, MatchMedia) via `~/plugins/gsap.ts`
- **Lenis** smooth scroll integrated with ScrollTrigger via `~/plugins/lenis.ts`
- **Three.js** for 3D scenes (to be added in `~/composables/useThree.ts`)
- **SCSS** with breakpoints defined in `~/assets/scss/utilities/_mixins.scss`

---

## Animation Architecture Rules

### 1. Always use `useGSAP()` — never `useNuxtApp().$gsap` directly in components

```ts
const { gsap, ScrollTrigger, mm, BP, scheduleRefresh } = useGSAP();
```

### 2. Breakpoints — use `BP` constants from `useGSAP`, never raw strings

```ts
// ✅
mm.add(BP.desktop, () => { ... })
mm.add(BP.mobile,  () => { ... })

// ❌
mm.add('(min-width: 901px)', () => { ... })
```

`BP` mirrors `_mixins.scss`:

- `BP.mobile` → `(max-width: 900px)`
- `BP.desktop` → `(min-width: 901px)`
- `BP.reducedMotion` → `(prefers-reduced-motion: reduce)`
- `BP.touch` → `(hover: none) and (pointer: coarse)`

### 3. One `mm` per component, `mm.revert()` before re-registering

When animations must be rebuilt (e.g. after a DOM recalculation like a grid resize),
always call `mm.revert()` at the top of the setup function before new `mm.add()` calls.
`useGSAP`'s `onUnmounted` handles the final cleanup automatically.

```ts
const setupAnimations = () => {
  mm.revert(); // kills previous ScrollTriggers + tweens from this component

  mm.add(BP.desktop, () => {
    // ...
    return () => {}; // return fn = non-GSAP cleanup (event listeners, etc.)
  });

  mm.add(BP.mobile, () => {
    // ...
    return () => {};
  });

  scheduleRefresh(); // always last
};
```

### 4. ScrollTrigger.refresh() — always via `scheduleRefresh()`, never directly

Multiple components mounting simultaneously → `scheduleRefresh()` collapses all calls
into one debounced refresh (80 ms). Never call `ScrollTrigger.refresh()` in a component.

### 5. Always add `invalidateOnRefresh: true` to ScrollTrigger configs

```ts
const stConfig = {
  trigger: el,
  start: "top top",
  end: "50% top",
  scrub: 1,
  invalidateOnRefresh: true, // ← required
};
```

### 6. Element selection inside `mm.add` callbacks — not outside

DOM positions and grid indices differ per breakpoint. Always select and capture
elements inside each `mm.add` callback so positions are computed for the matching viewport.

```ts
// ✅
mm.add(BP.desktop, () => {
  const el = document.querySelector("[hero-logo-left]");
  // ...
});

// ❌ — captured once at setup time, wrong after resize
const el = document.querySelector("[hero-logo-left]");
mm.add(BP.desktop, () => {
  /* uses stale el */
});
```

### 7. Desktop and mobile animations are independent blocks — no shared helpers for layout-specific tweens

Shared helpers are fine for truly identical tweens. If the target elements, selectors,
or behaviour differ per breakpoint even slightly, write separate inline tweens.
This keeps each `mm.add` block self-documenting and safe to modify independently.

### 8. `gsap.set()` initial states before `gsap.timeline()`, inside `mm.add`

Set invisible/offset states before building the timeline so there is no flash on load.

### 9. Reduced motion — always handle

```ts
mm.add(BP.reducedMotion, () => {
  gsap.set([el1, el2, ...], { clearProps: 'all' })
  return () => {}
})
```

### 10. Resize — debounce before recalculating, `resetFlip()` before `initFlip()`

```ts
const handleResize = debounce(() => {
  resetFlip();
  calculateGridSize(); // triggers watch → setupAnimations()
}, 150);
```

---

## Component Template Rules

- Use `useTemplateRef<T>('refName')` (Vue 3.5+), not `ref<T | null>(null)` for DOM refs
- `data-*` attributes for ScrollTrigger triggers when scoped refs aren't available
- Attribute selectors `[hero-logo-left]` for cross-component GSAP targets (layout + hero share logos)

---

## Three.js Rules (upcoming)

- Encapsulate in `~/composables/useThree.ts` — one instance per scene
- Dispose geometry, material, renderer in `onUnmounted`
- Pause/resume RAF on `visibilitychange` to save battery
- Skip Three.js init on `BP.reducedMotion` or `BP.mobile` when perf is a concern

---

## File Conventions

| File                              | Responsibility                                |
| --------------------------------- | --------------------------------------------- |
| `composables/useGSAP.ts`          | GSAP instance, `mm`, `BP`, `scheduleRefresh`  |
| `composables/useScrollManager.ts` | Debounced `ScrollTrigger.refresh()` singleton |
| `composables/useLogoFlip.ts`      | Flip animation state for hero → header logo   |
| `plugins/gsap.ts`                 | Register all GSAP plugins once                |
| `plugins/lenis.ts`                | Smooth scroll + ScrollTrigger proxy           |
| `utils/debounce.ts`               | Shared debounce utility                       |
