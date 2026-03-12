import * as THREE from "three";

export interface DomWorldTransform {
  /** World-space X (origin = canvas center) */
  x: number;
  /** World-space Y (origin = canvas center, Y up) */
  y: number;
  /** World-space diameter matching the smallest DOM dimension (width or height) */
  worldSize: number;
}

/**
 * Converts a DOM element's bounding rect to Three.js world-space position + size.
 *
 * Strategy:
 *  1. Compute the center of the element in NDC [-1, 1]
 *  2. Cast a ray from the camera through that NDC point
 *  3. Find where the ray hits the z = 0 plane (mesh plane)
 *  4. Convert element pixel size to world units using the camera FOV
 *
 * Works with any PerspectiveCamera looking down the -Z axis with position.z > 0.
 */
export function domRectToWorld(
  rect: DOMRect,
  camera: THREE.PerspectiveCamera,
  canvasWidth: number,
  canvasHeight: number,
): DomWorldTransform {
  // ── 1. Centre du rect en NDC ───────────────────────────────────────────
  const ndcX = ((rect.left + rect.width / 2) / canvasWidth) * 2 - 1;
  // DOM Y is top-down, NDC Y is bottom-up → invert
  const ndcY = -(((rect.top + rect.height / 2) / canvasHeight) * 2 - 1);

  // ── 2. Unproject → direction dans le world ────────────────────────────
  const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
  vector.unproject(camera);

  const dir = vector.clone().sub(camera.position).normalize();

  // ── 3. Intersection avec le plan z = 0 ────────────────────────────────
  // parametric: camera.position + t * dir, where z component = 0
  const t = (0 - camera.position.z) / dir.z;
  const worldPos = camera.position.clone().addScaledVector(dir, t);

  // ── 4. Taille en world units ───────────────────────────────────────────
  // At z = 0 (mesh plane), half the visible height (world units) =
  //   camera.position.z * tan(fov/2)
  const fovRad = (camera.fov * Math.PI) / 180;
  const worldHeightTotal = 2 * Math.tan(fovRad / 2) * camera.position.z;
  const unitsPerPixel = worldHeightTotal / canvasHeight;

  // Match the smaller DOM dimension so the sphere fits inside the element
  const domSize = Math.min(rect.width, rect.height);
  const worldSize = domSize * unitsPerPixel;

  return {
    x: worldPos.x,
    y: worldPos.y,
    worldSize,
  };
}
