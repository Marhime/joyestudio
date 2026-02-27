export function useLogoFlip() {
  const { $gsap, $Flip } = useNuxtApp();

  let logoLeftRef: Element | null = null;
  let logoRightRef: Element | null = null;
  let finalLeftContainer: Element | null = null;
  let finalRightContainer: Element | null = null;
  let logoLeftPlaceholderRef: Element | null = null;
  let logoRightPlaceholderRef: Element | null = null;
  let finalStateLeft: any;
  let finalStateRight: any;

  /**
   * Sélectionne les éléments DOM.
   * Appeler après nextTick une fois le DOM monté.
   */
  const init = () => {
    logoLeftRef = document.querySelector("[hero-logo-left]");
    logoRightRef = document.querySelector("[hero-logo-right]");
    finalLeftContainer = document.querySelector("[header-logo-left]");
    finalRightContainer = document.querySelector("[header-logo-right]");
    logoLeftPlaceholderRef = document.querySelector("[hero-placeholder-left]");
    logoRightPlaceholderRef = document.querySelector(
      "[hero-placeholder-right]",
    );
  };

  /**
   * Place les logos hero en position fixe sur leurs placeholders,
   * puis capture l'état final (position header) avec Flip.getState.
   * Appeler avant de construire la timeline.
   */
  const setInitialPositions = () => {
    if (
      !logoLeftRef ||
      !logoRightRef ||
      !logoLeftPlaceholderRef ||
      !logoRightPlaceholderRef ||
      !finalLeftContainer ||
      !finalRightContainer
    )
      return;

    const initialLeftRect = logoLeftPlaceholderRef.getBoundingClientRect();
    const initialRightRect = logoRightPlaceholderRef.getBoundingClientRect();

    // Position fixed sur les placeholders (coordonnées viewport)
    $gsap.set(logoLeftRef, {
      position: "fixed",
      top: initialLeftRect.top,
      left: initialLeftRect.left,
      width: initialLeftRect.width,
      height: initialLeftRect.height,
      zIndex: 1000,
    });

    $gsap.set(logoRightRef, {
      position: "fixed",
      top: initialRightRect.top,
      left: initialRightRect.left,
      width: initialRightRect.width,
      height: initialRightRect.height,
      zIndex: 1000,
    });

    // Capture où se trouvent les conteneurs header (destination du flip)
    finalStateLeft = $Flip.getState(finalLeftContainer);
    finalStateRight = $Flip.getState(finalRightContainer);
  };

  /**
   * Ajoute les tweens Flip à une timeline existante.
   * @param tl       Timeline GSAP cible
   * @param position Label / position dans la timeline (ex: "<", 0, "+=0.5")
   */
  const addToTimeline = (
    tl: gsap.core.Timeline,
    position: gsap.Position = "<",
  ) => {
    if (!finalStateLeft || !finalStateRight || !logoLeftRef || !logoRightRef)
      return;

    const flipConfig = { ease: "none", duration: 1 };

    const leftTween = $Flip.fit(logoLeftRef, finalStateLeft, flipConfig);
    if (leftTween) {
      tl.add(leftTween as gsap.core.Tween, position);
    }

    const rightTween = $Flip.fit(logoRightRef, finalStateRight, flipConfig);
    if (rightTween) {
      tl.add(rightTween as gsap.core.Tween, "<");
    }
  };

  /**
   * Remet les logos en position initiale (utile lors d'un resize).
   */
  const reset = () => {
    $gsap.set([logoLeftRef, logoRightRef], { clearProps: "all" });
    finalStateLeft = undefined;
    finalStateRight = undefined;
  };

  return { init, setInitialPositions, addToTimeline, reset };
}
