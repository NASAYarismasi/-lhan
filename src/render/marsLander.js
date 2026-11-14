// TEMP — replaced by worker İNİŞ
import * as THREE from 'three';

/** Temporary crew lander contract: metres, Y-up, footpads y=0, hatch/ladder +Z. */
export function createMarsLander() {
  const lander = new THREE.Group();
  lander.name = 'Crew_Mars_Lander_TEMP';
  const hull = new THREE.MeshStandardMaterial({ color: 0xd9d5c7, roughness: .64, metalness: .25 });
  const foil = new THREE.MeshStandardMaterial({ color: 0x8a7150, roughness: .65, metalness: .5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x292c30, roughness: .7 });
  const add = (geometry, material, x, y, z) => {
    const part = new THREE.Mesh(geometry, material); part.position.set(x,y,z);
    part.castShadow = true; part.receiveShadow = true; lander.add(part); return part;
  };
  add(new THREE.CylinderGeometry(2.2,3.2,3.6,8),hull,0,4.1,0);
  add(new THREE.CylinderGeometry(3.4,3.5,.8,8),foil,0,2.1,0);
  add(new THREE.BoxGeometry(1,1.8,.12),dark,0,3.3,2.7);
  for (const sx of [-1,1]) for (const sz of [-1,1]) {
    const footX=sx*4, footZ=sz*4;
    add(new THREE.CylinderGeometry(.58,.68,.14,12),dark,footX,.07,footZ);
    const start = new THREE.Vector3(sx*2.1,2.3,sz*2.1), end = new THREE.Vector3(footX,.14,footZ);
    const strut=add(new THREE.CylinderGeometry(.12,.14,start.distanceTo(end),8),hull,0,0,0);
    strut.position.copy(start).add(end).multiplyScalar(.5);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize());
  }
  for (const sx of [-.55,.55]) {
    const rail=add(new THREE.BoxGeometry(.07,3.5,.07),hull,sx,1.7,3.25); rail.rotation.x=.19;
  }
  for(let i=0;i<10;i++) add(new THREE.BoxGeometry(1.1,.06,.12),hull,0,.18+i*.33,3.58-i*.063);
  return lander;
}
