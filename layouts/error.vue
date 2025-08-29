<template>
  <div class="error-page">
    <h1>500 - Internal Server Error</h1>
    <p>Sorry, something went wrong.</p>
    <NuxtLink to="/">Go back home</NuxtLink>
  </div>
</template>

<script setup></script>

<style scoped>
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #fff0f0;
}
h1 {
  color: #d32f2f;
}
p {
  margin-bottom: 1rem;
}
</style>
