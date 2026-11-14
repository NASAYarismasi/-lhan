import * as THREE from 'three';
import { AU, EARTH, MARS } from '../sim/constants.js';
import { heliocentricAt } from '../sim/transfer.js';
import { createPlanet, createSky } from './planet.js';
import { label } from './primitives.js';
import { interpolateState } from './interpolate.js';
import { disposeScene } from './dispose.js';

function line(points,color,dashed=false){const g=new THREE.BufferGeometry().setFromPoints(points);const m=dashed?new THREE.LineDashedMaterial({color,dashSize:2,gapSize:1,transparent:true,opacity:.6}):new THREE.LineBasicMaterial({color,transparent:true,opacity:.85});const l=new THREE.Line(g,m);if(dashed)l.computeLineDistances();return l;}
export function createMapScene(){let ctx,scene,sky,earth,mars,sun,marker,trajectory,prediction,earthLabel,marsLabel,shipLabel,mode,lastPath='';
  return {enter(context){ctx=context;scene=new THREE.Scene();this.scene=scene;scene.add(new THREE.AmbientLight(0xffffff,.6));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(0,200,0);scene.add(light);
    sky=createSky(ctx.assets);scene.add(sky.mesh);earth=createPlanet(1,false,ctx.assets);mars=createPlanet(1,true,ctx.assets);scene.add(earth.group,mars.group);
    sun=new THREE.Mesh(new THREE.SphereGeometry(4,32,24),new THREE.MeshBasicMaterial({color:new THREE.Color(5,3.2,1.2)}));scene.add(sun);
    marker=new THREE.Mesh(new THREE.OctahedronGeometry(1.6),new THREE.MeshBasicMaterial({color:0xa2f5df}));scene.add(marker);
    earthLabel=label('DÜNYA','#86c8eb');marsLabel=label('MARS','#edaf84');shipLabel=label('MÜRETTEBAT / 03','#9ce7d7',400);for(const l of [earthLabel,marsLabel,shipLabel])l.scale.multiplyScalar(3);scene.add(earthLabel,marsLabel,shipLabel);
  },update(pair,alpha){const s=interpolateState(pair.previous,pair.current,alpha),solar=s.phase==='CRUISE'||s.phase==='MOI_BURN';const nextMode=solar?'solar':s.mars?'mars':'earth';const camera=ctx.cameras.camera;ctx.cameras.update(s,ctx.frameDelta);camera.position.set(0,solar?260:210,solar?340:250);camera.lookAt(0,0,0);camera.fov=46;camera.updateProjectionMatrix();
    sky.update({...s,density:0},camera);sun.visible=solar;
    if(mode!==nextMode){mode=nextMode;for(const child of [...scene.children])if(child.userData.path){scene.remove(child);disposeScene(child);}
      if(prediction){scene.remove(prediction);disposeScene(prediction);prediction=null;}if(trajectory){scene.remove(trajectory);disposeScene(trajectory);trajectory=null;}
      if(solar){for(const r of [90,90*1.523679]){const l=line(Array.from({length:257},(_,i)=>new THREE.Vector3(Math.cos(i/256*Math.PI*2)*r,0,Math.sin(i/256*Math.PI*2)*r)),0x365261);l.userData.path=true;scene.add(l);}
        const transfer=line(Array.from({length:257},(_,i)=>{const p=heliocentricAt(i/256*s.transfer.duration,s.transfer).ship;return new THREE.Vector3(p[0]/AU*90,.15,p[1]/AU*90);}),0xdac89c);transfer.userData.path=true;scene.add(transfer);
      }lastPath='';
    }
    if(solar){earth.group.visible=mars.group.visible=true;earth.group.scale.setScalar(4.5);mars.group.scale.setScalar(3.3);earth.group.position.set(s.heliocentric.earth[0]/AU*90,0,s.heliocentric.earth[1]/AU*90);mars.group.position.set(s.heliocentric.mars[0]/AU*90,0,s.heliocentric.mars[1]/AU*90);marker.position.set(s.heliocentric.ship[0]/AU*90,0,s.heliocentric.ship[1]/AU*90);}
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
    earthLabel.visible=earth.group.visible;marsLabel.visible=mars.group.visible;earthLabel.position.copy(earth.group.position).add(new THREE.Vector3(0,6,9));marsLabel.position.copy(mars.group.position).add(new THREE.Vector3(0,6,9));shipLabel.position.copy(marker.position).add(new THREE.Vector3(0,7,-6));
    this.state=s;this.audioDistance=1e9;
  },exit(){disposeScene(scene);scene=null;}};
}
