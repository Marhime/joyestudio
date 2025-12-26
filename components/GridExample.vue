<!-- components/GridExample.vue -->
<template>
  <div>
    <!-- Overlay de grille pour le développement (toggle avec 'g') -->

    <!-- Contenu principal -->
    <div class="grid-container">
      <div class="grid">
        <!-- Élément occupant la colonne 1 (16.7%) -->
        <div class="col-span-1" style="background: #f0f0f0; padding: 20px">
          <h3>Col 1</h3>
          <p>16.7%</p>
        </div>

        <!-- Élément occupant la colonne 2 (9.73%) -->
        <div class="col-span-1" style="background: #e0e0e0; padding: 20px">
          <h3>Col 2</h3>
          <p>9.73%</p>
        </div>

        <!-- Élément occupant les colonnes 3 et 4 -->
        <div class="col-span-2" style="background: #d0d0d0; padding: 20px">
          <h3>Col 3-4</h3>
          <p>38.85% + 34.73% = 73.58%</p>
        </div>

        <!-- Élément démarrant à la colonne 3, occupant 1 colonne -->
        <div
          class="col-start-3 col-span-1"
          style="background: #c0c0c0; padding: 20px; margin-top: 20px"
        >
          <h3>Col 3</h3>
          <p>38.85%</p>
        </div>

        <!-- Élément occupant toute la largeur sur desktop, adapté sur mobile -->
        <div
          class="col-span-4 mobile:col-span-3"
          style="background: #b0b0b0; padding: 20px; margin-top: 20px"
        >
          <h3>Full Width</h3>
          <p>Toute la largeur (desktop et mobile)</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
/* Styles supplémentaires si nécessaire */
h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
}

p {
  margin: 0;
  font-size: 14px;
  color: #666;
}
</style>
