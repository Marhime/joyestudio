<template>
  <div ref="container" class="glitch-sphere"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const props = defineProps({
  textureUrl: { type: String, default: "/img/3.jpg" },
});

const container = ref(null);

let renderer;
let scene;
let camera;
let mesh;
let geometry;
let composer;
let customPass;
let frameId;

const mouse = new THREE.Vector2();
const followMouse = new THREE.Vector2();
const prevMouse = new THREE.Vector2();
let targetSpeed = 0;
let time = 0;
const followRange = 120;
let smoothVelo = 0;
const velocityDir = new THREE.Vector2();
const prevPos = new THREE.Vector2();
let moveSpeed = 0;
let aspectRatio = 1;

const postVertex = `
uniform float time;
uniform float progress;
uniform vec2 resolution;
varying vec2 vUv;
uniform sampler2D texture1;

const float pi = 3.1415925;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
}
`;

const postFragment = `
uniform float time;
uniform float progress;
uniform sampler2D tDiffuse;
uniform vec2 resolution;
varying vec2 vUv;
uniform vec2 uMouse;
uniform float uVelo;
uniform float uRadius;
uniform float uFeather;
uniform float uStrength;
uniform int uType;

float circle(vec2 uv, vec2 disc_center, float disc_radius, float border_size) {
  uv -= disc_center;
  uv *= resolution;
  float dist = sqrt(dot(uv, uv));
  return smoothstep(disc_radius + border_size, disc_radius - border_size, dist);
}

float hash12(vec2 p) {
  float h = dot(p, vec2(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}

void main() {
  vec2 newUV = vUv;
  vec4 color = vec4(1., 0., 0., 1.);

  if (uType == 2) {
    float hash = hash12(vUv * 10.);
    float c = circle(newUV, uMouse, uRadius, uFeather);
    float strength = uStrength + uVelo * 1.5;
    vec2 warpedUV = vUv + vec2(hash - 0.5) * c * strength;
    color = texture2D(tDiffuse, warpedUV) +
            texture2D(tDiffuse, warpedUV) * vec4(vec3(c), 1.);
  }

  gl_FragColor = color;
}
`;

const onPointerMove = (event) => {
  mouse.x = event.clientX / window.innerWidth;
  mouse.y = 1 - event.clientY / window.innerHeight;
};

const updateSpeed = () => {
  const dx = mouse.x - prevMouse.x;
  const dy = mouse.y - prevMouse.y;
  const v = Math.sqrt(dx * dx + dy * dy);

  targetSpeed -= 0.1 * (targetSpeed - v);
  followMouse.x -= 0.06 * (followMouse.x - mouse.x);
  followMouse.y -= 0.06 * (followMouse.y - mouse.y);

  prevMouse.copy(mouse);
};

const resize = () => {
  if (!container.value || !renderer || !camera || !customPass) return;
  const width = container.value.clientWidth || window.innerWidth;
  const height = container.value.clientHeight || window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  aspectRatio = width / height;
  customPass.uniforms.resolution.value.set(aspectRatio, 1);
  composer.setSize(width, height);
};

const animate = () => {
  time += 0.05;
  updateSpeed();

  customPass.uniforms.time.value = time;

  const targetX = (followMouse.x - 0.5) * followRange;
  const targetY = (followMouse.y - 0.5) * followRange;
  mesh.position.x += (targetX - mesh.position.x) * 0.045;
  mesh.position.y += (targetY - mesh.position.y) * 0.045;

  const vx = mesh.position.x - prevPos.x;
  const vy = mesh.position.y - prevPos.y;
  const speed = Math.sqrt(vx * vx + vy * vy);
  moveSpeed += (speed - moveSpeed) * 0.12;
  if (speed > 0.0001) {
    const inv = 1 / speed;
    velocityDir.x += (vx * inv - velocityDir.x) * 0.15;
    velocityDir.y += (vy * inv - velocityDir.y) * 0.15;
  } else {
    velocityDir.x += (0 - velocityDir.x) * 0.1;
    velocityDir.y += (0 - velocityDir.y) * 0.1;
  }
  prevPos.copy(mesh.position);

  const clampedSpeed = Math.min(moveSpeed * 0.02, 0.08);
  smoothVelo += (clampedSpeed - smoothVelo) * 0.08;
  const visibleVelo = smoothVelo;
  customPass.uniforms.uVelo.value = visibleVelo;
  customPass.uniforms.uStrength.value = 0.012 + visibleVelo * 1.25;
  targetSpeed *= 0.999;

  const shiftAmount = 0.04 + visibleVelo * 0.6;
  const shiftedMouse = followMouse
    .clone()
    .add(
      new THREE.Vector2(
        velocityDir.x * shiftAmount * aspectRatio,
        velocityDir.y * shiftAmount,
      ),
    );
  shiftedMouse.x = Math.min(Math.max(shiftedMouse.x, 0.0), 1.0);
  shiftedMouse.y = Math.min(Math.max(shiftedMouse.y, 0.0), 1.0);
  customPass.uniforms.uMouse.value.copy(shiftedMouse);

  const targetRotY = (followMouse.x - 0.5) * 0.35;
  const targetRotX = (followMouse.y - 0.5) * -0.25;
  mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.04;
  mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.04;

  if (composer) composer.render();
  frameId = requestAnimationFrame(animate);
};

const init = () => {
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 1);
  renderer.outputEncoding = THREE.sRGBEncoding;

  container.value.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  camera.position.set(0, 0, 450);

  geometry = new THREE.SphereGeometry(1, 64, 64);
  const baseMaterial = new THREE.MeshBasicMaterial({ color: 0xffe15a });
  mesh = new THREE.Mesh(geometry, baseMaterial);
  mesh.scale.setScalar(90);
  scene.add(mesh);

  const loader = new THREE.TextureLoader();
  loader.load(props.textureUrl, (texture) => {
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    baseMaterial.map = texture;
    baseMaterial.needsUpdate = true;
  });

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  customPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      distort: { value: 0 },
      resolution: {
        value: new THREE.Vector2(1, window.innerHeight / window.innerWidth),
      },
      uMouse: { value: new THREE.Vector2(-10, -10) },
      uVelo: { value: 0 },
      uRadius: { value: 0.22 },
      uFeather: { value: 0.12 },
      uStrength: { value: 0.04 },
      uScale: { value: 0 },
      uType: { value: 2 },
      time: { value: 0 },
    },
    vertexShader: postVertex,
    fragmentShader: postFragment,
  });
  customPass.renderToScreen = true;
  composer.addPass(customPass);

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove);

  resize();
  animate();
};

onMounted(init);

onBeforeUnmount(() => {
  if (frameId) cancelAnimationFrame(frameId);
  window.removeEventListener("resize", resize);
  window.removeEventListener("pointermove", onPointerMove);

  if (geometry) geometry.dispose();
  if (mesh?.material?.map) mesh.material.map.dispose();
  if (mesh?.material) mesh.material.dispose();
  if (renderer) renderer.dispose();
  if (renderer?.domElement && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
});
</script>

<style scoped>
.glitch-sphere {
  width: 100%;
  height: 100vh;
  z-index: 10;
  position: relative;
}
</style>
