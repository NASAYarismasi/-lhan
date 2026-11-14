import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { canvasTexture, seeded } from './primitives.js';
import { disposeScene } from './dispose.js';

/** Owns cached resources; scenes clone materials before changing them. */
export async function loadAssets(onProgress = () => {}) {
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco), textureLoader = new THREE.TextureLoader();
  const assets = { models: {}, textures: {}, failures: [] }; let done = 0;
  await Promise.allSettled([
    ...['sls', 'orion', 'astronaut'].map(async id => {
      try { assets.models[id] = (await loader.loadAsync(`/assets/${id}.glb`)).scene; }
      catch { assets.failures.push(id); }
      onProgress(++done, 7);
    }),
    ...['earth-day', 'earth-night', 'mars-color', 'stars'].map(async id => {
      try {
        const t = await textureLoader.loadAsync(`/textures/${id}.jpg`);
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; assets.textures[id] = t;
      } catch { assets.failures.push(id); }
      onProgress(++done, 7);
    })
  ]);
  const rand = seeded(180);
  for (const id of ['earth-day', 'earth-night', 'mars-color', 'stars']) if (!assets.textures[id]) {
    assets.textures[id] = canvasTexture(1024, 512, (c, w, h) => {
      c.fillStyle = id === 'earth-day' ? '#143c62' : id === 'mars-color' ? '#a46c48' : '#000'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 6000; i++) {
        c.fillStyle = id === 'mars-color' ? `rgba(60,29,16,${rand() * .1})` : id === 'earth-day' ? `rgba(143,153,112,${rand() * .08})` : '#aabbd0';
        if (id === 'stars') c.fillRect(rand() * w, rand() * h, rand() < .05 ? 1 : .3, .7);
        else if (id !== 'earth-night') { c.beginPath(); c.ellipse(rand() * w, rand() * h, 1 + rand() * 20, 1 + rand() * 9, 0, 0, Math.PI * 2); c.fill(); }
      }
    });
  }
  assets.textures.clouds = canvasTexture(1024, 512, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const x = rand() * w, y = rand() * h, r = 4 + rand() * 38;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${rand() * .38})`); g.addColorStop(1, 'transparent');
      c.save(); c.translate(x, y); c.scale(1, .35); c.translate(-x, -y); c.fillStyle = g; c.fillRect(x-r,y-r,2*r,2*r); c.restore();
    }
  }, false);
  for (const t of Object.values(assets.textures)) t.userData.shared = true;
  for (const model of Object.values(assets.models)) model.traverse(m=>{
    if(m.geometry)m.geometry.userData.shared=true;
    for(const mat of Array.isArray(m.material)?m.material:m.material?[m.material]:[])for(const t of Object.values(mat))if(t?.isTexture)t.userData.shared=true;
  });
  assets.dispose = () => {
    for (const model of Object.values(assets.models)) disposeScene(model,true);
    for (const texture of Object.values(assets.textures)) texture.dispose(); draco.dispose();
  };
  return assets;
}
