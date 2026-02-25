<template>
  <div ref="container" class="pixel-blob"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";

const props = defineProps({
  color: { type: Number, default: 0xffe15a },
  radius: { type: Number, default: 90 },
  followRange: { type: Number, default: 150 },
});

const container = ref(null);

let renderer, scene, camera, mesh, geometry, frameId, gui;
const mouse = new THREE.Vector2(0.5, 0.5);
const followMouse = new THREE.Vector2(0.5, 0.5);
const velocityDir = new THREE.Vector2(0, 0);
const prevPos = new THREE.Vector2(0, 0);
let moveSpeed = 0,
  smoothVelo = 0,
  time = 0,
  tickCounter = 0,
  trailStrength = 0;

const guiParams = {
  pixelSize: 0.002,
  edgeWidth: 0.33,
  flickerSpeed: 20,
  trailStretch: 0.1,
  color: "#ffe15a",
};

// ─── Shaders ───────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    vUv      = uv;
    vNormal  = normalize(normalMatrix * normal);
    vec4 mvp = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = mvp.xyz;
    gl_Position   = projectionMatrix * mvp;
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  uniform float uVelo;
  uniform float uTick;
  uniform float uPixelSize;
  uniform float uEdgeWidth;
  uniform float uTrail;        // slow-decaying trail strength
  uniform float uTrailStretch; // how much cells elongate in movement dir
  uniform vec2  uVeloDir;      // normalized velocity direction
  uniform vec3  uColor;

  void main() {
    // Fresnel: 1 at center, 0 at silhouette
    float facing = max(0.0, dot(normalize(vNormal), -normalize(vViewPosition)));

    // Which side of the sphere is trailing?
    // +1 = leading edge (front of movement), -1 = trailing edge (back)
    vec2 velSafe   = normalize(uVeloDir + vec2(0.001));
    float trailDot = dot(normalize(vNormal.xy + vec2(0.001)), velSafe);
    float trailBias = (1.0 - trailDot) * 0.5; // 0 at leading, 1 at trailing

    // Trailing edge dissolves much more than leading edge
    float t = clamp(facing / (uEdgeWidth + uTrail * trailBias * 3.0), 0.0, 1.0);

    // ── Anisotropic cells: elongated along movement direction ─────────────
    vec2 velPerp  = vec2(-velSafe.y, velSafe.x);
    float uvAlong = dot(vUv - 0.5, velSafe);
    float uvPerp  = dot(vUv - 0.5, velPerp);

    // Cells stretch in movement direction proportionally to trail strength
    float psAlong = uPixelSize * (1.0 + uTrail * uTrailStretch);
    float psPerp  = uPixelSize;

    float cx  = floor(uvAlong / psAlong);
    float cy  = floor(uvPerp  / psPerp);

    // Second coarser layer offset to break regularity
    float cx2 = floor((uvAlong + psAlong * 0.7) / (psAlong * 2.2));
    float cy2 = floor((uvPerp  + psPerp  * 0.4) / (psPerp  * 2.2));

    float r1  = fract(sin(cx  * 127.1 + cy  * 311.7 + uTick * 57.3) * 43758.5);
    float r2  = fract(sin(cx2 * 269.5 + cy2 * 183.3 + uTick * 31.7) * 23421.6);
    float rnd = r1 * 0.65 + r2 * 0.35;

    float spray = step(1.0 - t, rnd);
    float solid = smoothstep(0.82, 1.0, t);

    gl_FragColor = vec4(uColor, max(solid, spray));
  }
`;

// ─── Events ────────────────────────────────────────────────────────────────
const onPointerMove = (e) => {
  mouse.x = e.clientX / window.innerWidth;
  mouse.y = 1.0 - e.clientY / window.innerHeight;
};

const resize = () => {
  if (!container.value || !renderer || !camera) return;
  const w = container.value.clientWidth || window.innerWidth;
  const h = container.value.clientHeight || window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};

const onContextLost = (e) => {
  e.preventDefault();
  if (frameId) cancelAnimationFrame(frameId);
  frameId = null;
};

const onContextRestored = () => {
  animate();
};

// ─── Loop ──────────────────────────────────────────────────────────────────
const animate = () => {
  if (renderer.getContext().isContextLost()) return;
  time += 0.016;

  // Smooth mouse follow
  followMouse.x += (mouse.x - followMouse.x) * 0.06;
  followMouse.y += (mouse.y - followMouse.y) * 0.06;

  const tx = (followMouse.x - 0.5) * props.followRange;
  const ty = (followMouse.y - 0.5) * props.followRange;
  mesh.position.x += (tx - mesh.position.x) * 0.045;
  mesh.position.y += (ty - mesh.position.y) * 0.045;

  // Velocity tracking
  const vx = mesh.position.x - prevPos.x;
  const vy = mesh.position.y - prevPos.y;
  const speed = Math.sqrt(vx * vx + vy * vy);
  moveSpeed += (speed - moveSpeed) * 0.12;

  if (speed > 0.001) {
    const inv = 1.0 / speed;
    velocityDir.x += (vx * inv - velocityDir.x) * 0.15;
    velocityDir.y += (vy * inv - velocityDir.y) * 0.15;
  } else {
    velocityDir.x *= 0.92;
    velocityDir.y *= 0.92;
  }
  prevPos.set(mesh.position.x, mesh.position.y);

  const clamped = Math.min(moveSpeed * 0.025, 0.12);
  smoothVelo += (clamped - smoothVelo) * 0.08;

  // Update shader uniforms
  const u = mesh.material.uniforms;
  u.uVelo.value = smoothVelo;
  u.uPixelSize.value = guiParams.pixelSize;
  u.uEdgeWidth.value = guiParams.edgeWidth;
  u.uTrailStretch.value = guiParams.trailStretch;
  u.uVeloDir.value.set(velocityDir.x, velocityDir.y);

  // trailStrength: rises fast with velocity, decays slowly after stop
  // → trail lingers organically instead of cutting instantly
  const targetTrail = Math.min(smoothVelo * 8.0, 1.0);
  trailStrength +=
    (targetTrail - trailStrength) * (targetTrail > trailStrength ? 0.15 : 0.03);
  u.uTrail.value = trailStrength;

  // Tick only advances when moving → pixels static at rest
  if (smoothVelo > 0.004) {
    tickCounter += smoothVelo * guiParams.flickerSpeed;
    u.uTick.value = Math.floor(tickCounter);
  }

  // Subtle tilt toward mouse
  mesh.rotation.y += ((followMouse.x - 0.5) * 0.4 - mesh.rotation.y) * 0.04;
  mesh.rotation.x += ((followMouse.y - 0.5) * -0.3 - mesh.rotation.x) * 0.04;

  renderer.render(scene, camera);
  frameId = requestAnimationFrame(animate);
};

// ─── Init ──────────────────────────────────────────────────────────────────
const init = () => {
  scene = new THREE.Scene();

  // pixelRatio = 1 → each logical pixel maps to 1 screen pixel
  // → crisp, visible pixel blocks from gl_FragCoord (no sub-pixel blurring)
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0); // fully transparent background

  container.value.appendChild(renderer.domElement);
  renderer.domElement.addEventListener(
    "webglcontextlost",
    onContextLost,
    false,
  );
  renderer.domElement.addEventListener(
    "webglcontextrestored",
    onContextRestored,
    false,
  );

  // clientWidth can be 0 during Nuxt hydration — fall back to window dimensions
  const w = container.value.clientWidth || window.innerWidth;
  const h = container.value.clientHeight || window.innerHeight;
  renderer.setSize(w, h);

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
  camera.position.set(0, 0, 450);

  geometry = new THREE.SphereGeometry(1, 64, 64);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uVelo: { value: 0 },
      uTick: { value: 0 },
      uTrail: { value: 0 },
      uTrailStretch: { value: guiParams.trailStretch },
      uPixelSize: { value: guiParams.pixelSize },
      uEdgeWidth: { value: guiParams.edgeWidth },
      uVeloDir: { value: new THREE.Vector2(0, 0) },
      uColor: { value: new THREE.Color(props.color) },
    },
    transparent: true,
    depthWrite: false,
  });

  mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(props.radius);
  scene.add(mesh);

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove);

  // ─── lil-gui ─────────────────────────────────────────────────────────
  import("lil-gui").then(({ default: GUI }) => {
    gui = new GUI({ title: "Pixel Blob" });
    const u = mesh.material.uniforms;

    gui.add(guiParams, "pixelSize", 0.002, 0.03, 0.001).name("Pixel size");
    gui.add(guiParams, "edgeWidth", 0.2, 1.0, 0.01).name("Edge width");
    gui.add(guiParams, "trailStretch", 0.0, 12.0, 0.5).name("Trail stretch");
    gui.add(guiParams, "flickerSpeed", 1, 20, 0.5).name("Flicker speed");
    gui
      .addColor(guiParams, "color")
      .name("Color")
      .onChange((v) => {
        u.uColor.value.set(v);
      });
  });

  animate();
};

onMounted(init);

onBeforeUnmount(() => {
  if (frameId) cancelAnimationFrame(frameId);
  gui?.destroy();
  window.removeEventListener("resize", resize);
  window.removeEventListener("pointermove", onPointerMove);
  renderer?.domElement?.removeEventListener("webglcontextlost", onContextLost);
  renderer?.domElement?.removeEventListener(
    "webglcontextrestored",
    onContextRestored,
  );
  geometry?.dispose();
  mesh?.material?.dispose();
  renderer?.dispose();
  renderer?.domElement?.parentNode?.removeChild(renderer.domElement);
});
</script>

<style scoped>
.pixel-blob {
  width: 100%;
  height: 100vh;
  position: relative;
  z-index: 10;
}
</style>
