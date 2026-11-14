import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { disposeScene } from './dispose.js';

export function createLaunchScene(viewport, flightScene, onLoaded, onError) {
let disposed = false;
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

const plume = new THREE.Group();
const plumeMaterials = [
  new THREE.MeshBasicMaterial({ color: 0xff602b, transparent: true, opacity: .56, blending: THREE.AdditiveBlending, depthWrite: false }),
  new THREE.MeshBasicMaterial({ color: 0xffe296, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })
];
for (const x of [-6.9, 0, 6.9]) {
  for (let layer = 0; layer < 2; layer++) {
    const length = layer ? 8 : 20;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(layer ? .95 : 2.15, length, 20, 1, true), plumeMaterials[layer]);
    flame.rotation.z = Math.PI;
    flame.position.set(x, -length / 2, 0);
    plume.add(flame);
  }
}
plume.position.y = 1.8;
plume.visible = false;
rocketRig.add(plume);
const smoke = new THREE.Group();
const smokeGeometry = new THREE.IcosahedronGeometry(1, 1);
const smokeMaterial = new THREE.MeshStandardMaterial({ color: 0xc5c6bb, transparent: true, opacity: .28, depthWrite: false });
for (let i = 0; i < 55; i++) {
  const puff = new THREE.Mesh(smokeGeometry, smokeMaterial);
  puff.userData.angle = i * 2.39996;
  smoke.add(puff);
}
pad.add(smoke);
smoke.visible = false;
const tracking = new THREE.PerspectiveCamera(44, 1, .1, 1800);

function fit(model, height) {
  const bounds = new THREE.Box3().setFromObject(model);
  const pivot = new THREE.Group();
  model.position.sub(bounds.getCenter(new THREE.Vector3()));
  pivot.add(model);
  pivot.scale.setScalar(height / bounds.getSize(new THREE.Vector3()).y);
  return pivot;
}

const draco = new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL + 'draco/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const asset = name => loader.loadAsync(import.meta.env.BASE_URL + 'assets/' + name + '.glb');
Promise.all([asset('sls'), asset('orion'), asset('astronaut')]).then(([sls, orion, astronaut]) => {
  if (disposed) { for (const model of [sls, orion, astronaut]) disposeScene(model.scene); return; }
  const rocket = fit(sls.scene, 98);
  rocket.position.y = 51;
  rocketRig.add(rocket);
  flightScene.capsule.add(fit(orion.scene.clone(), 1.2));
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
  onLoaded();
}).catch(error => {
  if (!disposed) onError(error);
});


  function reset(inside = false) {
    pad.position.y = 0; rocketRig.position.y = 0; rocketRig.rotation.z = 0;
    camera.position.set(...(inside ? [0, 1.53, 2.04] : [0, 3.66, 24.2]));
    camera.rotation.set(inside ? -.15 : -.04, 0, 0);
  }
  function look(yaw, pitch) {
    camera.rotation.y += yaw;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x + pitch, -1.25, 1.25);
  }
  function move(input, dt, inside) {
    const horizontal = Number(input.isDown('right')) - Number(input.isDown('left'));
    const forward = Number(input.isDown('forward')) - Number(input.isDown('back'));
    look((Number(input.isDown('lookLeft')) - Number(input.isDown('lookRight'))) * dt * 1.7,
      (Number(input.isDown('lookUp')) - Number(input.isDown('lookDown'))) * dt * 1.35);
    if (!(horizontal || forward)) return;
    const speed = inside ? 2.2 : input.isDown('sprint') ? 8 : 4.5;
    const distance = speed * dt / Math.hypot(horizontal, forward), yaw = camera.rotation.y;
    const x = camera.position.x + (Math.cos(yaw) * horizontal - Math.sin(yaw) * forward) * distance;
    const z = camera.position.z + (-Math.sin(yaw) * horizontal - Math.cos(yaw) * forward) * distance;
    const blockers = inside ? [{ x: 0, z: .65, width: .6, depth: .4 }] :
      [{ x: 0, z: 0, width: 10, depth: 10 }, { x: 0, z: 19, width: .68, depth: .52 }];
    const collides = (nx, nz) => blockers.some(o => Math.abs(nx-o.x)<o.width && Math.abs(nz-o.z)<o.depth);
    const nx = THREE.MathUtils.clamp(x, inside ? -3.15 : -16, inside ? 3.15 : 16);
    const nz = THREE.MathUtils.clamp(z, inside ? .38 : 11, inside ? 2.07 : 24.6);
    if (!collides(nx,camera.position.z)) camera.position.x=nx;
    if (!collides(camera.position.x,nz)) camera.position.z=nz;
  }
  function nearPanel(inside) {
    const panel = inside ? cabinPanel : launchPanel;
    return Math.hypot(camera.position.x-panel.position.x,camera.position.z-panel.position.z)<=(inside?1.05:2.1);
  }
  function draw(stage, view, telemetry, alpha, previousTelemetry) {
    const width=viewport.clientWidth, height=viewport.clientHeight;
    if (renderer.domElement.width !== Math.floor(width*renderer.getPixelRatio()) || renderer.domElement.height !== Math.floor(height*renderer.getPixelRatio())) renderer.setSize(width,height);
    camera.aspect=width/height; camera.updateProjectionMatrix();
    const inside = stage !== 'ready' && view === 'inside';
    pad.visible=!inside; cabin.visible=inside;
    scene.background=new THREE.Color(inside?0x101b2a:0x91aeb8);
    scene.fog=inside?null:new THREE.Fog(0x91aeb8,250,650);
    if(stage==='launch') {
      const h=THREE.MathUtils.lerp(previousTelemetry.altitude??0,telemetry.altitude,alpha);
      // Floating origin: meshes and camera stay close to zero; simulation remains in SI.
      const origin=Math.max(0,h-200);
      rocketRig.position.y=h; pad.position.y=-origin;
      rocketRig.rotation.z=(telemetry.pitch??Math.PI/2)-Math.PI/2;
      plume.visible=telemetry.engineFiring; smoke.visible=h<150;
      plume.scale.y=.7+.3*telemetry.throttle;
      smoke.children.forEach((p,i)=>{const a=p.userData.angle,r=(1+Math.min(h,100)*.2)*Math.sqrt(i/55);p.position.set(Math.cos(a)*r,3+(i%9)*.48,Math.sin(a)*r);p.scale.setScalar(.55+(i%8)*.21+Math.min(h,100)*.02);});
      tracking.position.set(105,60+h-origin,151);tracking.lookAt(0,43+h-origin,0);
      tracking.aspect=camera.aspect;tracking.updateProjectionMatrix();
    }
    if(stage==='ready'||inside) renderer.render(scene,camera);
    else if(stage==='launch') renderer.render(scene,tracking);
    else flightScene.draw(renderer,stage,telemetry,view==='map');
  }
  reset();
  return {renderer,camera,canvas:renderer.domElement,draw,move,look,nearPanel,reset,
    setWatch(open){wrist.visible=open;},
    setPower(on){powerLamp.material.emissive.set(on?0x558f37:0xa82b12);},
    dispose(){if(disposed)return;disposed=true;draco.dispose();disposeScene(scene);renderer.dispose();renderer.domElement.remove();}
  };
}
