import { createMission } from '../sim/mission.js';
import { createCountdown } from '../sim/countdown.js';
import { createDebris } from '../sim/debris.js';
import { createLoop, WARPS, SIM_DT } from './loop.js';
import { createInput } from './input.js';
import { createStore } from './store.js';
import { captureRenderState } from './renderState.js';
import { createAudio } from './audio.js';
import { loadAssets } from '../render/assets.js';
import { createRenderer } from '../render/renderer.js';
import { createCameras } from '../render/cameras.js';
import { createSceneManager } from '../render/sceneManager.js';
import { createHUD } from '../ui/hud.js';

export async function bootstrap(){
  let mission=createMission(),countdown=createCountdown(),debris=createDebris(),trajectory=[],exhaustHistory=[],ready=false;
  let previousState,currentState,manualTime=false,disposed=false,frameDelta=1/60,lastPhase='PRELAUNCH',fps=60,notice='';
  const ui={manual:false,help:false,notice:''},audio=createAudio(),store=createStore();
  const snapshot=()=>({...captureRenderState(mission,countdown,debris),trajectory:[...trajectory],exhaust:exhaustHistory});
  const canManual=()=>['ASCENT','TMI_BURN','MOI_BURN'].includes(mission.state.phase);
  const commands={
    launch(){if(ready&&!loop.paused) {audio.start();countdown.start();}},
    burn(){if(!loop.paused){audio.start();mission.burn();sync();}},
    pause(){loop.setPaused(!loop.paused);sync();},
    help(){ui.help=!ui.help;sync();},
    camera(i){if(ready){cameras.select(i);sync();}},
    warp(direction=1){const start=WARPS.indexOf(loop.warp);for(let i=1;i<=WARPS.length;i++){const value=WARPS[(start+direction*i+WARPS.length*2)%WARPS.length];if(mission.setWarp(value)&&loop.setWarp(value))break;}sync();},
    quality(value,adaptive){graphics.setQuality(value,adaptive);sync();},
    volume(value){audio.start();audio.setVolume(value);},mute(){audio.start();audio.toggleMute();sync();},
    reset(){mission=createMission();countdown=createCountdown();debris=createDebris();trajectory=[];exhaustHistory=[];loop.reset();input.keys.clear();audio.reset();ui.manual=false;ui.help=false;ui.notice='';lastPhase='PRELAUNCH';manager.exit();cameras.select(0);previousState=currentState=snapshot();sync();}
  };
  const hud=createHUD(commands);
  const assets=await loadAssets((done,total)=>hud.progress(done,total));
  if(disposed){assets.dispose();return;}
  const graphics=createRenderer(document.getElementById('scene')),cameras=createCameras(graphics.canvas);
  const ctx={assets,cameras,frameDelta,quality:graphics.quality,height:graphics.height};
  const manager=createSceneManager(ctx);graphics.canvas.tabIndex=0;
  const input=createInput(window,action=>{
    if(!ready)return;
    const indices={outside:0,inside:1,ground:2,engine:3,director:4,map:5};
    if(action in indices)commands.camera(indices[action]);
    else if(action==='camera'){cameras.cycle();sync();}
    else if(action==='interact'||action==='stage'){if(mission.state.phase==='PRELAUNCH')commands.launch();else if(!loop.paused)mission.stage();}
    else if(action==='burn')commands.burn();else if(['pause','menu'].includes(action))commands.pause();
    else if(['help','watch'].includes(action))commands.help();else if(['warp','warpUp','warpDown'].includes(action))commands.warp(action==='warpDown'?-1:1);
    else if(action==='mute')commands.mute();
    else if(action==='manual'&&canManual()){ui.manual=!ui.manual;if(!ui.manual)mission.setThrottle(1);sync();}
    else if(['fullThrottle','cutThrottle'].includes(action)&&canManual()&&ui.manual&&!loop.paused){mission.setThrottle(action==='fullThrottle'?1:0);sync();}
    else if(action==='fullscreen'){(document.fullscreenElement?document.exitFullscreen():document.querySelector('main').requestFullscreen()).catch(()=>{});}
  });
  function release(id,side=0){
    const a=mission.state.ascent.state,[r,theta,vr,vt]=a.vector,angle=a.pitch-theta-Math.PI/2;
    const ox=id==='srbLeft'?-6.4:id==='srbRight'?6.4:0,oy=id.startsWith('srb')?27:id==='core'?33:94;
    const c=Math.cos(angle),s=Math.sin(angle),position=[r*Math.sin(theta)+ox*c-oy*s,r*Math.cos(theta)+ox*s+oy*c];
    const velocity=[vr*Math.sin(theta)+vt*Math.cos(theta),vr*Math.cos(theta)-vt*Math.sin(theta)];
    const ix=side*8,iy=id==='las'?22:-8;debris.release(id,position,velocity,[ix*c-iy*s,ix*s+iy*c],angle,side*.13+(id==='core'?.07:.02));
  }
  function updateTrajectory(){const s=mission.state,phase=s.phase;
    if(['ASCENT','PARKING_ORBIT','EDL','DEORBIT'].includes(phase)&&(trajectory.length===0||s.time-(trajectory.at(-1)[2]??0)>2)){
      if(phase==='ASCENT'){const[r,a]=s.ascent.state.vector;trajectory.push([r*Math.cos(a),r*Math.sin(a),s.time]);}
      else if(s.edl){const[r,a]=s.edl.state.vector;trajectory.push([r*Math.cos(a),r*Math.sin(a),s.time]);}
      else if(s.orbitState)trajectory.push([s.orbitState.position[0],s.orbitState.position[1],s.time]);
      if(trajectory.length>1000)trajectory.shift();
    }
  }
  const loop=createLoop({maxSteps:3000,getState:()=>mission.getTelemetry(),
    step(dt){previousState=currentState;
      if(mission.state.phase==='PRELAUNCH'){if(countdown.step(dt))mission.launch();}
      else{
        const a=mission.state.ascent.state,srb=a.vehicle.stages[0].attached,core=a.vehicle.stages[1].attached,las=a.lasAttached;
        if(ui.manual&&canManual()) {let value=mission.state.throttle;if(input.isDown('throttleUp'))value+=dt*.3;if(input.isDown('throttleDown'))value-=dt*.3;if(input.isDown('throttleUp')||input.isDown('throttleDown'))mission.setThrottle(value);}
        debris.step(dt);mission.step(dt);
        if(srb&&!a.vehicle.stages[0].attached){release('srbLeft',-1);release('srbRight',1);}
        if(core&&!a.vehicle.stages[1].attached)release('core');if(las&&!a.lasAttached)release('las');
      }
      if(mission.state.phase!==lastPhase){const phase=mission.state.phase;store.emit('phase',{previous:lastPhase,phase});if(phase==='CRUISE'&&cameras.selected!==1)cameras.select(5);if(phase==='MOI_BURN'&&cameras.selected===5)cameras.select(0);if(['DEORBIT','EDL'].includes(phase))trajectory=[];lastPhase=phase;ui.manual=false;}
      updateTrajectory();currentState=snapshot();
      const visualClock=currentState.missionTime+(currentState.phase==='PRELAUNCH'?countdown.state.time:0);
      if(visualClock-(exhaustHistory.at(-1)?.time??-100)>.2&&((currentState.phase==='ASCENT'&&currentState.stages[0].attached)||(countdown.state.running&&countdown.state.time>=-6.5))){
        exhaustHistory=[...exhaustHistory.filter(e=>e.time>visualClock-105),{time:visualClock,phase:currentState.phase,position:currentState.position,theta:currentState.theta,attitude:currentState.attitude,altitude:currentState.altitude}];currentState.exhaust=exhaustHistory;
      }
    },
    advanceCoast(seconds){previousState=currentState;const consumed=mission.advanceCoast(seconds);updateTrajectory();currentState=snapshot();return consumed;},
    render(alpha){if(!ready)return;mission.setWarp(loop.warp);currentState.warp=loop.warp;
      ctx.frameDelta=frameDelta;ctx.height=graphics.height;ctx.quality=graphics.quality;
      const active=manager.update({previous:previousState,current:currentState},alpha);
      graphics.draw(active.scene,cameras.camera,currentState.missionTime,manualTime?0:frameDelta*1000);
      audio.update(currentState,cameras.effective,active.audioDistance??0);
      const display={...ui,warp:loop.warp,paused:loop.paused,camera:cameras.selected,cameraName:cameras.name,muted:audio.muted,quality:graphics.quality,pixelRatio:graphics.ratio,fps};
      hud.update(currentState,display);store.setState(currentState);
    }
  });
  function sync(){if(!ready)return;previousState=currentState=snapshot();loop.advance(0);}
  previousState=currentState=snapshot();ready=true;hud.ready(assets.failures);
  let previous=performance.now();graphics.renderer.setAnimationLoop(now=>{const elapsed=Math.max(0,(now-previous)/1000);frameDelta=Math.min(.1,Math.max(.001,elapsed));previous=now;fps=fps*.95+Math.min(120,1/Math.max(.001,elapsed))*.05;loop.advance(manualTime?0:elapsed);});
  window.advanceTime=ms=>{manualTime=true;loop.advance(ms/1000);while(!loop.paused&&loop.backlog+1e-12>=SIM_DT)loop.advance(0);};
  window.render_game_to_text=()=>JSON.stringify({ready,phase:mission.state.phase,camera:cameras.name,cameraIndex:cameras.selected,paused:loop.paused,manualThrottle:ui.manual,help:ui.help,muted:audio.muted,quality:graphics.quality,warp:loop.warp,countdown:countdown.state,telemetry:currentState,backlogSeconds:loop.backlog,performance:{fps:Math.round(fps),drawCalls:graphics.renderer.info.render.calls,triangles:graphics.renderer.info.render.triangles,...graphics.renderer.info.memory},coordinates:'SI metres; Y-up; floating origin at vehicle, radial tangent basis; maps use scaled distances'});
  // Command-only integration surface: no live sim state or phase/time setters.
  window.missionControl={...commands,resumeRealtime(){manualTime=false;previous=performance.now();}};
  function dispose(){if(disposed)return;disposed=true;ready=false;window.removeEventListener('pagehide',dispose);graphics.renderer.setAnimationLoop(null);input.dispose();manager.exit();cameras.dispose();graphics.dispose();assets.dispose();hud.dispose();store.dispose();audio.dispose();delete window.advanceTime;delete window.render_game_to_text;delete window.missionControl;}
  if(import.meta.hot)import.meta.hot.dispose(dispose);window.addEventListener('pagehide',dispose,{once:true});loop.advance(0);
}
