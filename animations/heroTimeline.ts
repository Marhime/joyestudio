// inject gsap

// timeline hero reveal gsap
export const heroTimeline = (
  ref1: Ref<HTMLElement | null>,
  ref2: Ref<HTMLElement | null>
): GSAPTimeline => {
  const { $gsap, $SplitText, $locomotiveScroll } = useNuxtApp();

  const tl = $gsap.timeline({
    paused: true,
    onStart: () => {
      $locomotiveScroll.stop();
    },
    onComplete: () => {
      $locomotiveScroll.start();
    },
  });

  const splitWords = new $SplitText([".hero-title-1"], {
    type: "words, chars",
    wordsClass: "hero-word",
    charsClass: "js-char",
    mask: "words",
  });

  const splitCDynamicWords = new $SplitText([".shine-word", ".rise-word"], {
    type: "words, chars",
    wordsClass: "hero-word",
    charsClass: "js-char",
    mask: "words",
  });

  const getWordChars = (wordIndex: number) => {
    const chars =
      splitCDynamicWords.words?.[wordIndex]?.querySelectorAll(".js-char");

    return chars;
  };

  const shineChars = getWordChars(0);
  const riseChars = getWordChars(1);

  console.log({ shineChars, riseChars });

  $gsap.set([splitWords.words, splitCDynamicWords.chars], {
    yPercent: 100,
  });

  if (!shineChars || !riseChars) return tl;

  tl.to(splitWords.words, {
    yPercent: 0,
    duration: 1.618,
    ease: "power4.inOut",
    stagger: 0.2,
  })

    .to(
      riseChars,
      {
        yPercent: 0,
        duration: 1.618,
        ease: "power4.inOut",
        stagger: 0.01,
      },
      0.6
    )
    .from(
      ".hero-smiley",
      {
        yPercent: 15,
        duration: 1.618,
        ease: "power4.inOut",
      },
      "<"
    )
    .to(riseChars, {
      yPercent: -100,
      duration: 1.618,
      ease: "power4.inOut",
      stagger: 0.02,
    })
    .to(
      shineChars,
      {
        yPercent: 0,
        duration: 1.618,
        ease: "power4.inOut",
        stagger: 0.01,
      },
      "<"
    )
    .to(
      ref1.value,
      {
        backgroundPosition: "100% 100%",
        duration: 3.236,
        ease: "power4.inOut",
      },
      "<-0.618"
    );

  return tl;
};
