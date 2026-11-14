import * as THREE from 'three';
import { box, cylinder, material, canvasTexture } from './primitives.js';

/** Bake NASA's rigid T-pose into an approximate seated pose; source asset remains untouched. */
function seatedSuit(source) {
  source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source),height=bounds.max.y-bounds.min.y,center=bounds.getCenter(new THREE.Vector3()),scale=1.85/height,group=new THREE.Group();
  source.traverse(original=>{
    if(!original.isMesh)return;
    let geometry=original.geometry.index?original.geometry.toNonIndexed():original.geometry.clone();geometry.applyMatrix4(original.matrixWorld);geometry.userData.shared=false;
    const p=geometry.attributes.position,v=new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i);v.set((v.x-center.x)*scale,(v.y-bounds.min.y)*scale,(v.z-center.z)*scale);
      if(Math.abs(v.x)>.25&&v.y>.93&&v.y<1.63){const side=Math.sign(v.x),pivot=new THREE.Vector3(side*.24,1.28,0);v.sub(pivot).applyAxisAngle(new THREE.Vector3(0,0,1),-side*.95).applyAxisAngle(new THREE.Vector3(0,1,0),side*.8).add(pivot);}
      p.setXYZ(i,v.x,v.y,v.z);
    }
    const visible=[];for(let i=0;i<p.count;i+=3)if((p.getY(i)+p.getY(i+1)+p.getY(i+2))/3>.78)visible.push(i,i+1,i+2);geometry.setIndex(visible);geometry.computeVertexNormals();
    const mat=Array.isArray(original.material)?original.material.map(m=>m.clone()):original.material.clone();const mesh=new THREE.Mesh(geometry,mat);group.add(mesh);
  });return group;
}

export function createCabin(assets) {
  const group=new THREE.Group(), shell=material(0x626b71,.7,.3), trim=material(0x18242c,.45,.6), suit=material(0xe4e4d9,.75,0);
  // Open front and side apertures show the same planet/lighting as the external camera.
  box(group,[8,.25,11],shell,[0,0,1]);box(group,[8,.35,11],shell,[0,6.3,1]);
  for(const x of [-4,4]) {box(group,[.3,6.2,11],shell,[x,3.1,1]);box(group,[.2,1.7,9],trim,[x*.93,1,0]);}
  box(group,[8,1.4,.4],shell,[0,5.6,-4.2]);box(group,[8,.8,.4],shell,[0,.1,-4.2]);
  for(const x of [-3.8,-1.4,1.4,3.8]) {const pillar=box(group,[.28,4,.5],trim,[x,3.5,-4.2]);pillar.rotation.z=x*.04;}
  // Window bevels, handholds and ceiling conduits.
  for(const x of [-2.7,0,2.7]) {box(group,[2.35,.12,.6],material(0xa0a9ab),[x,4.96,-4]);box(group,[2.35,.12,.6],trim,[x,.56,-4]);}
  for(const x of [-3,3])cylinder(group,.07,.07,7,trim,[x,5.8,0]).rotation.x=Math.PI/2;
  const screenTexture=canvasTexture(1536,512,()=>{}),screenMat=new THREE.MeshBasicMaterial({map:screenTexture,toneMapped:false});
  const screens=[];
  for(const x of [-2.6,0,2.6]) {const panel=box(group,[2.35,1.22,.25],trim,[x,1.7,-2.6]);panel.rotation.x=-.25;const screen=new THREE.Mesh(new THREE.PlaneGeometry(2.12,1),screenMat);screen.position.set(0,0,.14);panel.add(screen);screens.push(screen);}
  for(let i=0;i<3;i++) {
    const x=(i-1)*2.2,seat=box(group,[1.55,1.6,.35],trim,[x,1.65,1]);seat.rotation.x=-.18;box(group,[1.55,.25,1.5],trim,[x,.85,.45]);
    const astronaut=new THREE.Group();astronaut.position.set(x,1.35,.35);group.add(astronaut);
    // Original seated articulation around NASA's rigid suit mesh; lower legs are hidden by the seat.
    if(assets.models.astronaut) {
      const model=seatedSuit(assets.models.astronaut);model.rotation.y=Math.PI;model.rotation.x=.17;astronaut.add(model);
    } else {cylinder(astronaut,.37,.33,.8,suit,[0,.55,0]);const helmet=new THREE.Mesh(new THREE.SphereGeometry(.29,24,16),suit);helmet.position.y=1.18;astronaut.add(helmet);}
    for(const sx of [-.35,.35]) {const thigh=cylinder(astronaut,.17,.17,.72,suit,[sx,-.1,-.25]);thigh.rotation.x=Math.PI/2;cylinder(astronaut,.14,.14,.65,suit,[sx,-.45,-.58]);}
    for(const sx of [-.4,.4]) {const arm=cylinder(astronaut,.10,.12,.45,suit,[sx,.52,-.32]);arm.rotation.x=-1.2;}
    box(group,[.04,1.3,.035],material(0x6e7370),[x-.37,1.9,1.24]);
  }
  const light=new THREE.PointLight(0x8dd5ee,35,12,2);light.position.set(0,4,3);group.add(light);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(5,.03,.07),new THREE.MeshBasicMaterial({color:0xa4d7ff}));strip.position.set(0,5.9,-2);group.add(strip);
  let last=-1;
  return {group,update(state,visible){group.visible=visible;if(!visible||Math.abs(state.missionTime-last)<.1)return;last=state.missionTime;const c=screenTexture.image.getContext('2d');c.fillStyle='#04121b';c.fillRect(0,0,1536,512);c.fillStyle='#73b8c9';c.font='25px monospace';c.fillText('ORION / UÇUŞ BİLGİSAYARI                       GNC  ● NOMİNAL',36,54);c.strokeStyle='#24404d';for(let y=85;y<512;y+=86){c.beginPath();c.moveTo(30,y);c.lineTo(1500,y);c.stroke();}c.fillStyle='#d1e8ed';c.font='52px monospace';c.fillText(`İRTİFA  ${((state.altitude??0)/1000).toFixed(1)} km`,38,150);c.fillText(`HIZ     ${((state.velocity??0)/1000).toFixed(3)} km/s`,38,240);c.fillText(`DÜŞEY   ${(state.verticalSpeed??0).toFixed(0)} m/s`,38,330);c.fillStyle='#5be6bc';c.font='28px monospace';c.fillText('OTOPİLOT / ÜÇ MÜRETTEBAT / YAŞAM DESTEĞİ AKTİF',38,451);screenTexture.needsUpdate=true;}};
}
