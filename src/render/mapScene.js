import * as THREE from 'three';
import { AU, EARTH, MARS } from '../sim/constants.js';
import { heliocentricAt } from '../sim/transfer.js';
import { createPlanet, createSky } from './planet.js';
import { label } from './primitives.js';
import { interpolateState } from './interpolate.js';
import { disposeScene } from './dispose.js';

function line(points,color,dashed=false){const g=new THREE.BufferGeometry().setFromPoints(points);const m=dashed?new THREE.LineDashedMaterial({color,dashSize:2,gapSize:1,transparent:true,opacity:.6}):new THREE.LineBasicMaterial({color,transparent:true,opacity:.85});const l=new THREE.Line(g,m);if(dashed)l.computeLineDistances();return l;}
export function createMapScene(){let ctx,scene,sky,earth,mars,sun,marker,arrival,arrivalLabel,trajectory,prediction,earthLabel,marsLabel,shipLabel,mode,lastPath='';
  return {enter(context){ctx=context;scene=new THREE.Scene();this.scene=scene;scene.add(new THREE.AmbientLight(0xffffff,.6));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(0,200,0);scene.add(light);
    sky=createSky(ctx.assets);scene.add(sky.mesh);earth=createPlanet(1,false,ctx.assets);mars=createPlanet(1,true,ctx.assets);scene.add(earth.group,mars.group);
    sun=new THREE.Mesh(new THREE.SphereGeometry(4,32,24),new THREE.MeshBasicMaterial({color:new THREE.Color(5,3.2,1.2)}));scene.add(sun);
    marker=new THREE.Mesh(new THREE.OctahedronGeometry(1.6),new THREE.MeshBasicMaterial({color:0xa2f5df}));scene.add(marker);
    arrival=new THREE.Mesh(new THREE.TorusGeometry(3,.3,8,40),new THREE.MeshBasicMaterial({color:0xf0bd8a}));arrival.rotation.x=Math.PI/2;scene.add(arrival);arrivalLabel=label('MARS VARIŞI','#f0bd8a');arrivalLabel.scale.multiplyScalar(3);scene.add(arrivalLabel);
    earthLabel=label('DÜNYA','#86c8eb');marsLabel=label('MARS','#edaf84');shipLabel=label('MÜRETTEBAT / 03','#9ce7d7',400);for(const l of [earthLabel,marsLabel,shipLabel])l.scale.multiplyScalar(3);scene.add(earthLabel,marsLabel,shipLabel);
  },update(pair,alpha){const s=interpolateState(pair.previous,pair.current,alpha),solar=s.phase==='CRUISE'||s.phase==='MOI_BURN';const nextMode=solar?'solar':s.mars?'mars':'earth';const camera=ctx.cameras.camera;ctx.cameras.update(s,ctx.frameDelta);camera.position.set(0,solar?260:210,solar?340:250);camera.lookAt(0,0,0);camera.fov=46;camera.updateProjectionMatrix();
    sky.update({...s,density:0},camera);sun.visible=solar;
    if(mode!==nextMode){mode=nextMode;for(const child of [...scene.children])if(child.userData.path){scene.remove(child);disposeScene(child);}
      if(prediction){scene.remove(prediction);disposeScene(prediction);prediction=null;}if(trajectory){scene.remove(trajectory);disposeScene(trajectory);trajectory=null;}
      if(solar){for(const r of [90,90*1.523679]){const l=line(Array.from({length:257},(_,i)=>new THREE.Vector3(Math.cos(i/256*Math.PI*2)*r,0,Math.sin(i/256*Math.PI*2)*r)),0x365261);l.userData.path=true;scene.add(l);}
        // The full osculating ellipse is context; flown transfer is the solid arc.
        const transfer=line(Array.from({length:513},(_,i)=>{const p=heliocentricAt(i/512*2*s.transfer.duration,s.transfer).ship;return new THREE.Vector3(p[0]/AU*90,.15,p[1]/AU*90);}),0xdac89c,true);transfer.userData.path=true;scene.add(transfer);
      }lastPath='';
    }
    arrival.visible=arrivalLabel.visible=solar;
    if(solar){earth.group.visible=mars.group.visible=true;earth.group.scale.setScalar(4.5);mars.group.scale.setScalar(3.3);earth.group.position.set(s.heliocentric.earth[0]/AU*90,0,s.heliocentric.earth[1]/AU*90);mars.group.position.set(s.heliocentric.mars[0]/AU*90,0,s.heliocentric.mars[1]/AU*90);marker.position.set(s.heliocentric.ship[0]/AU*90,0,s.heliocentric.ship[1]/AU*90);
      const p=heliocentricAt(s.transfer.duration,s.transfer).ship;arrival.position.set(p[0]/AU*90,.5,p[1]/AU*90);
      const pathKey=`solar-${Math.floor(s.cruiseProgress*3000)}`;
      if(lastPath!==pathKey){lastPath=pathKey;if(trajectory){scene.remove(trajectory);disposeScene(trajectory);}trajectory=line(Array.from({length:257},(_,i)=>{const p=heliocentricAt(i/256*s.cruiseProgress*s.transfer.duration,s.transfer).ship;return new THREE.Vector3(p[0]/AU*90,.3,p[1]/AU*90);}),0x9aebd3);scene.add(trajectory);}
    }
    else {const body=s.mars?mars:earth;earth.group.visible=!s.mars;mars.group.visible=s.mars;body.group.position.set(0,0,0);body.group.scale.setScalar(s.radius/100000);body.surface.rotation.y=s.rotation;
      const [r,theta]=s.polar;marker.position.set(r*Math.cos(theta)/100000,0,r*Math.sin(theta)/100000);
      const pathKey=`${Math.floor(s.missionTime)}-${s.phase}`;
      if(lastPath!==pathKey){lastPath=pathKey;
        if(prediction){scene.remove(prediction);disposeScene(prediction);prediction=null;}
        if(s.orbit&&s.orbit.e<1&&Number.isFinite(s.orbit.a)&&s.orbit.a>0){const {a,e}=s.orbit,angle=s.orbit.argumentOfPeriapsis??0;prediction=line(Array.from({length:257},(_,i)=>{const nu=i/256*Math.PI*2,rad=a*(1-e*e)/(1+e*Math.cos(nu))/100000;return new THREE.Vector3(rad*Math.cos(nu+angle),0,rad*Math.sin(nu+angle));}),0xd5c79d,true);scene.add(prediction);}
        if(trajectory){scene.remove(trajectory);disposeScene(trajectory);trajectory=null;}
        if(s.trajectory?.length>1){trajectory=line(s.trajectory.map(p=>new THREE.Vector3(p[0]/100000,0,p[1]/100000)),0x8ee5dc);scene.add(trajectory);}
      }
    }
    earthLabel.visible=earth.group.visible;marsLabel.visible=mars.group.visible;
    // Place labels in projected screen coordinates so conjunctions never merge
    // the crew label with a planet label. Sprites stay a readable fixed size.
    camera.updateMatrixWorld();const width=ctx.cameras.camera.aspect*ctx.height,height=ctx.height,placed=[];
    const items=[[shipLabel,marker],[earthLabel,earth.group],[marsLabel,mars.group],[arrivalLabel,arrival]];
    const markers=items.filter(([sprite])=>sprite.visible).map(([,anchor])=>{const p=anchor.position.clone().project(camera);return {x:(p.x+1)*width/2-13,y:(1-p.y)*height/2-13,w:26,h:26};});
    const intersects=(a,b)=>a.x<b.x+b.w+8&&a.x+a.w+8>b.x&&a.y<b.y+b.h+8&&a.y+a.h+8>b.y;
    for(const [sprite,anchor]of items){if(!sprite.visible)continue;const w=sprite.material.map.image.width/64*34,p=anchor.position.clone().project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;
      const options=sprite===shipLabel?[[110,0],[0,-46],[-110,0],[0,-80],[110,-45],[0,46]]:[[0,44],[0,-44],[85,0],[-85,0],[85,-44],[-85,-44],[0,75],[0,-85]];
      for(let r=80;r<=320;r+=30)for(let i=0;i<16;i++)options.push([Math.cos(i*Math.PI/8)*r,Math.sin(i*Math.PI/8)*r]);
      let selected=options.at(-1);
      for(const offset of options){const rect={x:x+offset[0]-w/2,y:y+offset[1]-17,w,h:34};const inView=rect.x>245&&rect.x+rect.w<width-245&&rect.y>185&&rect.y+rect.h<height-190;if(inView&&![...placed,...markers].some(r=>intersects(rect,r))){selected=offset;break;}}
      const px=x+selected[0],py=y+selected[1];placed.push({x:px-w/2,y:py-17,w,h:34});sprite.position.set(px/width*2-1,1-py/height*2,p.z).unproject(camera);
      const distance=camera.position.distanceTo(sprite.position),units=2*distance*Math.tan(camera.fov*Math.PI/360)/height;sprite.scale.set(w*units,34*units,1);
    }
    this.labelLayout={labels:placed,markers,width,height};
    this.state=s;this.audioDistance=1e9;
  },exit(){disposeScene(scene);scene=null;}};
}
