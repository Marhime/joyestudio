// inject gsap

// timeline hero reveal gsap
// export const heroTimeline = (
//   ref1: Ref<HTMLElement | null>,
//   ref2: Ref<HTMLElement | null>
// ): { revealTimeline?: GSAPTimeline; scrollTimeline?: GSAPTimeline } => {
//   const { $gsap, $SplitText, $lenis, $GSDevTools } = useNuxtApp();

//   const revealTimeline = $gsap.timeline({
//     paused: true,
//     // If you need to pause Lenis during heavy animations you can use
//     // $lenis.pause() / $lenis.resume() here (API depending on Lenis version).
//   });

//   const splitWords = new $SplitText([".hero-title-1"], {
//     type: "words, chars",
//     wordsClass: "hero-word",
//     charsClass: "js-char",
//     mask: "words",
//   });

//   const splitCDynamicWords = new $SplitText(
//     [".shine-word", ".rise-word", ".smile-word"],
//     {
//       type: "words, chars",
//       wordsClass: "hero-word",
//       charsClass: "js-char",
//       mask: "words",
//     }
//   );

//   const getWordChars = (wordIndex: number) => {
//     const chars =
//       splitCDynamicWords.words?.[wordIndex]?.querySelectorAll(".js-char");

//     return chars;
//   };

//   const shineChars = getWordChars(0);
//   const riseChars = getWordChars(1);
//   const smileChars = getWordChars(2);

//   $gsap.set([splitWords.words, splitCDynamicWords.chars], {
//     yPercent: 100,
//   });

//   if (!shineChars || !riseChars || !smileChars) return {};

//   revealTimeline
//     .to(splitWords.words, {
//       yPercent: 0,
//       duration: 1.618,
//       ease: "power4.inOut",
//       stagger: 0.2,
//     })

//     .to(riseChars, {
//       yPercent: 0,
//       duration: 1.618,
//       ease: "power4.inOut",
//       stagger: 0.02,
//     })
//     .from(
//       ".hero-smiley",
//       {
//         yPercent: 10,
//         duration: 1.618,
//         ease: "power4.inOut",
//       },
//       "<"
//     )
//     .to(riseChars, {
//       yPercent: -100,
//       duration: 1.618,
//       ease: "power4.inOut",
//       stagger: 0.02,
//     })
//     .to(
//       shineChars,
//       {
//         yPercent: 0,
//         duration: 1.618,
//         ease: "power4.inOut",
//         stagger: 0.01,
//       },
//       "<"
//     )
//     .to(
//       splitWords.words,
//       {
//         color: "var(--color-orange)",
//         ease: "power4.inOut",
//         duration: 1.618,
//       },
//       "<"
//     )
//     .to(
//       ".hero-smiley",
//       {
//         color: "var(--color-yellow)",
//         duration: 1.618,
//         ease: "power4.inOut",
//       },
//       "<"
//     )
//     .to(
//       ref1.value,
//       {
//         backgroundPosition: "100% 100%",
//         duration: 6.472,
//         ease: "power4.inOut",
//       },
//       "<-3.618"
//     );

//   $GSDevTools.create({ animation: revealTimeline });

//   const testTimeline = $gsap.timeline({ paused: true });
//   testTimeline
//     .to(
//       shineChars,
//       {
//         yPercent: 0,
//         duration: 1.618,
//         ease: "power4.inOut",
//         stagger: 0.01,
//       },
//       "<"
//     )
//     .to(
//       ".hero-smiley",
//       {
//         y: -50,
//         duration: 1.618,
//         ease: "power4.on",
//       },
//       "<"
//     );

//   const smileyRect = document
//     .querySelector(".hero-smiley")
//     ?.getBoundingClientRect();

//   // Calcule la position pour le centrer
//   const y = smileyRect
//     ? window.innerHeight / 2 - (smileyRect.top + smileyRect.height / 2)
//     : 0;

//   const scrollTimeline = $gsap.timeline({
//     paused: true,
//   });

//   scrollTimeline
//     .to(shineChars, {
//       yPercent: -100,
//       duration: 1.618,
//       ease: "power4.inOut",
//       stagger: 0.01,
//     })
//     .to(
//       smileChars,
//       {
//         yPercent: 0,
//         duration: 1.618,
//         ease: "power4.inOut",
//         stagger: 0.01,
//       },
//       "<"
//     )
//     .set(".hero-smiley", {
//       color: "var(--color-blue)",
//     })
//     .to(".hero-smiley", {
//       duration: 1.618,
//       scale: 0.5,
//       color: "var(--color-blue)",
//       ease: "power4.inOut",
//     });

//   return { revealTimeline, scrollTimeline };
// };
