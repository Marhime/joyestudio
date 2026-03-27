import { scheduleRefresh } from "~/composables/useScrollManager";
import { BP } from "~/composables/useGSAP";

interface GridData {
  squares: Element[];
  cols: number;
  container: HTMLElement | null;
}

/**
 * Hero background grid dissolve — scroll-scrubbed animation for the homepage.
 *
 * Uses the HomeBgGrid component's squares — NOT the usePixelGrid() singleton.
 * The caller's `mm` instance is passed in so cleanup is tied to Hero.vue's
 * component lifecycle (mm.revert on unmount).
 *
 * @param context     { gsap, mm } taken from Hero.vue's useGSAP() call
 * @param getGridData Getter returning live squares/cols from HomeBgGrid.getGridData()
 * @param heroSection The hero <section> element — used as ScrollTrigger trigger
 *
 * Usage in Hero.vue (inside onMounted → nextTick):
 *   setupHeroGridDissolve({ gsap, mm }, () => homeBgGridRef.value?.getGridData() ?? null, sectionRef.value!)
 */
export function setupHeroGridDissolve(
  context: { gsap: any; mm: any; Flip: any },
  getGridData: () => GridData | null,
  heroSection: HTMLElement,
) {
  const { gsap, mm, Flip } = context;
  const { emit } = useAnimationBus();

  const {
    init: initFlip,
    setInitialPositions,
    addToTimeline: addFlipToTimeline,
    reset: resetFlip,
  } = useLogoFlip(gsap, Flip);

  // ScrollTrigger scrubs from hero top reaching viewport top → hero 50% reaching top
  const stConfig = {
    trigger: heroSection,
    start: "top top",
    end: "50% top",
    scrub: 1,
    invalidateOnRefresh: true,
  };

  initFlip();

  // ── Desktop ─────────────────────────────────────────────────────────────────
  mm.add(BP.desktop, () => {
    // Select elements inside the callback — positions are breakpoint-specific
    const data = getGridData();
    if (!data || !data.squares.length) return () => {};

    const { squares, cols } = data;

    // First row of the grid (cols squares)
    const row = squares.slice(0, cols);
    if (!row.length) return () => {};

    // Desktop grid layout (11 cols):
    //   col 0         → menu / nav area square
    //   col 5         → square behind the hero logo
    //   cols 8, 9, 10 → squares behind the header CTA button
    const menuSquare = row[0]!;
    const logoSquares = [row[5]!];
    const buttonSquares = [
      row[row.length - 1]!,
      row[row.length - 2]!,
      row[row.length - 3]!,
    ];
    const specialIndices = [...logoSquares, ...buttonSquares].map((sq) =>
      squares.indexOf(sq),
    );
    const allExceptSpecial = squares.filter(
      (_, i) => !specialIndices.includes(i),
    );

    // Capture Flip positions inside the breakpoint callback
    setInitialPositions();

    const tl = gsap.timeline({
      scrollTrigger: stConfig,
      defaults: { ease: "power1.inOut" },
      onComplete: () => emit("hero:gridDissolved"),
    });

    // Logo Flip at t=0
    addFlipToTimeline(tl, 0);

    tl
      // 1. All non-special squares dissolve with random stagger
      .to(allExceptSpecial, {
        autoAlpha: 0,
        duration: 0.5,
        stagger: { from: "random", amount: 1.5 },
      })
      // 2. Menu square fades last
      .to(menuSquare, { autoAlpha: 0, duration: 0.5 }, 2)
      // 3. Hero CTA button wrapper fades with menu
      .to(".button-wrapper", { autoAlpha: 0, duration: 0.5 }, "<")
      // 4. Logo squares fade
      .to(
        logoSquares,
        {
          autoAlpha: 0,
          duration: 0.5,
          stagger: { from: "center", amount: 1.5 },
        },
        "<",
      )
      // 5. Hero logo SVGs → black
      .to(
        ["[hero-logo-left]", "[hero-logo-right]"],
        { color: "var(--color-black)", duration: 0.5 },
        "<",
      )
      // 6. Button area squares dissolve
      .to(buttonSquares, { autoAlpha: 0, duration: 0.5 }, "<")
      // 7. Header button styles transition
      .to(".header .button__bg", { backgroundColor: "var(--color-blue)" }, "<")
      .to(".header .button__label", { color: "var(--color-blue)" }, "<")
      .to(
        [".header .button__icon", ".header .button__label-secondary"],
        { color: "var(--color-white)" },
        "<",
      )
      // 8. Header logo SVGs → black
      .to(
        ["[header-logo-left]", "[header-logo-right]"],
        { color: "var(--color-black)", duration: 0.5 },
        "<",
      );

    return () => {};
  });

  // ── Mobile ──────────────────────────────────────────────────────────────────
  mm.add(BP.mobile, () => {
    const data = getGridData();
    if (!data || !data.squares.length) return () => {};

    const { squares, cols } = data;
    const row = squares.slice(0, cols);
    if (!row.length) return () => {};

    const logoSquares = [row[Math.floor(row.length / 2)]!];
    const logoIndices = logoSquares.map((sq) => squares.indexOf(sq));
    const allOtherSquares = squares.filter((_, i) => !logoIndices.includes(i));

    const tl = gsap.timeline({
      scrollTrigger: stConfig,
      defaults: { ease: "power1.inOut" },
      onComplete: () => emit("hero:gridDissolved"),
    });

    tl.to(allOtherSquares, {
      autoAlpha: 0,
      duration: 0.5,
      stagger: { from: "random", amount: 1.8 },
    }).to(logoSquares, { autoAlpha: 0, duration: 0.5 }, "-=0.2");

    return () => {};
  });

  // ── Reduced motion ──────────────────────────────────────────────────────────
  mm.add(BP.reducedMotion, () => {
    const data = getGridData();
    if (data?.squares.length) {
      gsap.set(data.squares, { autoAlpha: 0 });
    }
    return () => {};
  });

  scheduleRefresh();

  return () => {
    resetFlip();
  };
}
