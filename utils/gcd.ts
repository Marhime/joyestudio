/**
 * Calculate the Greatest Common Divisor (GCD) of two numbers
 * using the Euclidean algorithm
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.floor(a));
  b = Math.abs(Math.floor(b));

  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }

  return a;
}

/**
 * Calculate the GCD-based square size for a given rectangle
 * Returns the largest square size that perfectly divides both dimensions
 */
export function calculateGCDSquareSize(width: number, height: number): number {
  return gcd(width, height);
}

/**
 * Calculate the GCD-based square size with a divisor for finer control
 * Useful when you want more/fewer squares than the base GCD allows
 */
export function calculateGCDSquareSizeWithDivisor(
  width: number,
  height: number,
  divisor: number = 1,
): number {
  const baseGCD = gcd(width, height);
  return Math.floor(baseGCD / divisor);
}
