import * as THREE from 'three';
import { material, noiseTexture, seeded } from './primitives.js';
export function createTerrain() {
  const group=new THREE.Group(),geo=new THREE.PlaneGeometry(24000,24000,128,128);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
  // GAME ASSUMPTION: seeded rock field / cratered terrain, not a surveyed landing site DEM.
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z),f=Math.min(1,Math.max(0,(r-40)/800));const h=(Math.sin(x*.0018)*Math.cos(z*.0014)*105+Math.sin(x*.008+z*.006)*19+Math.sin(x*.029-z*.02)*4)*f;p.setY(i,h);}
  geo.computeVertexNormals();const mat=material(0xac7953,.97,0);mat.map=noiseTexture('#ba9169',2);mat.map.repeat.set(180,180);mat.bumpMap=mat.map;mat.bumpScale=.3;
  const terrain=new THREE.Mesh(geo,mat);terrain.receiveShadow=true;group.add(terrain);
  const random=seeded(234),rockGeo=new THREE.DodecahedronGeometry(1,0),rocks=new THREE.InstancedMesh(rockGeo,material(0x77604c,.95,0),900),dummy=new THREE.Object3D();
  for(let i=0;i<900;i++){const a=random()*Math.PI*2,r=12+random()**2*1500;dummy.position.set(Math.cos(a)*r,-.2,Math.sin(a)*r);const k=.3+random()**3*3;dummy.scale.set(k,k*.6,k*.8);dummy.rotation.set(random()*2,random()*6,random()*2);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;group.add(rocks);
  return {group,update(s){group.visible=s.mars&&(s.altitude??1e6)<25000;group.position.y=-(s.altitude??0);}};
}
