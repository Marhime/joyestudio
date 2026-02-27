// const logoLeftRef = document.querySelector("[hero-logo-left]");
// const logoRightRef = document.querySelector("[hero-logo-right]");
// const finalLeftContainer = document.querySelector("[header-logo-left]");
// const finalRightContainer = document.querySelector("[header-logo-right]");
// const logoLeftPlaceholderRef = document.querySelector(
//   "[hero-placeholder-left]",
// );
// const logoRightPlaceholderRef = document.querySelector(
//   "[hero-placeholder-right]",
// );

// let initialLeftRect;
// let initialRightRect;
// let finalStateLeft;
// let finalStateRight;

// const updatePositions = () => {
//   initialLeftRect = logoLeftPlaceholderRef?.getBoundingClientRect();
//   initialRightRect = logoRightPlaceholderRef?.getBoundingClientRect();

//   const scrollY = window.scrollY || window.pageYOffset;

//   $gsap.set(logoLeftRef, {
//     position: "fixed",
//     top: initialLeftRect?.top + scrollY,
//     left: initialLeftRect?.left,
//     width: initialLeftRect?.width,
//     height: initialLeftRect?.height,
//     zIndex: 1000,
//   });

//   $gsap.set(logoRightRef, {
//     position: "fixed",
//     top: initialRightRect?.top + scrollY,
//     left: initialRightRect?.left,
//     width: initialRightRect?.width,
//     height: initialRightRect?.height,
//     zIndex: 1000,
//   });
// };

// const createFlipAnimation = () => {
//   // revalidate positions
//   ctx?.revert();

//   // set fixed when the context is active (avoids layout shifts before context)
//   ctx = $gsap.context(() => {
//     updatePositions();
//     finalStateLeft = $Flip.getState(finalLeftContainer);
//     finalStateRight = $Flip.getState(finalRightContainer);

//     console.log(buttonWrapperRef.value);
//     const tl = $gsap.timeline({
//       scrollTrigger: {
//         trigger: sectionRef.value,
//         start: "top top",
//         end: "bottom 60%",
//         scrub: 1,
//         markers: true,
//         id: "logo",
//       },
//     });

//     const flipConfig = {
//       ease: "none",
//       duration: 1,
//     };

//     tl.add($Flip.fit(logoLeftRef, finalStateLeft, flipConfig), 0).add(
//       $Flip.fit(logoRightRef, finalStateRight, flipConfig),
//       "<",
//     );
//   });
// };

// const debouncedCreateFlipAnimation = debounce(() => {
//   createFlipAnimation();
// }, 200);
