import * as THREE from 'three';
import { createMarsLander, createMarsHeatShield } from './marsLander.js';
import { box, cylinder, material, canvasTexture } from './primitives.js';

const PARTS = { srbLeft: [-6.4,27,0], srbRight:[6.4,27,0], core:[0,33,0], icps:[0,73,0], orion:[0,84,0], las:[0,94,0] };

/** Split the monolithic NASA mesh by geometric region into independently disposable stage meshes. */
function splitSLS(model) {
  const source = model.clone(true); source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const scale = 98 / size.y, buckets = Object.fromEntries(Object.keys(PARTS).map(id=>[id,{p:[],n:[],c:[]} ]));
  const pos = new THREE.Vector3(), norm = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
  source.traverse(m => {
    if (!m.isMesh) return;
    const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone(), p=g.attributes.position,n=g.attributes.normal;
    normalMatrix.getNormalMatrix(m.matrixWorld);
    for(let i=0;i<p.count;i+=3) {
      const triangle=[];
      for(let j=0;j<3;j++) {pos.fromBufferAttribute(p,i+j).applyMatrix4(m.matrixWorld);pos.x=(pos.x-center.x)*scale;pos.z=(pos.z-center.z)*scale;pos.y=(pos.y-bounds.min.y)*scale;triangle.push(pos.clone());}
      const c=triangle[0].clone().add(triangle[1]).add(triangle[2]).multiplyScalar(1/3);
      const id=Math.abs(c.x)>4.4&&c.y<61?(c.x<0?'srbLeft':'srbRight'):c.y<66?'core':c.y<80?'icps':c.y<90?'orion':'las';
      const b=buckets[id], pivot=PARTS[id];
      let color=new THREE.Color(id==='core'&&c.y>9&&c.y<62?0xbd6d33:0xe1e0d5);
      if(c.y<4)color.set(0x485054);
      if((id.startsWith('srb')&&[12,23,34,45].some(y=>Math.abs(c.y-y)<.16))||id==='core'&&(Math.abs(c.y-18)<.22||Math.abs(c.y-55)<.22))color.set(0x5c5548);
      for(let j=0;j<3;j++) {b.p.push(triangle[j].x-pivot[0],triangle[j].y-pivot[1],triangle[j].z-pivot[2]);norm.fromBufferAttribute(n,i+j).applyMatrix3(normalMatrix).normalize();b.n.push(...norm.toArray());b.c.push(color.r,color.g,color.b);}
    }g.dispose();
  });
  return Object.fromEntries(Object.entries(buckets).map(([id,b])=>{
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));
    const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.64,metalness:.18}));m.castShadow=true;m.receiveShadow=true;return [id,m];
  }));
}
export function createVehicle(assets) {
  const group=new THREE.Group(), sls=new THREE.Group(), capsule=new THREE.Group(), lander=createMarsLander();group.add(sls,capsule,lander);
  const white=material(0xdedfd7,.55,.25), black=material(0x202c35,.5,.6), parts={};
  const split=assets.models.sls?splitSLS(assets.models.sls):{};
  for(const [id,pivot] of Object.entries(PARTS)) {
    const part=new THREE.Group();part.position.fromArray(pivot);parts[id]=part;sls.add(part);
    if(split[id]) {
      const lod=new THREE.LOD();lod.autoUpdate=false;lod.addLevel(split[id],0);
      const height=id.startsWith('srb')?54:id==='core'?66:id==='icps'?14:id==='orion'?8:8;
      const proxy=new THREE.Mesh(new THREE.CylinderGeometry(id==='las'?.2:id.startsWith('srb')?1.8:3.9,id.startsWith('srb')?1.8:4.2,height,12),id==='core'?material(0xb8703c):white);
      lod.addLevel(proxy,2500);part.add(lod);
    } else cylinder(part,id.startsWith('srb')?1.8:4,id.startsWith('srb')?1.8:4,id.startsWith('srb')?54:id==='core'?66:10,id==='core'?material(0xb8703c):white,[0,0,0]);
  }
  // Lettering is original typography, without NASA insignia.
  const lettering=canvasTexture(256,1024,c=>{c.fillStyle='#e9e7db';c.fillRect(0,0,256,1024);c.fillStyle='#172432';c.font='bold 110px sans-serif';for(const [i,s]of [...'USA'].entries())c.fillText(s,85,300+i*150);c.fillStyle='#aa4b3f';c.fillRect(80,80,100,52);});
  for(const x of [-6.4,6.4]) {const decal=new THREE.Mesh(new THREE.PlaneGeometry(1.5,6),new THREE.MeshStandardMaterial({map:lettering,roughness:.75,side:THREE.DoubleSide}));decal.position.set(x,37,1.82);parts[x<0?'srbLeft':'srbRight'].add(decal);decal.position.sub(new THREE.Vector3(...PARTS[x<0?'srbLeft':'srbRight']));}
  // Orbital Orion/service module; real capsule is retained as a detail mesh.
  cylinder(capsule,2.4,2.6,4.5,white,[0,1,0]);cylinder(capsule,1.3,2.5,2.5,white,[0,4.5,0]);cylinder(capsule,.7,1.1,1.5,black,[0,-2,0]);
  if(assets.models.orion) {const detail=assets.models.orion.clone(true);detail.rotation.x=-Math.PI/2;detail.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(detail),sz=b.getSize(new THREE.Vector3());detail.scale.setScalar(5/Math.max(sz.x,sz.z));detail.position.y=5;detail.traverse(m=>{if(m.isMesh){m.material=white.clone();m.castShadow=true;}});capsule.add(detail);}
  for(const sign of [-1,1]) {const p=box(capsule,[10,.08,3],material(0x182c4b,.36,.55),[sign*7,1,0]);for(let x=-4;x<5;x++)box(p,[.025,.01,3],material(0x6a819c),[x,.05,0]);}
  const aeroshell=createMarsHeatShield();aeroshell.position.y=1.6;lander.add(aeroshell);
  const gear=lander.getObjectByName('landing-gear'),ladder=lander.getObjectByName('crew-ladder');
  const legAxes=Array.from({length:4},(_,i)=>{const a=i*Math.PI/2+Math.PI/4;return new THREE.Vector3(-Math.sin(a),0,Math.cos(a));});
  return { group, parts, sls, capsule, lander,
    update(state,onboard=false,camera) {
      const launch=['PRELAUNCH','ASCENT'].includes(state.phase);
      const descending=state.events.some(e=>e.type==='HEATSHIELD_JETTISON'||e.type==='SRP_IGNITION')||state.phase==='LANDED';
      aeroshell.visible=!descending;gear.visible=descending;ladder.visible=state.phase==='LANDED';
      const deploy=state.events.find(e=>e.type==='LEGS_DEPLOYED');
      // GAME ASSUMPTION: three-second mechanical deployment, driven by the sim event clock.
      const fraction=state.phase==='LANDED'?1:deploy?THREE.MathUtils.smoothstep(state.missionTime-deploy.time,0,3):0;
      gear.children.forEach((leg,i)=>leg.quaternion.setFromAxisAngle(legAxes[i],-2.25*(1-fraction)));
      sls.visible=launch&&!onboard; capsule.visible=!launch&&!state.mars&&!onboard; lander.visible=state.mars&&!onboard;
      sls.rotation.z=state.attitude+state.theta;capsule.rotation.z=launch?0:state.attitude+state.theta;
      lander.rotation.z=state.phase==='EDL'?(state.engineFiring?state.thrustAngle??0:Math.atan2(Math.sqrt(Math.max(0,state.surfaceVelocity**2-state.verticalSpeed**2)),-state.verticalSpeed)):0;
      const heat=Math.min(1,(state.heatFlux??0)/60000);
      aeroshell.traverse(m=>{if(m.isMesh){m.material.emissive.setRGB(heat*.9,heat*.085,heat*.005);}});
      for(const id of ['srbLeft','srbRight'])parts[id].visible=state.stages.find(s=>s.id==='srb').attached;
      parts.core.visible=state.stages.find(s=>s.id==='core').attached;parts.las.visible=state.lasAttached;
      // Keep the retained upper stack near the floating origin after the lower stack separates.
      sls.position.set(0,parts.core.visible?0:-70,0).applyAxisAngle(new THREE.Vector3(0,0,1),sls.rotation.z);
      if(camera)sls.traverse(m=>{if(m.isLOD){const distance=camera.position.length()*Math.tan(camera.fov*Math.PI/360)/Math.tan(Math.PI/8);m.levels[0].object.visible=distance<2500;m.levels[1].object.visible=distance>=2500;}});
    },
    makeDebris(id) {const source=parts[id];const clone=source.clone(true);clone.traverse(m=>{if(m.isMesh){m.geometry=m.geometry.clone();m.material=m.material.clone();}});clone.position.set(0,0,0);return clone;}
  };
}
