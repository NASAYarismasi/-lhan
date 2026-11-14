import * as THREE from 'three';
import { box, cylinder, beam, material, canvasTexture, noiseTexture } from './primitives.js';

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
  const group=new THREE.Group(), sls=new THREE.Group(), capsule=new THREE.Group(), lander=new THREE.Group();group.add(sls,capsule,lander);
  const white=material(0xdedfd7,.55,.25), foil=material(0xb99752,.38,.7), black=material(0x202c35,.5,.6), parts={};
  foil.map=noiseTexture('#c8b580',49);foil.map.repeat.set(4,2);foil.bumpMap=foil.map;foil.bumpScale=.08;
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
  // GAME ASSUMPTION: original human Mars lander concept, sized to the
  // existing 15 m entry envelope. Visual hardware is not a second flight model.
  const graphite=material(0x29383e,.7,.45), thermal=material(0xc6cabe,.85,.15);
  const gear=new THREE.Group(),aeroshell=new THREE.Group();lander.add(gear,aeroshell);
  cylinder(lander,4.5,5.8,4.3,graphite,[0,5.65,0],16);
  cylinder(lander,3.05,4.5,2.4,thermal,[0,9,0],16);
  cylinder(lander,3.05,3.05,.65,foil,[0,10.52,0],32);
  cylinder(lander,1.25,1.25,.65,white,[0,11.16,0],32);
  cylinder(lander,.85,1.25,.3,black,[0,11.64,0],32);
  cylinder(lander,5.8,5.8,.35,foil,[0,3.65,0],48);
  cylinder(lander,4.3,4.8,1.05,foil,[0,2.95,0],32);
  // Faceted thermal panels and an equipment belt distinguish the habitat
  // from Orion. Windows sit above the wide descent propulsion deck.
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2;
    beam(lander,[Math.cos(a)*5.82,3.7,Math.sin(a)*5.82],[Math.cos(a)*4.52,7.8,Math.sin(a)*4.52],.035,foil);
    if(i%2===0){const panel=box(lander,[1.25,1.5,.16],thermal,[Math.sin(a)*4.95,6.1,Math.cos(a)*4.95]);panel.rotation.set(.27,a,0);}
  }
  const windows=material(0x0a2534,.12,.65);windows.emissive=new THREE.Color(0x163a4a);windows.emissiveIntensity=.35;
  for(let i=-1;i<=1;i++){const frame=box(lander,[1.12,.88,.14],black,[i*1.25,8.65,4.12-Math.abs(i)*.16]);box(frame,[.94,.69,.05],windows,[0,0,.09]);}
  const hatch=box(lander,[1.35,1.9,.14],white,[0,5.6,5.73]);box(hatch,[.7,.45,.04],windows,[0,.45,.1]);
  for(let y=1;y<5.3;y+=.43)beam(gear,[-.55,y,6.15],[.55,y,6.15],.045,white);
  for(const x of [-.65,.65])beam(gear,[x,.3,6.15],[x,5.3,6.15],.05,foil);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+Math.PI/4,x=Math.cos(a),z=Math.sin(a);
    beam(gear,[x*4.8,5,z*4.8],[x*8.5,.35,z*8.5],.19,graphite);
    beam(gear,[x*4.7,2.9,z*4.7],[x*8.5,.35,z*8.5],.105,foil);
    beam(gear,[x*6.4,3,z*6.4],[x*8.5,.35,z*8.5],.085,white);
    cylinder(gear,1,1.15,.22,graphite,[x*8.5,.11,z*8.5],16);
    const engineAngle=i*Math.PI/2,ex=Math.cos(engineAngle)*4.2,ez=Math.sin(engineAngle)*4.2;
    cylinder(lander,.35,.36,.65,foil,[ex,3.12,ez],24);
    const bell=new THREE.Mesh(new THREE.CylinderGeometry(.34,.82,1.45,32,1,true),black);bell.material=black.clone();bell.material.side=THREE.DoubleSide;bell.position.set(ex,2.225,ez);lander.add(bell);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.82,.045,8,32),foil);lip.rotation.x=Math.PI/2;lip.position.set(ex,1.5,ez);lander.add(lip);
  }
  // Entry-only heat shield and conical aeroshell; propulsion opens the deck.
  const shield=material(0x2f2520,.95,.05);shield.map=noiseTexture('#443129',39);shield.bumpMap=shield.map;shield.bumpScale=.08;
  cylinder(aeroshell,7.5,6.8,.7,shield,[0,1.6,0],64);
  cylinder(aeroshell,5.75,7.5,2.3,thermal,[0,3.1,0],64);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(7.48,.12,8,64),foil);rim.rotation.x=Math.PI/2;rim.position.y=1.95;aeroshell.add(rim);
  const insignia=canvasTexture(512,192,c=>{c.fillStyle='#cbd0c6';c.fillRect(0,0,512,192);c.fillStyle='#26393c';c.font='600 60px sans-serif';c.fillText('?NC? / 01',35,85);c.font='24px sans-serif';c.fillText('MARS ?N?? ARACI',38,136);});
  const decal=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.86),new THREE.MeshStandardMaterial({map:insignia,roughness:.8}));decal.position.set(0,7.25,4.73);lander.add(decal);
  return { group, parts, sls, capsule, lander,
    update(state,onboard=false,camera) {
      const launch=['PRELAUNCH','ASCENT'].includes(state.phase);
      const descending=state.events.some(e=>e.type==='SRP_IGNITION')||state.phase==='LANDED';aeroshell.visible=!descending;gear.visible=descending;
      sls.visible=launch&&!onboard; capsule.visible=!launch&&!state.mars&&!onboard; lander.visible=state.mars&&!onboard;
      sls.rotation.z=state.attitude+state.theta;capsule.rotation.z=launch?0:state.attitude+state.theta;lander.rotation.z=state.phase==='EDL'&&!state.engineFiring?Math.atan2(Math.sqrt(Math.max(0,state.surfaceVelocity**2-state.verticalSpeed**2)),-state.verticalSpeed):0;
      for(const id of ['srbLeft','srbRight'])parts[id].visible=state.stages.find(s=>s.id==='srb').attached;
      parts.core.visible=state.stages.find(s=>s.id==='core').attached;parts.las.visible=state.lasAttached;
      // Keep the retained upper stack near the floating origin after the lower stack separates.
      sls.position.set(0,parts.core.visible?0:-70,0).applyAxisAngle(new THREE.Vector3(0,0,1),sls.rotation.z);
      if(camera)sls.traverse(m=>{if(m.isLOD){const distance=camera.position.length()*Math.tan(camera.fov*Math.PI/360)/Math.tan(Math.PI/8);m.levels[0].object.visible=distance<2500;m.levels[1].object.visible=distance>=2500;}});
    },
    makeDebris(id) {const source=parts[id];const clone=source.clone(true);clone.traverse(m=>{if(m.isMesh){m.geometry=m.geometry.clone();m.material=m.material.clone();}});clone.position.set(0,0,0);return clone;}
  };
}
