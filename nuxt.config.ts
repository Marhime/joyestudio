// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/scss/style.scss"],

  app: {
    head: {
      link: [
        {
          rel: "stylesheet",
          href: "https://use.typekit.net/bcn0hmz.css",
        },
      ],
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // additionalData injects these lines at the beginning of every SCSS block
          additionalData: '@use "@/assets/scss/utilities/_mixins.scss" as *;',
        },
      },
    },
  },

  modules: ["@nuxt/fonts", "@nuxt/image", "@pinia/nuxt"],
});
