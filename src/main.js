import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const get = id => document.getElementById(id);
const viewport = get('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
viewport.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, .1, 1800);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
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
let wrist;
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
  controls.minDistance = inside ? 1.5 : 50;
  controls.maxDistance = inside ? 11 : 290;
  camera.position.set(...(inside ? [2.15, 2.5, 6.5] : [112, 65, 158]));
  controls.target.set(...(inside ? [0, 1.1, -.2] : [-5, 47, 0]));
  rocketRig.position.y = 0;
  get('label').textContent = inside ? 'TRANSFER / MÜRETTEBAT KABİNİ' : 'DÜNYA / FIRLATMA RAMPASI';
  get('status').textContent = status[mode];
  get('start-btn').textContent = inside ? 'Görevi sıfırla' : 'Kalkışı başlat';
  get('start-btn').disabled = !ready || mode === 'launch';
}

function setWatch(open) {
  watchOpen = open;
  get('watch').hidden = !open;
  get('watch-btn').textContent = open ? 'Kol bilgisayarını kapat' : 'Kol bilgisayarını aç';
  get('watch-btn').setAttribute('aria-expanded', String(open));
  if (wrist) wrist.scale.setScalar(open ? 1.3 : 1);
}

function update(dt) {
  if (mode !== 'ready') elapsed += dt;
  if (mode === 'launch') {
    rocketRig.position.y = elapsed ** 2 * 2.5;
    controls.target.y = 47 + rocketRig.position.y * .75;
    camera.position.y += dt * elapsed * 4;
    if (elapsed >= 6) setView('transfer');
  }
  const seconds = Math.floor(elapsed);
  get('mission-time').textContent = 'T+ ' + String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  get('objective').textContent = objective[mode];
}
get('start-btn').onclick = () => {
  elapsed = 0;
  if (mode === 'transfer') setWatch(false);
  setView(mode === 'transfer' ? 'ready' : 'launch');
};
get('watch-btn').onclick = () => setWatch(!watchOpen);
window.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'f') {
    const task = document.fullscreenElement ? document.exitFullscreen() : viewport.requestFullscreen();
    task.catch(console.error);
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
    if (x === 0) {
      wrist = box(cabin, [.21, .16, .12], [.67, 1.38, .34], 0x233432);
      const screen = box(wrist, [.17, .12, .014], [0, 0, .067], 0x96bd5a);
      screen.material.emissive.set(0x9fec57);
      wrist.userData.watch = true;
      screen.userData.watch = true;
    }
  }
  ready = true;
  get('watch-btn').disabled = false;
  setView('ready');
}).catch(error => {
  get('status').textContent = 'Model yüklenemedi. Sayfayı yenileyip tekrar dene.';
  console.error(error);
});

const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('click', event => {
  if (mode !== 'transfer') return;
  const rect = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(
    (event.clientX - rect.left) / rect.width * 2 - 1,
    1 - (event.clientY - rect.top) / rect.height * 2
  ), camera);
  if (ray.intersectObject(cabin)[0]?.object.userData.watch) setWatch(!watchOpen);
});

let previous = performance.now();
let manualTime = false;
function render() {
  controls.update();
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
  objective: objective[mode], rocketHeightMeters: Math.round(rocketRig.position.y),
  coordinates: 'Metre, Y yukarı'
});
