// composables/useTypography.ts

interface TypographyScale {
  mobile: number;
  desktop: number;
}

interface TypographyConfig {
  h1: { size: TypographyScale; lineHeight: TypographyScale };
  h2: { size: TypographyScale; lineHeight: TypographyScale };
  h3: { size: TypographyScale; lineHeight: TypographyScale };
  h4: { size: TypographyScale; lineHeight: TypographyScale };
  bodyAccent: { size: TypographyScale; lineHeight: TypographyScale };
  body: { size: TypographyScale; lineHeight: TypographyScale };
}

const TYPE_CONFIGS = {
  type1: {
    h1: {
      size: { mobile: 135, desktop: 345 },
      lineHeight: { mobile: 163, desktop: 417 },
    },
    h2: {
      size: { mobile: 40, desktop: 155 },
      lineHeight: { mobile: 48, desktop: 187 },
    },
    h3: {
      size: { mobile: 33, desktop: 110 },
      lineHeight: { mobile: 40, desktop: 100 },
    },
    h4: {
      size: { mobile: 25, desktop: 66 },
      lineHeight: { mobile: 30, desktop: 80 },
    },
    bodyAccent: {
      size: { mobile: 24, desktop: 24 },
      lineHeight: { mobile: 29, desktop: 29 },
    },
    body: {
      size: { mobile: 11, desktop: 18 },
      lineHeight: { mobile: 13, desktop: 21.8 },
    },
  },
  type2: {
    h1: {
      size: { mobile: 187, desktop: 435 },
      lineHeight: { mobile: 226, desktop: 526.8 },
    },
    h2: {
      size: { mobile: 52, desktop: 210 },
      lineHeight: { mobile: 63, desktop: 254.3 },
    },
    h3: {
      size: { mobile: 45, desktop: 152 },
      lineHeight: { mobile: 100, desktop: 100 },
    },
    h4: {
      size: { mobile: 35, desktop: 83 },
      lineHeight: { mobile: 42, desktop: 100.5 },
    },
    bodyAccent: {
      size: { mobile: 10, desktop: 21 },
      lineHeight: { mobile: 19, desktop: 19 },
    },
    body: {
      size: { mobile: 11, desktop: 18 },
      lineHeight: { mobile: 13, desktop: 21.8 },
    },
  },
} as const;

export const useTypography = () => {
  /**
   * Génère une valeur clamp fluide entre mobile et desktop
   */
  const generateClamp = (
    mobileValue: number,
    desktopValue: number,
    mobileBreakpoint = 375,
    desktopBreakpoint = 1920
  ): string => {
    const slope =
      (desktopValue - mobileValue) / (desktopBreakpoint - mobileBreakpoint);
    const yAxisIntersection = -mobileBreakpoint * slope + mobileValue;

    return `clamp(${mobileValue}px, ${yAxisIntersection.toFixed(2)}px + ${(
      slope * 100
    ).toFixed(4)}vw, ${desktopValue}px)`;
  };

  /**
   * Met à jour les variables CSS avec des valeurs custom
   */
  const setCustomTypography = (
    type: "type1" | "type2",
    element: keyof TypographyConfig,
    customValues?: {
      mobile?: { size?: number; lineHeight?: number };
      desktop?: { size?: number; lineHeight?: number };
    }
  ) => {
    if (!import.meta.client) return;

    const config = TYPE_CONFIGS[type][element];
    const root = document.documentElement;

    const mobileSize = customValues?.mobile?.size ?? config.size.mobile;
    const desktopSize = customValues?.desktop?.size ?? config.size.desktop;
    const mobileHeight =
      customValues?.mobile?.lineHeight ?? config.lineHeight.mobile;
    const desktopHeight =
      customValues?.desktop?.lineHeight ?? config.lineHeight.desktop;

    const prefix = type === "type1" ? "t1" : "t2";
    const elemName = element.replace(/([A-Z])/g, "-$1").toLowerCase();

    root.style.setProperty(
      `--${prefix}-${elemName}-size`,
      generateClamp(mobileSize, desktopSize)
    );
    root.style.setProperty(
      `--${prefix}-${elemName}-height`,
      generateClamp(mobileHeight, desktopHeight)
    );
  };

  /**
   * Réinitialise la typographie aux valeurs par défaut
   */
  const resetTypography = () => {
    if (!import.meta.client) return;

    // Recharger le fichier CSS ou réappliquer les variables
    const link = document.querySelector('link[href*="typography.css"]');
    if (link) {
      const href = link.getAttribute("href");
      link.setAttribute("href", href + "?reload=" + Date.now());
    }
  };

  /**
   * Ajuste le scale global de la typographie (utile pour tweaking rapide)
   */
  const scaleTypography = (scale: number) => {
    if (!import.meta.client) return;

    const root = document.documentElement;
    root.style.setProperty("font-size", `${scale * 100}%`);
  };

  return {
    generateClamp,
    setCustomTypography,
    resetTypography,
    scaleTypography,
    configs: TYPE_CONFIGS,
  };
};
