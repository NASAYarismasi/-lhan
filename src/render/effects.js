import * as THREE from 'three';
import { P0 } from '../sim/constants.js';
import { seeded } from './primitives.js';

function plume(color, hydrolox) {
  const uniforms={time:{value:0},power:{value:0},color:{value:new THREE.Color(color)},hydro:{value:hydrolox?1:0},pressure:{value:1}};
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms,
    vertexShader:`varying vec2 vUv;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){vUv=uv;vec3 base=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;vec3 axis=normalize(mat3(modelMatrix)*vec3(0.,1.,0.));float len=length(mat3(modelMatrix)*vec3(0.,1.,0.));float width=length(mat3(modelMatrix)*vec3(1.,0.,0.));vec3 right=normalize(cross(axis,normalize(cameraPosition-base)));vec3 world=base+axis*position.y*len+right*position.x*width;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
    #include <logdepthbuf_vertex>
    }`,
    fragmentShader:`uniform float time,power,hydro,pressure;uniform vec3 color;varying vec2 vUv;
    #include <common>
    #include <logdepthbuf_pars_fragment>
    void main(){
    #include <logdepthbuf_fragment>
    float t=1.-vUv.y;float x=(vUv.x-.5)*2.;float n=sin(x*23.+t*71.-time*37.)*sin(t*117.-time*61.);float radius=.48+.52*t+sin(t*90.-time*43.)*.045*t;float radial=abs(x+sin(t*57.-time*32.)*.035*t)/radius;
    float soft=pow(max(0.,1.-radial*radial),1.7);float fade=pow(1.-t,1.35);float diamonds=pow(.5+.5*cos(t*(55.+20.*pressure)-time*3.),7.);float glow=(1.+n*.25+hydro*diamonds*2.5*pressure)*fade;
    vec3 hot=mix(color,vec3(4.,3.5,2.8),clamp(pow(1.-t,7.)+pow(max(0.,1.-radial),7.)*.35,0.,1.));gl_FragColor=vec4(hot*glow*power,soft*(hydro>.5?.38:.9)*fade*power);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const geometry=new THREE.PlaneGeometry(2,1,1,24);geometry.translate(0,-.5,0);
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  return mesh;
}

/** Cosmetic particles stay in planet-fixed double precision coordinates; origin changes only affect GPU positions. */
export function createEffects(scene) {
  const rig=new THREE.Group();scene.add(rig);const jets=[];
  function jet(type,pos) {const m=plume(type==='srb'?0xff9d3a:type==='retro'?0xffb778:0x637fff,type==='rs25'||type==='icps');m.position.fromArray(pos);rig.add(m);jets.push({type,m});}
  for(const x of [-6.4,6.4])jet('srb',[x,1,0]);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;jet('rs25',[Math.cos(a)*2,0,Math.sin(a)*2]);}
  jet('icps',[0,-.8,0]);jet('transit',[0,-3,0]);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;jet('retro',[Math.cos(a)*4.2,1.5,Math.sin(a)*4.2]);}
  const engineLight=new THREE.PointLight(0xffad57,0,230,2);engineLight.position.set(0,-3,0);scene.add(engineLight);
  const max=2200,positions=new Float32Array(max*3),sizes=new Float32Array(max),colors=new Float32Array(max*4),particles=[],random=seeded(90);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('size',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('color',new THREE.BufferAttribute(colors,4));
  const smoke=new THREE.Points(geometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:false,
    uniforms:{pixelScale:{value:700}},vertexShader:`attribute float size;attribute vec4 color;varying vec4 vColor;uniform float pixelScale;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){vColor=color;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;gl_PointSize=clamp(size*pixelScale/max(1.,-mvPosition.z),0.,350.);
    #include <logdepthbuf_vertex>
    }`,fragmentShader:`varying vec4 vColor;
    #include <common>
    #include <logdepthbuf_pars_fragment>
    void main(){
    #include <logdepthbuf_fragment>
    float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=pow(1.-r*r,2.);gl_FragColor=vec4(vColor.rgb,a*vColor.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`}));smoke.frustumCulled=false;scene.add(smoke);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(11,9,48,1,true),new THREE.MeshBasicMaterial({color:0xe5edee,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));cone.position.y=66;rig.add(cone);
  const plasma=new THREE.Mesh(new THREE.SphereGeometry(8.1,40,24,0,Math.PI*2,Math.PI/2,Math.PI/2),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{heat:{value:0},time:{value:0}},vertexShader:`varying vec3 vN;varying vec3 vP;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){vN=normalMatrix*normal;vec4 p=modelViewMatrix*vec4(position,1.);vP=p.xyz;gl_Position=projectionMatrix*p;
    #include <logdepthbuf_vertex>
    }`,fragmentShader:`uniform float heat,time;varying vec3 vN;varying vec3 vP;
    #include <common>
    #include <logdepthbuf_pars_fragment>
    void main(){
    #include <logdepthbuf_fragment>
    float rim=pow(1.-abs(dot(normalize(vN),normalize(-vP))),1.5);float pulse=.85+.15*sin(vP.x*8.+time*50.);gl_FragColor=vec4(mix(vec3(3.,.18,.015),vec3(2.,1.2,.5),rim)*heat*pulse,(.18+rim*.8)*heat);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`}));plasma.position.y=2;scene.add(plasma);
  let lastTime=null,carry=0,quality=1,processedTime=-Infinity;
  function emit(s,pos,kind) {
    if(particles.length>=max*quality)particles.shift();
    const c=Math.cos(s.theta),sn=Math.sin(s.theta),x=pos[0],y=pos[1];
    particles.push({p:[s.position[0]+x*c+y*sn,s.position[1]-x*sn+y*c,pos[2]],t:s.missionTime+(s.phase==='PRELAUNCH'?s.countdown.time:0),kind,seed:random(),vx:(random()-.35)*(kind==='dust'?14:5),vz:(random()-.5)*8});
  }
  return {setQuality(v){quality=v;}, update(s,height=900){
    const clock=s.missionTime+(s.phase==='PRELAUNCH'?s.countdown.time:0);
    const dt=lastTime===null?0:Math.max(0,clock-lastTime);lastTime=clock;
    rig.rotation.z=s.attitude+s.theta;rig.position.y=['PRELAUNCH','ASCENT'].includes(s.phase)&&!s.stages.find(p=>p.id==='core').attached?-70:0;
    const launch=['PRELAUNCH','ASCENT'].includes(s.phase),solid=launch&&s.phase==='ASCENT'&&s.stages.find(p=>p.id==='srb').attached;
    const core=launch&&s.stages.find(p=>p.id==='core').attached&&(s.engineFiring&&s.throttle>0||s.countdown.running&&s.countdown.time>=-6.5);
    const pressure=Math.max(0,Math.min(1,s.pressure/P0)),expand=Math.min(4,Math.pow(P0/Math.max(10,s.pressure),.16));
    const pre=s.phase==='PRELAUNCH'?Math.min(1,(s.countdown.time+6.5)/5):1;
    for(const {type,m}of jets) {
      const active=type==='srb'?solid:type==='rs25'?core:type==='icps'?s.phase==='ASCENT'&&!s.stages.find(p=>p.id==='core').attached&&s.engineFiring:type==='retro'?s.phase==='EDL'&&s.engineFiring:['TMI_BURN','MOI_BURN'].includes(s.phase);
      m.visible=active;if(!active)continue;
      const power=type==='srb'?Math.min(1,(s.thrust??3e7)/3e7):Math.max(.08,(s.throttle??1)*pre);
      const radius=type==='srb'?3.3:type==='rs25'?1.5:type==='retro'?1:2;
      const length=type==='srb'?70:type==='rs25'?27:type==='retro'?15:30;
      m.scale.set(radius*expand,length*(.65+power*.35),radius*expand);m.material.uniforms.time.value=s.missionTime+(s.phase==='PRELAUNCH'?s.countdown.time:0);m.material.uniforms.power.value=power;m.material.uniforms.pressure.value=pressure;
    }
    engineLight.intensity=(solid?14000:core?7000:s.phase==='EDL'&&s.engineFiring?9000*s.throttle:0)*(.92+.08*Math.sin(s.missionTime*103));
    cone.material.opacity=launch?Math.max(0,1-Math.abs((s.mach??0)-1)/.13)*Math.min(1,s.density/.15)*.22:0;
    plasma.visible=s.phase==='EDL'&&(s.heatFlux??0)>2000;plasma.material.uniforms.heat.value=Math.min(1.6,(s.heatFlux??0)/28000);plasma.material.uniforms.time.value=s.missionTime;plasma.rotation.z=!s.engineFiring?Math.atan2(Math.sqrt(Math.max(0,s.surfaceVelocity**2-s.verticalSpeed**2)),-s.verticalSpeed):0;
    plasma.position.set(0,2,0).applyAxisAngle(new THREE.Vector3(0,0,1),plasma.rotation.z);
    // Samples are captured by the fixed physics loop, so time stepping and real-time flight produce the same trail.
    for(const e of s.exhaust??[]){
      if(e.time<=processedTime||clock-e.time>105)continue;
      const sample={...s,...e,missionTime:e.time,countdown:{...s.countdown,time:e.time}};
      // emit() receives a continuous mission/countdown clock through this explicit phase override.
      sample.phase='ASCENT';
      for(let i=0;i<6*quality;i++){
        const nozzle=new THREE.Vector3((i%2?1:-1)*6.4,-5,0).applyAxisAngle(new THREE.Vector3(0,0,1),e.attitude+e.theta);
        if(e.phase==='ASCENT')emit(sample,nozzle.toArray(),'smoke');
        if(e.altitude<30)for(let j=0;j<2;j++)emit(sample,[(random()-.5)*70,-e.altitude-9,(random()-.5)*45],e.phase==='PRELAUNCH'?'water':'ground');
      }processedTime=e.time;
    }
    if(dt>0&&s.phase==='EDL'&&s.engineFiring&&s.altitude<80) {
      carry+=Math.min(dt,.3)*90*quality;const count=Math.floor(carry);carry-=count;
      for(let i=0;i<count;i++) {
        if(s.mars)emit(s,[(random()-.5)*25,-s.altitude+2,(random()-.5)*25],'dust');
      }
    }
    const c=Math.cos(s.theta),sn=Math.sin(s.theta);let n=0;
    for(let i=particles.length-1;i>=0;i--) {
      const p=particles[i],age=clock-p.t,life=p.kind==='water'?6:p.kind==='dust'?18:100;
      if(age>life){particles.splice(i,1);continue;}
      const dx=p.p[0]+p.vx*age-s.position[0],dy=p.p[1]+Math.min(60,age*1.4)-s.position[1];
      positions[n*3]=dx*c-dy*sn;positions[n*3+1]=dx*sn+dy*c;positions[n*3+2]=p.p[2]+p.vz*age;
      sizes[n]=p.kind==='water'?1+age:7+age*(p.kind==='ground'?5:2.4);
      const shade=.42+p.seed*.22;colors.set(p.kind==='dust'?[.47,.28,.14,(1-age/life)*.35]:p.kind==='water'?[.8,.88,.9,(1-age/life)*.25]:[shade+.08,shade+.07,shade+.04,(1-age/life)*.43],n*4);n++;
    }
    geometry.setDrawRange(0,n);geometry.attributes.position.needsUpdate=true;geometry.attributes.size.needsUpdate=true;geometry.attributes.color.needsUpdate=true;smoke.material.uniforms.pixelScale.value=height;
  }};
}
