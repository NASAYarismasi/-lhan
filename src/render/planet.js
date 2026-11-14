import * as THREE from 'three';
import { KSC_LATITUDE } from '../sim/constants.js';

const vertex = `varying vec2 vTex; varying vec3 vN; varying vec3 vP;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){vTex=uv; vec4 w=modelMatrix*vec4(position,1.);vP=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;
#include <logdepthbuf_vertex>
}`;
const fragment = `uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 sunDirection; uniform float mars; uniform float air;
varying vec2 vTex; varying vec3 vN; varying vec3 vP;
#include <common>
#include <logdepthbuf_pars_fragment>
void main(){
#include <logdepthbuf_fragment>
vec3 n=normalize(vN); float light=dot(n,sunDirection); vec3 day=texture2D(dayMap,vTex).rgb;
vec3 night=texture2D(nightMap,vTex).rgb; vec3 v=normalize(cameraPosition-vP);
float ocean=(1.-mars)*smoothstep(.01,.10,day.b-day.r); day=mix(day,vec3(.018,.085,.17),ocean*.65);float spec=pow(max(0.,dot(reflect(-sunDirection,n),v)),80.)*ocean*.35;
vec3 col=day*(.035+max(0.,light)*1.65)+night*pow(1.-smoothstep(-.22,.15,light),2.)*(1.-mars)*.8+spec;
float haze=pow(1.-max(0.,dot(n,v)),3.)*air*.85;col=mix(col,mix(vec3(.25,.43,.57),vec3(.42,.27,.15),mars),haze);
gl_FragColor=vec4(col,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function createPlanet(radius, mars, assets) {
  const group = new THREE.Group();
  const surface = new THREE.Mesh(new THREE.SphereGeometry(radius, 112, 72), new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment,
    uniforms: { dayMap: { value: assets.textures[mars ? 'mars-color' : 'earth-day'] }, nightMap: { value: assets.textures['earth-night'] }, sunDirection: { value: new THREE.Vector3(.65,.45,.6).normalize() }, mars: { value: mars ? 1 : 0 }, air: { value: 0 } }
  }));
  group.add(surface);
  let clouds;
  if (!mars) {
    clouds = new THREE.Mesh(new THREE.SphereGeometry(radius + 9000, 96, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: assets.textures.clouds, transparent: true, opacity: .65, depthWrite: false, roughness: 1 }));
    group.add(clouds);
  }
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius + (mars ? 35000 : 65000), 96, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { tint: { value: new THREE.Color(mars ? 0xb38057 : 0x3986ff) }, sunDirection: surface.material.uniforms.sunDirection }, vertexShader: vertex,
    fragmentShader: `uniform vec3 tint;uniform vec3 sunDirection;varying vec3 vN;varying vec3 vP;
    #include <common>
    #include <logdepthbuf_pars_fragment>
    void main(){
    #include <logdepthbuf_fragment>
    float rim=pow(1.-abs(dot(normalize(vN),normalize(cameraPosition-vP))),5.);float lit=smoothstep(-.3,.6,dot(normalize(vN),sunDirection));gl_FragColor=vec4(tint*rim*(.15+lit)*1.4,rim*.7);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`
  })); group.add(atmosphere);
  return { group, surface, update(state, sun) {
    // The mission point is the launch deck / terrain contact reference. Keep the coarse globe below local detail.
    group.position.set(0, -radius - (state.altitude ?? 0) - (mars && state.altitude < 25000 ? 200 : 15), 0);
    // Texture frame follows real planetary rotation, while the observer frame follows the vehicle radial.
    surface.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),(mars?Math.PI/2:Math.PI/2-KSC_LATITUDE)+state.theta);
    surface.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),state.rotation-1.6));
    surface.material.uniforms.air.value=Math.min(1,Math.pow(state.density/(mars?.015:1.225),.28));
    if (clouds) { clouds.rotation.copy(surface.rotation); clouds.rotation.y += .05; clouds.visible = state.altitude > 18000; }
    atmosphere.visible = state.altitude > (mars?50000:80000);
    surface.material.uniforms.sunDirection.value.copy(sun);
  } };
}

export function createSky(assets) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1e8, 32, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: { stars: { value: assets.textures.stars }, air: { value: 1 }, mars: { value: 0 } },
    vertexShader: `varying vec2 vTex;varying vec3 vRay;void main(){vTex=uv;vRay=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D stars;uniform float air;uniform float mars;varying vec2 vTex;varying vec3 vRay;
    void main(){float h=normalize(vRay).y;vec3 zenith=mix(vec3(.035,.16,.34),vec3(.23,.16,.10),mars);vec3 horizon=mix(vec3(.44,.62,.74),vec3(.63,.40,.22),mars);
    vec3 sky=mix(horizon,zenith,pow(max(0.,h),.4));vec3 star=texture2D(stars,vTex).rgb*.11;gl_FragColor=vec4(mix(star,sky,air),1.);}`
  })); sky.renderOrder = -1000; sky.frustumCulled = false;
  return { mesh: sky, update(state, camera) { sky.position.copy(camera.position); sky.material.uniforms.air.value = Math.min(1, Math.pow(state.density / (state.mars ? .015 : 1.225), .28)); sky.material.uniforms.mars.value = state.mars ? 1 : 0; } };
}
