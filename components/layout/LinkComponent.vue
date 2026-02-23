<template>
  <div class="link" ref="linkRef">
    <NuxtLink class="link" :href="href">
      <span class="link__label t1-body" :data-text="label">
        <span class="link__label-inner" ref="innerRef">{{ label }}</span>
        <span class="link__label-outer" ref="outerRef">{{ label }}</span>
      </span>
    </NuxtLink>
  </div>
</template>

<script setup>
defineProps(["href", "label", "target"]);

// const { $gsap } = useNuxtApp();
// const themeStore = useThemeStore();
// const { currentTheme } = storeToRefs(themeStore);

// const linkRef = ref(null);
// const innerRef = ref(null);
// const outerRef = ref(null);

// let changeColorCtx;

// onMounted(() => {
//   // Initialiser les positions
//   $gsap.set(innerRef.value, {
//     yPercent: 0,
//   });

//   $gsap.set(outerRef.value, {
//     yPercent: 120,
//   });
// });

// const changeTheme = () => {
//   if (!innerRef.value || !outerRef.value) return;

//   console.log("animate");

//   // Annuler l'animation précédente si elle existe
//   changeColorCtx?.revert();

//   changeColorCtx = $gsap.context(() => {
//     const tl = $gsap.timeline({ defaults: { duration: 0.5 } });
//     tl.to(innerRef.value, {
//       yPercent: -120,
//       ease: "power3.inOut",
//     }).to(
//       outerRef.value,
//       {
//         yPercent: 0,
//         ease: "power3.inOut",
//       },
//       "<"
//     );
//   }, linkRef.value); // Scope GSAP à ce composant uniquement
// };

// watch(currentTheme, () => {
//   changeTheme();
// });

// onBeforeUnmount(() => {
//   changeColorCtx?.revert();
// });
</script>

<style lang="scss">
.link {
  &__label {
    position: relative;
    overflow: hidden;
    display: block;

    &-inner,
    &-outer {
      display: block;
      font-size: inherit;
      font-weight: inherit;
      transition: transform var(--ease-button);
      color: var(--theme-color);
    }

    &-outer {
      position: absolute;
      top: 0;
      left: 0;
      transform: translateY(120%);
    }
  }

  &:hover {
    .link__label-inner {
      transform: translateY(-120%);
    }

    .link__label-outer {
      transform: translateY(0);
    }
  }
}
</style>
