/**
 * Grid calculation utilities for creating perfect square grids
 */

import { gcd } from "./gcd";

export interface GridConfig {
  cols: number;
  rows: number;
  blockSize: number;
  totalBlocks: number;
}

/**
 * Calculate grid dimensions using GCD for perfect squares
 * The square size will be the Greatest Common Divisor of width and height
 * This guarantees perfect squares that evenly fill the entire viewport
 *
 * @param divisor - Divide GCD by this to get smaller squares (2 = half size, 3 = third size, etc.)
 */
export function calculatePerfectSquareGrid(
  viewportWidth: number,
  viewportHeight: number,
  divisor: number = 1,
): GridConfig {
  // Use GCD to get the largest perfect square size that divides both dimensions
  const baseGCD = gcd(Math.floor(viewportWidth), Math.floor(viewportHeight));

  // Divide by divisor to control square size (bigger divisor = smaller squares)
  const blockSize = Math.floor(baseGCD / divisor);

  // Calculate exact number of columns and rows
  const cols = Math.floor(viewportWidth / blockSize);
  const rows = Math.floor(viewportHeight / blockSize);

  return {
    cols,
    rows,
    blockSize,
    totalBlocks: cols * rows,
  };
}

/**
 * Calculate grid with approximately the desired number of columns
 * Creates large perfect squares with minimal gap at right/bottom edges
 * BEST for large squares with controlled column count
 *
 * @param desiredCols - Approximate number of columns desired (e.g., 11)
 * @param minBlockSize - Minimum size in pixels for each square (default: 100)
 */
export function calculateGridByColumns(
  viewportWidth: number,
  viewportHeight: number,
  desiredCols: number,
  minBlockSize: number = 100,
): GridConfig {
  const w = Math.floor(viewportWidth);
  const h = Math.floor(viewportHeight);

  // Calculate block size for desired columns
  let blockSize = Math.floor(w / desiredCols);

  // Ensure minimum block size
  if (blockSize < minBlockSize) {
    blockSize = minBlockSize;
  }

  // Calculate how many columns and rows fit
  const cols = Math.floor(w / blockSize);
  const rows = Math.ceil(h / blockSize);

  return {
    cols,
    rows,
    blockSize,
    totalBlocks: cols * rows,
  };
}

/**
 * Create optimized grid blocks using DocumentFragment for better performance
 */
export function createGridBlocks(
  config: GridConfig,
  bgColor: string,
  borderColor: string = "rgba(0, 0, 0, 1)",
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const { cols, rows, blockSize } = config;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const block = document.createElement("div");
      block.className = "grid-layout-block";
      block.style.cssText = `
        width: ${blockSize}px;
        height: ${blockSize}px;
        left: ${col * blockSize}px;
        top: ${row * blockSize}px;
        background-color: ${bgColor};
        opacity: 1;
        border: 1px solid ${borderColor};
      `;
      fragment.appendChild(block);
    }
  }

  return fragment;
}
