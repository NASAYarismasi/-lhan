export function addPowerCables(T, farm, height, sites, tables, inverters) {
  const dc=new T.MeshStandardMaterial({color:0x502b20,roughness:.83})
  const ac=new T.MeshStandardMaterial({color:0x23343e,roughness:.82})
  const metal=new T.MeshStandardMaterial({color:0x666e6a,metalness:.45,roughness:.58})
  const cable=(points,radius,material)=>{
    const path=new T.CurvePath()
    for(let i=1;i<points.length;i++) {
      const [x,z,y=height(points[i][0],points[i][1])+radius]=points[i]
      const [px,pz,py=height(points[i-1][0],points[i-1][1])+radius]=points[i-1]
      const start=new T.Vector3(px,py,pz),end=new T.Vector3(x,y,z)
      if(start.distanceToSquared(end)>1e-8) path.add(new T.LineCurve3(start,end))
    }
    const mesh=new T.Mesh(new T.TubeGeometry(path,Math.max(16,Math.ceil(path.getLength()*2)),radius,6,false),material)
    mesh.receiveShadow=true
    farm.add(mesh)
  }
  // Buried runs are logical routes. Only the protected risers are rendered.
  const buriedRuns=[]
  const riser=(x,z)=>{
    const collar=new T.Mesh(new T.CylinderGeometry(.12,.15,.16,12),metal)
    collar.position.set(x,height(x,z)+.07,z)
    collar.receiveShadow=true
    farm.add(collar)
  }
  const buried=(start,end,route,radius,material)=>{
    buriedRuns.push({start,end,route,depth:.55})
    for(const points of [start,end]){
      const [x,z]=points.at(-1)
      cable([...points,[x,z,height(x,z)-.08]],radius,material)
      riser(x,z)
    }
  }
  const cabinet=(x,z,w,h,d)=>{
    const box=new T.Mesh(new T.BoxGeometry(w,h,d),metal)
    box.position.set(x,height(x,z)+h/2,z)
    box.castShadow=box.receiveShadow=true
    farm.add(box)
    return height(x,z)+h*.62
  }
  const counts=Array(inverters.length).fill(0)
  const groups=tables.map((table,index)=>{
    const feeds=new Set()
    for(let panel=0;panel<10;panel++){
      const inverter=Math.floor((index*10+panel)/42)
      counts[inverter]++
      feeds.add(inverter)
    }
    return [...feeds]
  })
  tables.forEach(({x,y,z},index)=>{
    groups[index].forEach((feed,branch)=>{
      const lane=z+2.46+feed*.061
      const corridor=21+feed*.086
      const target=inverters[feed]
      const entry=target.z+1.79
      const dx=x+(branch-.5)*.20
      buried([[dx,z+1.55,y+1.25]],[[target.x-.64,entry,target.y+.29]],
        [[dx,lane],[corridor,lane],[corridor,entry]],.039,dc)
    })
  })
  const busX=34
  const busZ=14
  const busY=cabinet(busX-1.45,busZ,2.8,1.5,.8)
  const trayY=height(busX,busZ)+.19

  for(let index=0;index<inverters.length;index++){
    const {x,y,z}=inverters[index]
    const exit=z+2.04+Math.floor(index/5)*.19
    const trunk=31.32+index*.27
    buried([[x+.63,z+.9,y+.34],[x+.63,z+1.10,y+.16]],
      [[trunk,busZ-.38,trayY],[trunk,busZ-.57,trayY]],
      [[x+.63,exit],[trunk,exit]],.045,ac)
  }
  const switchX=busX+1.55
  const switchZ=busZ+.17
  const switchY=cabinet(switchX,switchZ,.55,1.18,.51)
  const lever=new T.Mesh(new T.BoxGeometry(.11,.30,.12),new T.MeshStandardMaterial({color:0xd44d39}))
  lever.position.set(switchX,switchY,switchZ+.27)
  farm.add(lever)
  const switchPosition=lever.position.clone()
  cable([[busX-1.45,busZ+.40,busY],[switchX,switchZ-.27,switchY]],.065,ac)
  const loads=[
    {key:"greenhouse",site:sites.greenhouse,xOffset:-5.16,zOffset:2.7,waypoints:[[35,15.8],[65,15.8],[65,-18.3]]},
    {key:"water",site:sites.water,xOffset:5.12,zOffset:0,waypoints:[[36,16.17],[130,16.17],[130,-72]]},
    {key:"moxie",site:sites.moxie,xOffset:4.7,zOffset:1,waypoints:[[34,16],[84,16],[84,-40]]},
    {key:"habitat",site:sites.habitat,xOffset:2.8,zOffset:4.2,waypoints:[[33,16],[49,16],[49,-41.8]]}
  ]
  const analyzers={}
  for(const [index,{key,site,xOffset,zOffset,waypoints}] of loads.entries()) {
    if(!site) continue
    const x=site.x+xOffset,z=site.z+zOffset
    const y=cabinet(x,z,.62,.83,.38)
    const [endX]=waypoints.at(-1)
    const display=document.createElement("canvas")
    display.width=512
    display.height=480
    const texture=new T.CanvasTexture(display)
    texture.colorSpace=T.SRGBColorSpace
    const screen=new T.Mesh(new T.PlaneGeometry(.53,.49),new T.MeshBasicMaterial({map:texture}))
    screen.position.set(x,height(x,z)+.51,z+.195)
    farm.add(screen)
    analyzers[key]={ctx:display.getContext("2d"),texture}
    const terminalX=x-Math.sign(xOffset)*.30
    const portX=switchX+(index-.5)*.22
    const entry=index<2?[[portX,switchZ+.23,switchY],[portX,switchZ+.48,switchY-.17]]:
      [[busX-1.45+(index-2.5)*.4,busZ+.4,busY],[busX-1.45+(index-2.5)*.4,busZ+.7,busY-.18]]
    buried(entry,
      [[terminalX,z,y],[terminalX,z+.28,y-.12]],
      [...waypoints,[endX,z]],.067,ac)
  }
  return {counts,buriedRuns,analyzers,switchPosition,setClosed(closed){lever.rotation.x=closed?-.72:.72}}
}
