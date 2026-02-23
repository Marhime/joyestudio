// stores/theme.ts
import { defineStore } from "pinia";

export const useThemeStore = defineStore("theme", () => {
  const currentTheme = ref("color"); // Default to light mode
  const showLogo = ref(true);

  const getColor = (currentTheme: string) => {
    switch (currentTheme) {
      case "white":
        return {
          color: "#221e1f",
          buttonBgColor: "#71bff6",
          buttonIconColor: "#f9f9f9",
          buttonTextColor: "#71bff6",
          gridColor: "#c5cdcf",
        };
      case "color":
        return {
          color: "#f9f9f9",
          buttonBgColor: "#f9f9f9",
          buttonIconColor: "#71bff6",
          buttonTextColor: "#f9f9f9",
          gridColor: "#ffffff",
        };
      default:
        return {
          color: "#f9f9f9",
          buttonBgColor: "#f9f9f9",
          buttonIconColor: "#71bff6",
          buttonTextColor: "#f9f9f9",
          gridColor: "#c5cdcf",
        };
    }
  };

  // Function to change theme color
  const changeThemeTo = (themeName: string) => {
    currentTheme.value = themeName;
    applyTheme(themeName);
  };

  const setShowLogo = (show: boolean) => {
    showLogo.value = show;
  };

  const applyTheme = (themeName: string) => {
    document.body.classList = "";
    document.body.classList.add(currentTheme.value);

    const rootElement = document.documentElement;
    // Set the new value for the CSS variable '--primary-color'
    rootElement.style.setProperty("--theme-color", getColor(themeName).color);
    rootElement.style.setProperty(
      "--button-bg",
      getColor(themeName).buttonBgColor
    );
    rootElement.style.setProperty(
      "--button-text",
      getColor(themeName).buttonTextColor
    );
    rootElement.style.setProperty(
      "--button-icon",
      getColor(themeName).buttonIconColor
    );
    rootElement.style.setProperty(
      "--grid-color",
      getColor(themeName).gridColor
    );

    console.log(themeName);
  };

  onMounted(() => {
    console.log("Mounted! useThemeStore ✨");
  });

  watch(showLogo, () => {
    if (showLogo.value) document.body.classList.add("show-logo");
    else document.body.classList.remove("show-logo");
  });

  return {
    currentTheme,
    changeThemeTo,
    setShowLogo,
  };
});
