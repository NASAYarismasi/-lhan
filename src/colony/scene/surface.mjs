import * as T from 'three'

// GAME ASSUMPTION: seeded construction-site microtopography, sediment and rock distribution.
// Local detail is procedural, not an additional NASA DEM or sampled Jezero rock census.
function height(x,z) {
  const radius=Math.hypot(x,z), blend=T.MathUtils.smoothstep(radius,17,90)
  const edge=T.MathUtils.smoothstep(radius,95,137)
  return T.MathUtils.lerp(-.035,-.16,edge)+(1-edge)*blend*(.38*Math.sin(x*.049)*Math.cos(z*.066)+.12*Math.sin(x*.17+z*.09))
}
export function addSurface(scene) {
  let seed=831
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const width=300, segments=120, stride=segments+1
  const geometry=new T.PlaneGeometry(width,width,segments,segments)
  geometry.rotateX(-Math.PI/2)
  const points=geometry.attributes.position, colors=[]
  const light=new T.Color(0xa17c5b), dark=new T.Color(0x705340)
  for(let i=0;i<points.count;i++) {
    const x=points.getX(i),z=points.getZ(i)
    points.setY(i,height(x,z))
    const variation=.48+.18*Math.sin(x*.085+z*.029)+.12*Math.cos(z*.21)+.08*Math.sin(x*.74-z*.51)
    const color=dark.clone().lerp(light,variation)
    colors.push(color.r,color.g,color.b)
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals()
  // Only the tiny bump texture repeats; albedo is continuous world-space vertex colour.
  const data=new Uint8Array(128*128*4)
  for(let i=0;i<data.length;i+=4) {const v=Math.round(100+random()*90);data.set([v,v,v,255],i)}
  const bump=new T.DataTexture(data,128,128);bump.wrapS=bump.wrapT=T.RepeatWrapping
  bump.minFilter=T.LinearMipmapLinearFilter;bump.magFilter=T.LinearFilter;bump.generateMipmaps=true;bump.repeat.set(220,220);bump.needsUpdate=true
  const surface=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1,bumpMap:bump,bumpScale:.014}))
  surface.name='Jezero_near_regolith';surface.receiveShadow=true;scene.add(surface)
  // Exact triangle interpolation, matching PlaneGeometry's diagonal. No per-frame terrain raycast.
  surface.userData.heightAt=(x,z)=>{
    const u=T.MathUtils.clamp((x/width+.5)*segments,0,segments-.000001)
    const v=T.MathUtils.clamp((z/width+.5)*segments,0,segments-.000001)
    const ix=Math.floor(u),iz=Math.floor(v),a=u-ix,b=v-iz
    const h00=points.getY(iz*stride+ix),h10=points.getY(iz*stride+ix+1)
    const h01=points.getY((iz+1)*stride+ix),h11=points.getY((iz+1)*stride+ix+1)
    return a+b<1 ? h00+(h10-h00)*a+(h01-h00)*b : h11+(h01-h11)*(1-a)+(h10-h11)*(1-b)
  }
  const rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({roughness:1}),1650)
  const pose=new T.Object3D(),color=new T.Color()
  for(let i=0;i<rocks.count;i++) {
    const a=random()*Math.PI*2,r=8+Math.sqrt(random())*135
    let x=Math.sin(a)*r,z=Math.cos(a)*r
    // Keep the primary construction floor and landing apron free of large obstacles.
    if(Math.abs(x)<12 && Math.abs(z)<16) x+=Math.sign(x||1)*14
    if(x<-10 && x>-27 && z>5 && z<26) z+=24
    // Steep size-frequency distribution: mostly centimetre clasts, very few metre boulders.
    const size=.025+random()**6*1.35
    pose.position.set(x,surface.userData.heightAt(x,z)+size*.15,z)
    pose.rotation.set(random()*.65,random()*Math.PI*2,random()*.65)
    pose.scale.set(size,size*(.35+random()*.3),size*(.7+random()*.4));pose.updateMatrix()
    rocks.setMatrixAt(i,pose.matrix);rocks.setColorAt(i,color.set(0x746555).multiplyScalar(.65+random()*.7))
  }
  rocks.castShadow=true;rocks.receiveShadow=true;rocks.name='Jezero_instanced_clasts';scene.add(rocks)
  surface.userData.rocks=rocks
  return surface
}

/** Fixed-capacity, world-anchored boot tracks and short-lived dust motes. */
export function createFootprints(scene,groundY) {
  // Small procedural sole: rounded toe/heel, separated tread bars. No licensed image asset needed.
  const sole=new Uint8Array(32*64*4)
  for(let y=0;y<64;y++) for(let x=0;x<32;x++) {
    const nx=(x-15.5)/15.5,ny=(y-31.5)/31.5
    const inside=Math.abs(nx)<.72 && Math.abs(ny)<.93 && (nx*nx+Math.max(0,Math.abs(ny)-.6)**2*5)<.63
    const tread=y%8<5 || Math.abs(nx)>.58
    const i=(y*32+x)*4;sole.set([255,255,255,inside?(tread?210:55):0],i)
  }
  const soleTexture=new T.DataTexture(sole,32,64);soleTexture.needsUpdate=true
  const tracks=new T.InstancedMesh(new T.PlaneGeometry(.13,.29),new T.MeshStandardMaterial({
    color:0x594536,map:soleTexture,roughness:1,transparent:true,opacity:.52,alphaTest:.03,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),160)
  tracks.count=0;tracks.receiveShadow=true;tracks.frustumCulled=false;scene.add(tracks)
  const dustGeometry=new T.BufferGeometry(),positions=new Float32Array(32*3)
  dustGeometry.setAttribute('position',new T.BufferAttribute(positions,3))
  const dust=new T.Points(dustGeometry,new T.PointsMaterial({color:0xb59979,size:.04,transparent:true,opacity:.27,depthWrite:false}))
  dust.frustumCulled=false;scene.add(dust)
  const motes=Array.from({length:32},()=>({age:10,x:0,y:-100,z:0}))
  let trackIndex=0,moteIndex=0,side=1
  const pose=new T.Object3D()
  return {
    step(x,z,yaw) {
      side*=-1
      const px=x+Math.cos(yaw)*side*.11,pz=z-Math.sin(yaw)*side*.11
      pose.position.set(px,groundY(px,pz)+.008,pz);pose.rotation.set(-Math.PI/2,0,yaw);pose.updateMatrix()
      tracks.setMatrixAt(trackIndex,pose.matrix);tracks.count=Math.min(160,tracks.count+1);tracks.instanceMatrix.needsUpdate=true
      trackIndex=(trackIndex+1)%160
      for(let i=0;i<5;i++) {
        const m=motes[moteIndex];m.age=0;m.x=px+Math.sin(i*2.4)*.05;m.y=pose.position.y+.03;m.z=pz+Math.cos(i*2.4)*.08
        moteIndex=(moteIndex+1)%motes.length
      }
    },
    update(dt) {
      for(let i=0;i<motes.length;i++) {
        const m=motes[i];m.age+=dt
        positions[i*3]=m.x+m.age*.08;positions[i*3+1]=m.age<.8?m.y+m.age*.075:-100;positions[i*3+2]=m.z
      }
      dustGeometry.attributes.position.needsUpdate=true
    },
    dispose() { soleTexture.dispose(); for(const object of [tracks,dust]){object.removeFromParent();object.geometry.dispose();object.material.dispose()} },
  }
}
