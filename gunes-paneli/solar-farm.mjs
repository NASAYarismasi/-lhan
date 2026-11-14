import * as T from 'three';
export const SOLAR={rows:6,columns:7,tables:42,panelsPerTable:10,panelArea:2,area:840,siteWidth:50,siteDepth:58,efficiency:.25,yieldFactor:.8,irradiation:2.5,demand:413,battery:250,usableFraction:.8,batteryEfficiency:.9,nightLoad:10.7,nightHours:12.33};
export function energyBalance(sunFactor=1){const generated=SOLAR.area*SOLAR.efficiency*SOLAR.irradiation*SOLAR.yieldFactor*sunFactor;return {generated,balance:generated-SOLAR.demand,usableBattery:SOLAR.battery*SOLAR.usableFraction*SOLAR.batteryEfficiency,nightDemand:SOLAR.nightLoad*SOLAR.nightHours};}
function surfaceTexture(){const c=document.createElement('canvas');c.width=1500;c.height=1200;const x=c.getContext('2d');x.fillStyle='#a6afb5';x.fillRect(0,0,c.width,c.height);for(let col=0;col<5;col++)for(let row=0;row<2;row++){const px=col*300+7,py=row*600+7;x.fillStyle='#0a1425';x.fillRect(px,py,286,586);for(let a=0;a<6;a++)for(let b=0;b<12;b++){const cx=px+5+a*46,cy=py+5+b*48;const g=x.createLinearGradient(cx,cy,cx+44,cy+46);g.addColorStop(0,'#15395a');g.addColorStop(.5,'#17304c');g.addColorStop(1,'#0a1d32');x.fillStyle=g;x.fillRect(cx,cy,43,45);x.strokeStyle='#44617b';x.lineWidth=.45;for(let k=1;k<5;k++){x.beginPath();x.moveTo(cx,cy+k*8);x.lineTo(cx+43,cy+k*8);x.stroke()}x.fillStyle='#92a6b277';x.fillRect(cx+13,cy,.7,45);x.fillRect(cx+29,cy,.7,45);}x.fillStyle='#d8dadd';x.font='11px monospace';x.fillText(`PV ${row*5+col+1}`,px+8,py+582);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
export function createSolarFarm(scene,heightAt,obstacles){
 const center={x:-62,z:52},level=heightAt(center.x,center.z),group=new T.Group();group.name='MarsSolarFarm';group.position.set(center.x,level,center.z);scene.add(group);
 const suit=new T.MeshStandardMaterial({color:0xb8b6ab,metalness:.65,roughness:.4}),dark=new T.MeshStandardMaterial({color:0x333d45,metalness:.6,roughness:.55}),orange=new T.MeshStandardMaterial({color:0xc98945,roughness:.8});
 function box(w,h,d,x,y,z,mat=suit,parent=group){const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 // Keep original textured Martian terrain exposed beneath every table.
 const face=new T.MeshStandardMaterial({map:surfaceTexture(),metalness:.35,roughness:.24});
 const beamGeo=new T.BoxGeometry(5.1,.08,.07),crossGeo=new T.BoxGeometry(.07,.08,4.1),faceGeo=new T.PlaneGeometry(5,4),postGeo=new T.CylinderGeometry(.045,.065,1,8),footGeo=new T.BoxGeometry(.36,.10,.36);
 const backs=new T.InstancedMesh(new T.BoxGeometry(5,.05,4),dark,42);
 const faces=new T.InstancedMesh(faceGeo,face,42),rails=new T.InstancedMesh(beamGeo,suit,84),sides=new T.InstancedMesh(crossGeo,suit,84),posts=new T.InstancedMesh(postGeo,dark,168),feet=new T.InstancedMesh(footGeo,dark,168);
 for(const mesh of [backs,faces,rails,sides,posts,feet]){mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;group.add(mesh)}
 const dummy=new T.Object3D(),table=new T.Object3D();let n=0,p=0;
 const bounds=[];
 for(let row=0;row<6;row++)for(let col=0;col<7;col++){
  const x=(col-3)*6,z=(row-2.5)*8;table.position.set(x,2.25,z);table.rotation.x=.55;table.updateMatrix();backs.setMatrixAt(n,table.matrix);
  dummy.position.set(0,.045,0);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();faces.setMatrixAt(n,new T.Matrix4().multiplyMatrices(table.matrix,dummy.matrix));
  for(let s=0;s<2;s++){dummy.position.set(0,0,s?2.04:-2.04);dummy.rotation.set(0,0,0);dummy.updateMatrix();rails.setMatrixAt(n*2+s,new T.Matrix4().multiplyMatrices(table.matrix,dummy.matrix));dummy.position.set(s?2.54:-2.54,0,0);dummy.updateMatrix();sides.setMatrixAt(n*2+s,new T.Matrix4().multiplyMatrices(table.matrix,dummy.matrix));}
  for(const dx of [-1.9,1.9])for(const dz of [-1.4,1.4]){const point=new T.Vector3(dx,-.05,dz).applyMatrix4(table.matrix);const height=point.y-.12;dummy.position.set(point.x,.12+height/2,point.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,height,1);dummy.updateMatrix();posts.setMatrixAt(p,dummy.matrix);dummy.position.y=.12;dummy.scale.set(1,1,1);dummy.updateMatrix();feet.setMatrixAt(p,dummy.matrix);p++;}
  bounds.push(new T.Box3(new T.Vector3(center.x+x-2.65,level,center.z+z-2),new T.Vector3(center.x+x+2.65,level+3,center.z+z+2)));
  n++;
 }
 obstacles.push(...bounds);
 const cablePoints=[];for(let i=0;i<=60;i++){const t=i/60,x=-40+40*t,z=26-20*t;cablePoints.push(new T.Vector3(x,heightAt(x,z)+.16,z));}const cable=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(cablePoints),100,.10,6,false),orange);scene.add(cable);
 // Accessible service lane and insulated power trunks, kept clear of module rows.
 const conduit=box(.18,.14,52,22,.18,0,dark);box(.055,.16,52,22,.18,0,orange);
 for(let r=0;r<6;r++)box(42,.10,.12,0,.15,(r-2.5)*8+3.2,dark);
 for(const z of [-28,28])for(const x of [-24,24]){box(.10,1.3,.10,x,.7,z,orange);box(.22,.16,.22,x,1.4,z,new T.MeshStandardMaterial({color:0xe6c690,emissive:0x6a3710,emissiveIntensity:.4}));}
 // Ten 25-kWh conceptual thermal cabinets; mass/thermal validation is pending.
 for(let i=0;i<10;i++){
  const x=29+Math.floor(i/5)*6,z=(i%5-2)*4.5;
  const corners=[[-1.5,-1],[-1.5,1],[1.5,-1],[1.5,1]];
  const base=Math.max(...corners.map(([dx,dz])=>heightAt(center.x+x+dx,center.z+z+dz)))-level+.55;
  const body=box(2.8,2.3,1.6,x,base+1.15,z,dark);
  box(2.68,2.15,.08,x,base+1.15,z+.85,suit);
  box(2.68,.16,.09,x,base+1.93,z+.91,orange);
  box(.12,.45,.12,x-.9,base+1.05,z+.97,dark);
  box(.12,.45,.12,x+.9,base+1.05,z+.97,dark);
  for(let k=0;k<4;k++)box(1.7,.045,.10,x,base+.3+k*.13,z+.94,dark);
  for(const dx of [-1,1])for(const dz of [-.55,.55]){
    const ground=heightAt(center.x+x+dx,center.z+z+dz)-level;
    const legHeight=base-ground;
    box(.13,legHeight,.13,x+dx,ground+legHeight/2,z+dz,suit);
    box(.4,.1,.4,x+dx,ground+.05,z+dz,dark);
  }
  obstacles.push(new T.Box3(new T.Vector3(center.x+x-1.5,level+base-.55,center.z+z-1),new T.Vector3(center.x+x+1.5,level+base+2.4,center.z+z+1)));
 }

 box(.18,.14,26,29,.18,0,dark);box(8,.14,.18,26,.18,-13,dark);

 box(1.8,2.1,1.1,29,1.18,-15,suit);box(1.1,.65,.06,29,1.4,-14.42,new T.MeshStandardMaterial({color:0x13272e,emissive:0x244a40,emissiveIntensity:.3}));
 const buttons=document.querySelectorAll('[data-solar-weather]');
 function refresh(factor){if(!document.getElementById('solar-generated')||!document.getElementById('solar-balance')||!document.getElementById('solar-note'))return;const e=energyBalance(factor);const f=v=>v.toLocaleString('tr-TR',{maximumFractionDigits:1});document.getElementById('solar-generated').textContent=f(e.generated)+' kWh/sol';document.getElementById('solar-balance').textContent=(e.balance>=0?'+':'')+f(e.balance)+' kWh/sol';document.getElementById('solar-balance').style.color=e.balance>=0?'#83dfb0':'#ffb896';document.getElementById('solar-note').textContent=factor===1?'Açık hava varsayımı. Üretim payı dar; yerel ölçümler gereklidir.':'Örnek fırtına: güneş üretimi %80 azaldı. Tam yükte bu kapasite sürdürülemez; rezerv ve yük azaltma gerekir.';buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.solarWeather)===factor)));}
 buttons.forEach(b=>b.addEventListener('click',()=>refresh(Number(b.dataset.solarWeather))));refresh(1);
 return {center,level,group};
}
