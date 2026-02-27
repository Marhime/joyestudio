<template>
  <div ref="container" class="pixel-blob"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import modelUrl from "~/assets/3D/smileyV2.glb?url";

const props = defineProps({
  color: { type: Number, default: 0xffe15a },
  radius: { type: Number, default: 28 },
  followRange: { type: Number, default: 150 },
});

const container = ref(null);

let renderer, scene, camera, mesh, geometry, frameId, gui;
const meshes = []; // sphere sub-meshes with shader → shared uniform updates
let featureMeshes = []; // eyes + mouth → MeshBasicMaterial
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
  // ── Shader / Appearance
  pixelSize: 0.006,
  edgeWidth: 0,
  trailStretch: 0.1,
  flickerSpeed: 20,
  solidStart: 0.82, // smoothstep lower bound for solid core
  solidEnd: 1.0, // smoothstep upper bound for solid core
  trailBias: 1, // how much trailing edge dissolves vs leading
  coarseRatio: 1, // layer-2 cell size multiplier
  // ── Motion
  followLerp: 0.06, // mouse → followMouse speed
  posLerp: 0.045, // followMouse → mesh position speed
  tiltAmplY: 0.15, // max tilt amplitude on Y axis (mouse X)
  tiltAmplX: 0.1, // max tilt amplitude on X axis (mouse Y)
  tiltLerp: 0.04, // tilt smoothing speed
  // ── Trail dynamics
  trailRise: 0.15, // how fast trail builds up on movement
  trailDecay: 0.03, // how fast trail fades after stopping
  trailVeloMult: 8.0, // velocity → trail strength multiplier
  // ── Color
  color: "#ffe15a",
  featureColor: "#1a1408", // eyes + mouth
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
  uniform float uSolidStart;   // smoothstep lower bound for core
  uniform float uSolidEnd;     // smoothstep upper bound for core
  uniform float uTrailBias;    // trailing edge dissolve multiplier
  uniform float uCoarseRatio;  // layer-2 cell size multiplier

  void main() {
    // Fresnel: 1 at center, 0 at silhouette
    float facing = max(0.0, dot(normalize(vNormal), -normalize(vViewPosition)));

    // Which side of the sphere is trailing?
    // +1 = leading edge (front of movement), -1 = trailing edge (back)
    vec2 velSafe   = normalize(uVeloDir + vec2(0.001));
    float trailDot = dot(normalize(vNormal.xy + vec2(0.001)), velSafe);
    float trailBias = (1.0 - trailDot) * 0.5; // 0 at leading, 1 at trailing

    // Trailing edge dissolves much more than leading edge
    float t = clamp(facing / (uEdgeWidth + uTrail * trailBias * uTrailBias), 0.0, 1.0);

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
    float cx2 = floor((uvAlong + psAlong * 0.7) / (psAlong * uCoarseRatio));
    float cy2 = floor((uvPerp  + psPerp  * 0.4) / (psPerp  * uCoarseRatio));

    float r1  = fract(sin(cx  * 127.1 + cy  * 311.7 + uTick * 57.3) * 43758.5);
    float r2  = fract(sin(cx2 * 269.5 + cy2 * 183.3 + uTick * 31.7) * 23421.6);
    float rnd = r1 * 0.65 + r2 * 0.35;

    float spray = step(1.0 - t, rnd);
    float solid = smoothstep(uSolidStart, uSolidEnd, t);

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
  followMouse.x += (mouse.x - followMouse.x) * guiParams.followLerp;
  followMouse.y += (mouse.y - followMouse.y) * guiParams.followLerp;

  const tx = (followMouse.x - 0.5) * props.followRange;
  const ty = (followMouse.y - 0.5) * props.followRange;
  mesh.position.x += (tx - mesh.position.x) * guiParams.posLerp;
  mesh.position.y += (ty - mesh.position.y) * guiParams.posLerp;

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

  // Update shader uniforms on all sub-meshes
  const sharedUniforms = {
    uVelo: smoothVelo,
    uPixelSize: guiParams.pixelSize,
    uEdgeWidth: guiParams.edgeWidth,
    uTrailStretch: guiParams.trailStretch,
    uSolidStart: guiParams.solidStart,
    uSolidEnd: guiParams.solidEnd,
    uTrailBias: guiParams.trailBias,
    uCoarseRatio: guiParams.coarseRatio,
  };
  for (const m of meshes) {
    const u = m.material.uniforms;
    u.uVelo.value = sharedUniforms.uVelo;
    u.uPixelSize.value = sharedUniforms.uPixelSize;
    u.uEdgeWidth.value = sharedUniforms.uEdgeWidth;
    u.uTrailStretch.value = sharedUniforms.uTrailStretch;
    u.uVeloDir.value.set(velocityDir.x, velocityDir.y);
    u.uSolidStart.value = sharedUniforms.uSolidStart;
    u.uSolidEnd.value = sharedUniforms.uSolidEnd;
    u.uTrailBias.value = sharedUniforms.uTrailBias;
    u.uCoarseRatio.value = sharedUniforms.uCoarseRatio;
  }

  // trailStrength: rises fast with velocity, decays slowly after stop
  // → trail lingers organically instead of cutting instantly
  const targetTrail = Math.min(smoothVelo * guiParams.trailVeloMult, 1.0);
  trailStrength +=
    (targetTrail - trailStrength) *
    (targetTrail > trailStrength ? guiParams.trailRise : guiParams.trailDecay);
  for (const m of meshes) m.material.uniforms.uTrail.value = trailStrength;

  // Tick only advances when moving → pixels static at rest
  if (smoothVelo > 0.004) {
    tickCounter += smoothVelo * guiParams.flickerSpeed;
    for (const m of meshes)
      m.material.uniforms.uTick.value = Math.floor(tickCounter);
  }

  // Subtle tilt toward mouse
  mesh.rotation.y +=
    ((followMouse.x - 0.5) * guiParams.tiltAmplY - mesh.rotation.y) *
    guiParams.tiltLerp;
  mesh.rotation.x +=
    ((followMouse.y - 0.5) * -guiParams.tiltAmplX - mesh.rotation.x) *
    guiParams.tiltLerp;

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

  // ── Shared material factory ────────────────────────────────────────
  const makeMaterial = (color) =>
    new THREE.ShaderMaterial({
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
        uColor: { value: new THREE.Color(color) },
        uSolidStart: { value: guiParams.solidStart },
        uSolidEnd: { value: guiParams.solidEnd },
        uTrailBias: { value: guiParams.trailBias },
        uCoarseRatio: { value: guiParams.coarseRatio },
      },
      transparent: true,
      depthWrite: false,
    });

  // ── GLB Load ──────────────────────────────────────────────────
  // Feature mesh names — matches L_Eye, R_Eye, GPencil
  const FEATURE_NAMES = ["eye", "gpencil", "mouth"];
  const isFeature = (name) =>
    FEATURE_NAMES.some((k) => name.toLowerCase().includes(k));

  mesh = new THREE.Group();
  mesh.scale.setScalar(props.radius);
  scene.add(mesh);

  new GLTFLoader().load(modelUrl, (gltf) => {
    gltf.scene.traverse((child) => {
      if (!child.isMesh) return;
      console.log("mesh found:", child.name);
      if (isFeature(child.name)) {
        // Features → solid fill, no pixel effect
        child.material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(guiParams.featureColor),
          transparent: false,
          depthWrite: true,
        });
        featureMeshes.push(child);
      } else {
        // Sphere → full pixel shader
        child.material = makeMaterial(guiParams.color);
        meshes.push(child);
      }
    });
    mesh.add(gltf.scene);
  });

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove);

  // ─── lil-gui ─────────────────────────────────────────────────────────
  import("lil-gui").then(({ default: GUI }) => {
    gui = new GUI({ title: "✦ Pixel Blob", width: 270 });

    // ── Appearance ─────────────────────────────────────────────────────
    const fAppear = gui.addFolder("◈ Appearance");
    fAppear.add(guiParams, "pixelSize", 0.001, 0.03, 0.001).name("Pixel size");
    fAppear.add(guiParams, "edgeWidth", 0.05, 1.2, 0.01).name("Edge width");
    fAppear.add(guiParams, "solidStart", 0.3, 0.98, 0.01).name("Solid start");
    fAppear.add(guiParams, "solidEnd", 0.5, 1.0, 0.01).name("Solid end");
    fAppear.add(guiParams, "coarseRatio", 1.0, 5.0, 0.1).name("Coarse layer");

    // ── Trail ──────────────────────────────────────────────────────────
    const fTrail = gui.addFolder("↝ Trail");
    fTrail.add(guiParams, "trailStretch", 0.0, 12.0, 0.5).name("Stretch");
    fTrail.add(guiParams, "trailBias", 0.0, 8.0, 0.1).name("Edge bias");
    fTrail.add(guiParams, "flickerSpeed", 1, 20, 0.5).name("Flicker speed");
    fTrail.add(guiParams, "trailVeloMult", 1.0, 20.0, 0.5).name("Velo → trail");
    fTrail.add(guiParams, "trailRise", 0.01, 0.3, 0.005).name("Rise speed");
    fTrail.add(guiParams, "trailDecay", 0.005, 0.15, 0.005).name("Decay speed");
    fTrail.open(false);

    // ── Motion ─────────────────────────────────────────────────────────
    const fMotion = gui.addFolder("⤳ Motion");
    fMotion.add(guiParams, "followLerp", 0.01, 0.3, 0.005).name("Mouse follow");
    fMotion.add(guiParams, "posLerp", 0.01, 0.2, 0.005).name("Pos lerp");
    fMotion.add(guiParams, "tiltAmplY", 0.0, 0.6, 0.01).name("Tilt X-axis");
    fMotion.add(guiParams, "tiltAmplX", 0.0, 0.6, 0.01).name("Tilt Y-axis");
    fMotion.add(guiParams, "tiltLerp", 0.01, 0.2, 0.005).name("Tilt speed");
    fMotion.open(false);

    // ── Color ──────────────────────────────────────────────────────────
    const FEATURE_NAMES = ["eye", "gpencil", "mouth"];
    const isFeature = (n) =>
      FEATURE_NAMES.some((k) => n.toLowerCase().includes(k));

    gui
      .addColor(guiParams, "color")
      .name("Body color")
      .onChange((v) => {
        for (const m of meshes)
          if (!isFeature(m.name)) m.material.uniforms.uColor.value.set(v);
      });
    gui
      .addColor(guiParams, "featureColor")
      .name("Face color")
      .onChange((v) => {
        for (const m of featureMeshes) m.material.color.set(v);
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
  for (const m of meshes) m.material?.dispose();
  for (const m of featureMeshes) m.material?.dispose();
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
