import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import './style.css';

const get = id => document.getElementById(id);
const viewport = get('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
viewport.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, .04, 1800);
scene.add(camera);
camera.rotation.order = 'YXZ';
const light = new THREE.DirectionalLight(0xfff1de, 3.1);
light.position.set(5, 10, 8);
scene.add(light, new THREE.HemisphereLight(0xe5f6ff, 0x726658, 2.5));
const pad = new THREE.Group();
const rocketRig = new THREE.Group();
const cabin = new THREE.Group();
pad.add(rocketRig);
scene.add(pad, cabin);

function box(parent, dimensions, position, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), new THREE.MeshStandardMaterial({ color }));
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}
box(pad, [1300, 1, 1300], [0, -.6, 0], 0x68796d);
box(pad, [55, 2, 50], [0, 1, 0], 0x343f42);
for (const x of [-26, -18]) {
  for (const z of [-10, -2]) box(pad, [1.4, 77, 1.4], [x, 38.5, z], 0x303e44);
}
for (let y = 8; y < 77; y += 9) box(pad, [10, 1.15, 10], [-22, y, -6], 0x4c5c61);
for (const x of [-14, -7, 0, 7, 14]) box(pad, [1, .05, 12], [x, 2.03, 12], 0xffbc56);

box(cabin, [7, .2, 5], [0, -.19, 0], 0x667a7f);
box(cabin, [7, 3.3, .15], [0, 1.5, -2.5], 0x394d57);
for (const x of [-2, 0, 2]) {
  box(cabin, [1.06, 1.4, .24], [x, 1, -.8], 0x435d69);
  box(cabin, [1.08, .24, .82], [x, .4, -.42], 0x435d69);
  box(cabin, [1.08, .52, .07], [x, 2.35, -2.39], 0x142c36);
}

const launchPanel = box(pad, [.85, 1.25, .55], [0, 2.625, 19], 0x243c40);
const cabinPanel = box(cabin, [.75, 1.05, .36], [0, .435, .65], 0x243c40);
const wrist = box(camera, [.2, .14, .1], [.25, -.21, -.48], 0x293c3a);
box(wrist, [.16, .10, .01], [0, .076, .012], 0x9be980).material.emissive.set(0x5aa63a);
wrist.rotation.x = -.6;
wrist.visible = false;
function indicator(parent, position) {
  const mesh = box(parent, [.58, .27, .025], position, 0xa9ed62);
  mesh.material.emissive.set(0x558f37);
  return mesh;
}
indicator(launchPanel, [0, .34, .29]);
const powerLamp = indicator(cabinPanel, [0, .34, .19]);
box(cabin, [.18, 2.65, 4.8], [-3.5, 1.23, -.1], 0x394d57);
box(cabin, [.18, 2.65, 4.8], [3.5, 1.23, -.1], 0x394d57);
box(cabin, [7, .14, 4.8], [0, 2.5, -.1], 0x34464d);
box(cabin, [7, 2.64, .16], [0, 1.23, 2.36], 0x394d57);
for (const x of [-2.35, 0, 2.35]) {
  box(cabin, [.95, .065, .14], [x, 2.39, .5], 0xaaccaa).material.emissive.set(0x8ecb9e);
}

function fit(model, height) {
  const bounds = new THREE.Box3().setFromObject(model);
  const pivot = new THREE.Group();
  model.position.sub(bounds.getCenter(new THREE.Vector3()));
  pivot.add(model);
  pivot.scale.setScalar(height / bounds.getSize(new THREE.Vector3()).y);
  return pivot;
}

let mode = 'ready';
let ready = false;
let elapsed = 0;
let watchOpen = false;
let powerRestored = false;
const held = new Set();
let active = false;
const status = {
  ready: 'Roket kalkışa hazır.',
  launch: 'Roket rampadan ayrılıyor.',
  transfer: 'Üç astronot Mars transferine geçti.'
};
const objective = { ready: 'Kalkışı başlat', launch: 'Kalkışı izle', transfer: 'Kabin verilerini kontrol et' };

function setView(next) {
  mode = next;
  const inside = mode === 'transfer';
  pad.visible = !inside;
  cabin.visible = inside;
  scene.background = new THREE.Color(inside ? 0x101b2a : 0x91aeb8);
  scene.fog = inside ? null : new THREE.Fog(0x91aeb8, 250, 650);
  camera.position.set(...(inside ? [0, 1.53, 2.04] : [0, 3.66, 24.2]));
  camera.rotation.set(inside ? -.15 : -.04, 0, 0);
  powerRestored = false;
  powerLamp.material.emissive.set(0xa82b12);
  rocketRig.position.y = 0;
  get('label').textContent = inside ? 'TRANSFER / MÜRETTEBAT KABİNİ' : 'DÜNYA / FIRLATMA RAMPASI';
  get('status').textContent = status[mode];
  get('reset-btn').hidden = !inside;
  
}

function setWatch(open) {
  watchOpen = open;
  get('watch').hidden = !open;
  get('watch-btn').textContent = open ? 'Kol bilgisayarını kapat' : 'Kol bilgisayarını aç';
  get('watch-btn').setAttribute('aria-expanded', String(open));
  wrist.visible = open;
}

function nearPanel() {
  const panel = mode === 'ready' ? launchPanel : cabinPanel;
  return Math.hypot(camera.position.x - panel.position.x, camera.position.z - panel.position.z) <= (mode === 'ready' ? 2.1 : 1.05);
}

function interact() {
  if (!active || !nearPanel()) return;
  if (mode === 'ready') {
    elapsed = 0;
    setView('launch');
  } else if (mode === 'transfer' && !powerRestored) {
    powerRestored = true;
    powerLamp.material.emissive.set(0x558f37);
    get('status').textContent = 'Kabin gücü geri geldi. Görev bilgisayarını kontrol et.';
  }
}

function move(dt) {
  const inside = mode === 'transfer';
  const horizontal = Number(held.has('KeyD')) - Number(held.has('KeyA'));
  const forward = Number(held.has('KeyW')) - Number(held.has('KeyS'));
  const turn = Number(held.has('ArrowLeft')) - Number(held.has('ArrowRight'));
  const pitch = Number(held.has('ArrowUp')) - Number(held.has('ArrowDown'));
  look(turn * dt * 1.7, pitch * dt * 1.35);
  if (!(horizontal || forward)) return;
  const speed = inside ? 2.2 : held.has('ShiftLeft') ? 8 : 4.5;
  const distance = speed * dt / Math.hypot(horizontal, forward);
  const yaw = camera.rotation.y;
  const x = camera.position.x + (Math.cos(yaw) * horizontal - Math.sin(yaw) * forward) * distance;
  const z = camera.position.z + (-Math.sin(yaw) * horizontal - Math.cos(yaw) * forward) * distance;
  const blockers = inside
    ? [{ x: 0, z: .65, width: .6, depth: .4 }]
    : [{ x: 0, z: 0, width: 10, depth: 10 }, { x: 0, z: 19, width: .68, depth: .52 }];
  const collides = (nx, nz) => blockers.some(obstacle =>
    Math.abs(nx - obstacle.x) < obstacle.width && Math.abs(nz - obstacle.z) < obstacle.depth);
  const nextX = THREE.MathUtils.clamp(x, inside ? -3.15 : -16, inside ? 3.15 : 16);
  const nextZ = THREE.MathUtils.clamp(z, inside ? .38 : 11, inside ? 2.07 : 24.6);
  if (!collides(nextX, camera.position.z)) camera.position.x = nextX;
  if (!collides(camera.position.x, nextZ)) camera.position.z = nextZ;
}

function look(yaw, pitch) {
  camera.rotation.y += yaw;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x + pitch, -1.25, 1.25);
}

function update(dt) {
  if (mode !== 'ready') elapsed += dt;
  if (mode === 'launch') {
    rocketRig.position.y = elapsed ** 2 * 2.5;
    camera.rotation.x = .12 + elapsed * .12;
    if (elapsed >= 6) setView('transfer');
  } else if (active) {
    move(dt);
  }
  const seconds = Math.floor(elapsed);
  get('mission-time').textContent = 'T+ ' + String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  get('objective').textContent = missionObjective();
  const hint = !active ? '' : mode === 'launch' ? 'Kalkış sürüyor' :
    mode === 'ready' ? (nearPanel() ? 'E · Kalkışı başlat' : 'W · Yeşil kalkış paneline yaklaş') :
    powerRestored ? 'Q · Görev bilgisayarını kontrol et' :
    nearPanel() ? 'E · Kabin gücünü geri getir' : 'Kırmızı güç paneline yaklaş';
  if (get('prompt').textContent !== hint) get('prompt').textContent = hint;
}

function missionObjective() {
  if (mode === 'transfer') return powerRestored ? 'Kabin gücü aktif' : 'Kabin gücünü geri getir';
  return objective[mode];
}

get('start-btn').onclick = () => {
  active = true;
  get('intro').hidden = true;
  renderer.domElement.focus();
};
get('reset-btn').onclick = () => {
  elapsed = 0;
  held.clear();
  setWatch(false);
  setView('ready');
  renderer.domElement.focus();
};
get('watch-btn').onclick = () => setWatch(!watchOpen);
renderer.domElement.tabIndex = 0;
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft']);
window.addEventListener('keydown', event => {
  if (!active || event.ctrlKey || event.metaKey || event.altKey) return;
  if (movementKeys.has(event.code)) {
    event.preventDefault();
    held.add(event.code);
  }
  if (event.repeat) return;
  if (event.code === 'KeyE') interact();
  if (event.code === 'KeyQ') setWatch(!watchOpen);
  if (event.code === 'Escape') held.clear();
  if (event.code === 'KeyF') {
    const task = document.fullscreenElement ? document.exitFullscreen() : document.querySelector('main').requestFullscreen();
    task.catch(() => {});
  }
});
window.addEventListener('keyup', event => held.delete(event.code));
window.addEventListener('blur', () => held.clear());
const canvas = renderer.domElement;
canvas.addEventListener('click', () => {
  if (!active || document.pointerLockElement === canvas) return;
  try {
    canvas.requestPointerLock?.()?.catch(() => {});
  } catch {
    // Drag and arrow keys remain available in embedded browsers.
  }
});
canvas.addEventListener('pointermove', event => {
  if (!active || mode === 'launch') return;
  if (document.pointerLockElement === canvas || event.buttons === 1) {
    look(-event.movementX * .003, -event.movementY * .003);
  }
});
new ResizeObserver(() => {
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
}).observe(viewport);
setView('ready');
get('status').textContent = 'NASA modelleri yükleniyor…';
const draco = new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL + 'draco/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const asset = name => loader.loadAsync(import.meta.env.BASE_URL + 'assets/' + name + '.glb');
Promise.all([asset('sls'), asset('orion'), asset('astronaut')]).then(([sls, orion, astronaut]) => {
  const rocket = fit(sls.scene, 98);
  rocket.position.y = 51;
  rocketRig.add(rocket);
  const capsule = fit(orion.scene, .48);
  capsule.position.set(2.85, 1.02, .12);
  box(cabin, [.68, .08, .62], [2.85, .72, .12], 0x435d69);
  capsule.rotation.x = -.65;
  cabin.add(capsule);
  for (const x of [-2, 0, 2]) {
    const person = fit(astronaut.scene.clone(), 1.7);
    person.position.set(x, 1.13, .14);
    cabin.add(person);
  }
  ready = true;
  get('start-btn').disabled = false;
  get('watch-btn').disabled = false;
  setView('ready');
}).catch(error => {
  get('status').textContent = 'Model yüklenemedi. Sayfayı yenileyip tekrar dene.';
  console.error(error);
});

let previous = performance.now();
let manualTime = false;
function render() {

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(now => {
  if (!manualTime) update(Math.min((now - previous) / 1000, .05));
  previous = now;
  render();
});
window.advanceTime = ms => {
  manualTime = true;
  for (let left = ms / 1000; left > 0; left -= 1 / 60) update(Math.min(left, 1 / 60));
  render();
};
window.render_game_to_text = () => JSON.stringify({
  mode, ready, elapsedSeconds: Math.floor(elapsed), crew: 3, watchOpen,
  objective: missionObjective(), active, powerRestored, nearPanel: nearPanel(),
  position: { x: camera.position.x, z: camera.position.z }, rocketHeightMeters: Math.round(rocketRig.position.y),
  coordinates: 'Metre, Y yukarı'
});
