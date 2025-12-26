// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css", "~/assets/css/typography.css"],

  app: {
    head: {
      link: [
        {
          rel: "stylesheet",
          href: "https://use.typekit.net/bcn0hmz.css",
        },
      ],
    },
    pageTransition: { name: "page", mode: "out-in" },
  },

  modules: ["@nuxt/fonts", "@nuxt/image"],
});
