import * as THREE from 'three';
export const CAMERA_NAMES=['Takip','Orion kabini','Yer takibi','Motor kamerası','Sinematik','Yörünge haritası'];
export function createCameras(canvas) {
  const camera=new THREE.PerspectiveCamera(45,1,.15,1e10);let selected=0,effective=0,lastEffective=-1,yaw=.52,elevation=.16,distance=235,zoom=1,initialized=false;
  const desired=new THREE.Vector3(),target=new THREE.Vector3();let drag=false;
  const down=e=>{if(e.button===0){drag=true;canvas.setPointerCapture(e.pointerId);}};
  const up=()=>{drag=false;};
  const move=e=>{if(drag&&selected===0){yaw-=e.movementX*.005;elevation=THREE.MathUtils.clamp(elevation+e.movementY*.004,-.7,1.35);}};
  const wheel=e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(e.deltaY*.001),.2,6);};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointermove',move);canvas.addEventListener('wheel',wheel,{passive:false});
  return {camera,get selected(){return selected;},get effective(){return effective;},get name(){return CAMERA_NAMES[selected]+(selected===4?` / ${CAMERA_NAMES[effective]}`:'');},
    select(i){selected=(i+6)%6;initialized=false;zoom=1;},cycle(){this.select(selected+1);},
    update(s,dt){
      effective=selected;
      if(selected===4){
        const age=id=>{const e=s.events.find(e=>e.type===id);return e?s.missionTime-e.time:Infinity;};
        if(s.phase==='PRELAUNCH')effective=s.countdown.time>=-6.5&&s.countdown.running?3:2;
        else if(s.phase==='ASCENT')effective=age('SRB_SEPARATION')<12||age('LAS_JETTISON')<6||(s.dynamicPressure??0)>27000?0:age('MECO')<10||age('ICPS_IGNITION')<10?3:age('LIFTOFF')<18?2:Math.floor((s.phaseTime-18)/24)%2===0?0:3;
        else effective=s.phase==='CRUISE'?5:['PARKING_ORBIT','TMI_BURN'].includes(s.phase)?1:s.phase==='MOI_BURN'?3:0;
      }
      if(effective!==lastEffective){initialized=false;lastEffective=effective;}
      const launch=['PRELAUNCH','ASCENT'].includes(s.phase),h=launch?(s.stages.find(p=>p.id==='core').attached?(s.phase==='ASCENT'?25:48):10):s.mars?5:3;
      target.set(0,h,0);camera.up.set(0,1,0);camera.fov=45;camera.near=.15;
      if(effective===0){distance=launch?(s.phase==='ASCENT'?320:260):s.mars?70:45;const d=distance*zoom;desired.set(Math.sin(yaw)*d,h+Math.sin(elevation)*d,Math.cos(yaw)*Math.cos(elevation)*d);}
      else if(effective===1){desired.set(0,4.7,5.3);target.set(0,.2,-15);camera.fov=68;camera.near=.06;}
      else if(effective===2){
        // Fixed ground site 5 km west of LC-39B, transformed through the same floating origin.
        const x=-4900-s.position[0],y=20-s.position[1],c=Math.cos(s.theta),sn=Math.sin(s.theta);
        desired.set(x*c-y*sn,x*sn+y*c,1100);
        const dist=desired.distanceTo(target);camera.fov=THREE.MathUtils.clamp(2*Math.atan((launch?110:35)*zoom/dist)*180/Math.PI, .18, 40);
      }else if(effective===3){desired.set(5,launch?30:6,4);target.set(0,-70,-3);camera.fov=75;}
      else{desired.set(0,180,250);target.set(0,0,0);camera.near=.1;camera.fov=45;}
      const damping=effective===1||effective===3||effective===5?1:1-Math.exp(-Math.min(.1,dt)*7);
      if(!initialized){camera.position.copy(desired);initialized=true;}else camera.position.lerp(desired,damping);
      if(effective!==5){const shake=effective===1?.006:effective===2?.013:.05;const amount=Math.min(1,(s.acceleration??0)/40+(s.dynamicPressure??0)/40000)*shake;camera.position.x+=Math.sin(s.missionTime*71)*amount;camera.position.y+=Math.sin(s.missionTime*89)*amount;}
      camera.lookAt(target);camera.updateProjectionMatrix();
    },dispose(){canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('wheel',wheel);}
  };
}
