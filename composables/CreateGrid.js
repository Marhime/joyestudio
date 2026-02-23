import { ref, onMounted, onBeforeUnmount } from "vue";

export function useCreateGrid(configs) {
  const gridsBlocks = ref([]);
  let resizeTimer = null;

  /**
   * Crée une grille individuelle
   */
  const createOneGrid = (config, index) => {
    const container = config.el.value;
    if (!container) {
      gridsBlocks.value[index] = [];
      return [];
    }

    // Reset container
    container.innerHTML = "";
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${config.zIndex || 0};
    `;

    const blocks = [];
    const gridWidth = window.innerWidth;
    const gridHeight = window.innerHeight;
    const blockSize = Math.max(1, Math.floor(gridWidth * config.size));

    const columns = Math.ceil(gridWidth / blockSize);
    const rows = Math.ceil(gridHeight / blockSize) + 1;

    const offsetX = (gridWidth - columns * blockSize) / 2;
    const offsetY = (gridHeight - rows * blockSize) / 2;

    // Créer les blocs avec DocumentFragment pour performance
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const block = document.createElement("div");
        block.className = "grid-layout-block";
        block.style.cssText = `
          position: absolute;
          width: ${blockSize}px;
          height: ${blockSize}px;
          left: ${Math.round(col * blockSize + offsetX)}px;
          top: ${Math.round(row * blockSize + offsetY)}px;
          background-color: ${config.bgColor || "#f0f0f0"};
          opacity: 0;
          transition: opacity 0.3s ease;
        `;
        fragment.appendChild(block);
        blocks.push(block);
      }
    }

    container.appendChild(fragment);
    gridsBlocks.value[index] = blocks;

    // Animer quelques blocs en périphérie (diagonaux uniquement)
    showFewBlocks(blocks, columns, config.proportion || 0.3);

    return blocks;
  };

  /**
   * Affiche les blocs en périphérie (30% début + 30% fin)
   * en évitant les blocs côte à côte (seulement diagonales)
   */
  const showFewBlocks = (blocks, columns, proportion = 0.3) => {
    if (!blocks || blocks.length === 0) return;

    // Prendre 30% au début et 30% à la fin
    const count = Math.floor(blocks.length * proportion);
    const periphery = [...blocks.slice(0, count), ...blocks.slice(-count)];

    // Filtrer pour garder seulement les blocs en diagonale (pas côte à côte)
    const chosen = [];
    const usedIndices = new Set();

    periphery.forEach((block) => {
      const originalIndex = blocks.indexOf(block);

      // Vérifier si pas adjacent aux blocs déjà choisis
      let isAdjacent = false;
      for (const usedIdx of usedIndices) {
        const diff = Math.abs(originalIndex - usedIdx);
        // Adjacent si :
        // - diff === 1 : même rangée, côte à côte horizontalement
        // - diff === columns : même colonne, côte à côte verticalement
        if (diff === 1 || diff === columns) {
          isAdjacent = true;
          break;
        }
      }

      // Ajouter uniquement si non adjacent (donc en diagonal)
      if (!isAdjacent) {
        chosen.push(block);
        usedIndices.add(originalIndex);
      }
    });

    // Animer en cascade
    chosen.forEach((block, i) => {
      setTimeout(() => {
        block.style.opacity = "1";
      });
    });
  };

  /**
   * Crée toutes les grilles
   */
  const createAll = () => {
    configs.forEach((config, index) => {
      createOneGrid(config, index);
    });
  };

  /**
   * Nettoie toutes les grilles
   */
  const clearAll = () => {
    configs.forEach((config, index) => {
      const container = config.el.value;
      if (container) {
        container.innerHTML = "";
      }
      gridsBlocks.value[index] = [];
    });
  };

  /**
   * Recrée toutes les grilles (utile pour resize)
   */
  const recreate = () => {
    clearAll();
    createAll();
  };

  /**
   * Handler pour le resize avec debounce
   */
  const onResize = () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(() => {
      recreate();
    }, 150);
  };

  /**
   * Récupère les blocs d'une grille spécifique
   */
  const getBlocks = (index) => {
    return gridsBlocks.value[index] || [];
  };

  // Lifecycle hooks
  onMounted(() => {
    createAll();
    window.addEventListener("resize", onResize, { passive: true });

    // Debug helper (optionnel)
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      window.__gridManager = { getBlocks, recreate, clearAll, gridsBlocks };
    }
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", onResize);

    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }

    clearAll();

    // Cleanup debug helper
    if (typeof window !== "undefined" && window.__gridManager) {
      delete window.__gridManager;
    }
  });

  return {
    gridsBlocks,
    getBlocks,
    recreate,
    clearAll,
  };
}

export default useCreateGrid;
