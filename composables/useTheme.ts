import { ref } from "vue";

export type Theme = { text: string; bg: string };

const themes: Record<string, Theme> = {
  light: { text: "#000000", bg: "#ffffff" },
  dark: { text: "#ffffff", bg: "#000000" },
};

const currentTheme = ref<Theme>(themes.light);

export function useTheme() {
  const setTheme = (theme: "light" | "dark") => {
    if (themes[theme]) currentTheme.value = themes[theme];
  };

  return {
    currentTheme,
    setTheme,
    themes,
  };
}
