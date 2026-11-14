/**
 * Düz Ova solar field by İhan, recovered from MARS-KOLONISI-DUZ-OVA.html
 * (NASAYarismasi/-lhan d6caf78). Layout/dimensions are GAME ASSUMPTIONS.
 * Original 42 tables / 420 cells; shared materials and five instanced draws.
 */
import * as THREE from 'three';

export function createSolarFarm(scene, heightAt, obstacles) {
  const originX = -57, originZ = 46, floorY = heightAt(originX, originZ);
  const farm = new THREE.Group();
  farm.name = 'MarsSolarFarm';
  farm.position.set(originX, floorY, originZ);
  scene.add(farm);
  const canvas = document.createElement('canvas');
  canvas.width = 500; canvas.height = 400;
  const context = canvas.getContext('2d');
  context.fillStyle = '#8a8981'; context.fillRect(0, 0, 500, 400);
  for (let row = 0; row < 2; row++) for (let column = 0; column < 5; column++) {
    const x = column * 100, y = row * 200;
    context.fillStyle = (row + column) % 2 ? '#172b47' : '#1f3452';
    context.fillRect(x + 3, y + 3, 94, 194);
    context.fillStyle = '#4a607a';
    for (let line = 1; line < 16; line++) context.fillRect(x + 5, y + line * 12, 90, 1);
    context.fillRect(x + 49, y + 4, 1, 192);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const metal = new THREE.MeshStandardMaterial({color:0x686b66,metalness:.58,roughness:.48});
  const cells = new THREE.MeshStandardMaterial({map:texture,metalness:.26,roughness:.34});
  function batch(name, geometry, material, count) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = name; mesh.castShadow = mesh.receiveShadow = true;
    farm.add(mesh);
    return mesh;
  }
  const frames = batch('Ova_solar_tables',new THREE.BoxGeometry(5,.09,4),metal,42);
  const panels = batch('Ova_solar_cells',new THREE.PlaneGeometry(5,4).rotateX(-Math.PI/2),cells,42);
  const posts = batch('Ova_solar_posts',new THREE.BoxGeometry(.13,1,.13),metal,168);
  const feet = batch('Ova_solar_feet',new THREE.BoxGeometry(.44,.14,.44),metal,168);
  const batteries = batch('Ova_solar_batteries',new THREE.BoxGeometry(2.8,2.3,1.6),metal,10);
  const pose = new THREE.Object3D(), cellPose = new THREE.Object3D();
  const tilt = .55;
  let tableIndex = 0, postIndex = 0;
  for (let row = 0; row < 6; row++) for (let column = 0; column < 7; column++) {
    const x = (column-3)*6, z = (row-2.5)*8;
    const y = heightAt(originX+x,originZ+z)-floorY;
    pose.position.set(x,y+2.25,z); pose.rotation.set(tilt,0,0); pose.scale.setScalar(1); pose.updateMatrix();
    frames.setMatrixAt(tableIndex,pose.matrix);
    cellPose.position.set(0,.052,0); cellPose.updateMatrix();
    panels.setMatrixAt(tableIndex++,new THREE.Matrix4().multiplyMatrices(pose.matrix,cellPose.matrix));
    for (const dx of [-1.9,1.9]) for (const dz of [-1.4,1.4]) {
      const postZ = z+dz*Math.cos(tilt), groundY = heightAt(originX+x+dx,originZ+postZ)-floorY;
      const topY = y+2.2-dz*Math.sin(tilt), length = Math.max(.1,topY-groundY);
      pose.rotation.set(0,0,0); pose.position.set(x+dx,groundY+length/2,postZ);
      pose.scale.set(1,length,1); pose.updateMatrix(); posts.setMatrixAt(postIndex,pose.matrix);
      pose.position.y = groundY+.035; pose.scale.setScalar(1); pose.updateMatrix(); feet.setMatrixAt(postIndex++,pose.matrix);
    }
    obstacles.push(new THREE.Box3(new THREE.Vector3(originX+x-2.68,floorY+y,originZ+z-1.93),
      new THREE.Vector3(originX+x+2.68,floorY+y+3.4,originZ+z+1.93)));
  }
  for (let index=0; index<10; index++) {
    const x=23+4*Math.floor(index/5), z=(index%5-2)*4.5, y=heightAt(originX+x,originZ+z);
    pose.position.set(x,y-floorY+1.15,z); pose.scale.setScalar(1); pose.updateMatrix();
    batteries.setMatrixAt(index,pose.matrix);
    obstacles.push(new THREE.Box3(new THREE.Vector3(originX+x-1.6,y-.2,originZ+z-1),
      new THREE.Vector3(originX+x+1.6,y+2.5,originZ+z+1)));
  }
  for (const mesh of farm.children) {mesh.instanceMatrix.needsUpdate=true; mesh.computeBoundingSphere();}
  return {farm,level:floorY,x0:originX,z0:originZ};
}
