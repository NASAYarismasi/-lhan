import {bindProjection} from "./live-projection.mjs"
import {bindBlackStart} from "./black-start.mjs"
import {drawGroupHmi} from "./group-hmi.mjs"
import {createGridState, stepMicrogrid, payForSweep} from "./live-grid.mjs"
import { weatherForSol } from "./mars-weather.mjs"
import { addPowerCables } from "./power-cables.mjs"
import { powerForecast, DAYLIGHT_HOURS, DRILL_HOURS, SOL_HOURS, solarDay } from "./mars-power.mjs"
export function addSolarFarm(T, scene, terrainHeight, obstacles, destinations) {
  // Adapted from Samet's solar preview in 0e3352a87baebff83558045dcb539462d3ecf4f7.
  const farm = new T.Group()
  farm.name = "MarsSolarFarm"
  const x0 = -57, z0 = 46
  const level = terrainHeight(x0, z0)
  farm.position.set(x0, level, z0)
  scene.add(farm)
  const cells = document.createElement("canvas")
  cells.width = 500
  cells.height = 400
  const ctx = cells.getContext("2d")
  ctx.fillStyle = "#8a8981"
  ctx.fillRect(0, 0, 500, 400)
  for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) {
    const x = col * 100, y = row * 200
    ctx.fillStyle = (row + col) % 2 ? "#172b47" : "#1f3452"
    ctx.fillRect(x + 3, y + 3, 94, 194)
    ctx.fillStyle = "#4a607a"
    for (let line = 1; line < 16; line++) ctx.fillRect(x + 5, y + line * 12, 90, 1)
    ctx.fillRect(x + 49, y + 4, 1, 192)
  }
  const texture = new T.CanvasTexture(cells)
  texture.colorSpace = T.SRGBColorSpace
  texture.anisotropy = 8
  const frame = new T.MeshStandardMaterial({color:0x686b66, metalness:.58, roughness:.48})
  const panel = new T.MeshStandardMaterial({map:texture, metalness:.26, roughness:.34})
  const part = (parent, geometry, material, x, y, z) => {
    const mesh = new T.Mesh(geometry, material)
    mesh.position.set(x,y,z)
    mesh.receiveShadow = mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }
  const back = new T.BoxGeometry(5,.09,4)
  const face = new T.PlaneGeometry(5,4).rotateX(-Math.PI/2)
  const column = new T.BoxGeometry(.13,1,.13)
  const footing = new T.BoxGeometry(.44,.14,.44)
  const tables=[]
  const wipers=[]
  const dustMaterials=Array.from({length:6},()=>new T.MeshBasicMaterial({
    color:0xab7957,transparent:true,opacity:0,depthWrite:false
  }))
  const railGeometry=new T.BoxGeometry(.055,.065,4.05)
  const bladeGeometry=new T.BoxGeometry(4.92,.065,.11)
  const dustGeometry=new T.PlaneGeometry(4.96,3.96).rotateX(-Math.PI/2)
  for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
    const x = (col - 3) * 6, z = (row - 2.5) * 8
    const y = terrainHeight(x0 + x, z0 + z) - level
    const table = new T.Group()
    tables.push({x,y,z})
    table.position.set(x,y+2.25,z)
    table.rotation.x = .55
    farm.add(table)
    part(table,back,frame,0,0,0)
    part(table,face,panel,0,.052,0)
    const dust=part(table,dustGeometry,dustMaterials[row],0,.057,0)
    dust.castShadow=false
    for(const side of [-1,1]) part(table,railGeometry,frame,side*2.49,.105,0)
    const blade=part(table,bladeGeometry,frame,0,.105,-1.94)
    blade.castShadow=false
    wipers.push(blade)
    for (const dx of [-1.9,1.9]) for (const dz of [-1.4,1.4]) {
      const groundZ = z + dz * Math.cos(table.rotation.x)
      const ground = terrainHeight(x0+x+dx,z0+groundZ)-level
      const top = y + 2.2 - dz * Math.sin(table.rotation.x)
      const height = Math.max(.1,top-ground)
      part(farm,column,frame,x+dx,ground+height/2,groundZ).scale.y = height
      part(farm,footing,frame,x+dx,ground+.035,groundZ)
    }
    obstacles.push(new T.Box3(
      new T.Vector3(x0+x-2.68,level+y,z0+z-1.93),
      new T.Vector3(x0+x+2.68,level+y+3.4,z0+z+1.93)))
  }
  const cabinet=new T.BoxGeometry(2.8,2.3,1.6)
  const enclosure=new T.MeshStandardMaterial({color:0xa4aa9e,metalness:.42,roughness:.66})
  const terminal=new T.MeshStandardMaterial({color:0x252d32,roughness:.76})
  const hazard=new T.MeshStandardMaterial({color:0xd0a14a,roughness:.71})
  const displays=Array.from({length:5},()=>{
    const canvas=document.createElement("canvas")
    canvas.width=768
    canvas.height=384
    const texture=new T.CanvasTexture(canvas)
    texture.colorSpace=T.SRGBColorSpace
    return {canvas,texture,detail:false,material:new T.MeshBasicMaterial({map:texture})}
  })
  const inverters=[]
  const hmiTargets=[]
  const faceplate=new T.BoxGeometry(1.04,.56,.055)
  const glass=new T.PlaneGeometry(.92,.46)
  for(let i=0;i<10;i++) {
    const x=23+4*Math.floor(i/5),z=(i%5-2)*4.5
    const ground=terrainHeight(x0+x,z0+z)
    const rack=new T.Group()
    inverters.push({x,y:ground-level,z})
    rack.position.set(x,ground-level,z)
    farm.add(rack)
    part(rack,cabinet,enclosure,0,1.34,0)
    part(rack,new T.BoxGeometry(2.9,.19,1.71),terminal,0,.17,0)
    part(rack,new T.BoxGeometry(2.72,2.12,.06),terminal,0,1.34,.81)
    for(const side of [-.68,.68]) {
      part(rack,new T.BoxGeometry(1.29,2.05,.07),enclosure,side,1.34,.856)
      part(rack,new T.BoxGeometry(.06,.32,.07),terminal,side*.28,1.25,.91)
      for(let slot=0;slot<6;slot++) part(rack,new T.BoxGeometry(.85,.035,.025),terminal,side,.50+slot*.083,.903)
    }
    part(rack,new T.BoxGeometry(.18,.14,.04),hazard,-.88,1.76,.91)
    const groupIndex=Math.floor(i/2)
    part(rack,faceplate,terminal,.67,1.91,.924)
    const monitor=part(rack,glass,displays[groupIndex].material,.67,1.91,.955)
    monitor.userData.groupIndex=groupIndex
    hmiTargets.push(monitor)
    monitor.castShadow=false
    part(rack,new T.BoxGeometry(1.05,1.25,.56),terminal,-.63,.68,1.51)
    part(rack,new T.BoxGeometry(.94,1.13,.06),enclosure,-.63,.68,1.82)
    part(rack,new T.BoxGeometry(.64,.075,.035),hazard,-.63,1.1,1.86)
    for(let vent=0;vent<6;vent++) part(rack,new T.BoxGeometry(.68,.04,.035),terminal,-.63,.45+vent*.07,1.86)
    const label=document.createElement("canvas")
    label.width=256; label.height=80
    const ctx=label.getContext("2d")
    ctx.fillStyle="#263033";ctx.fillRect(0,0,256,80)
    ctx.fillStyle="#ddf1ed";ctx.font="bold 30px monospace";ctx.fillText("G"+(Math.floor(i/2)+1)+" / DC > AC",18,35)
    ctx.font="23px monospace";ctx.fillText(i<2?"42 / AC BARA":"42 / AC BARA",25,66)
    const texture=new T.CanvasTexture(label)
    texture.colorSpace=T.SRGBColorSpace
    part(rack,new T.PlaneGeometry(.68,.21),new T.MeshBasicMaterial({map:texture}),-.63,.93,1.87)
    rack.updateWorldMatrix(true,true)
    obstacles.push(new T.Box3().setFromObject(rack).expandByScalar(.12))
  }
  const wiring=destinations ? addPowerCables(T,farm,
    (x,z)=>terrainHeight(x0+x,z0+z)-level,
    Object.fromEntries(Object.entries(destinations).map(([key,site])=>[key,{x:site.x-x0,z:site.z-z0}])),
    tables,inverters) : null
  const weatherButtons=document.querySelectorAll("[data-solar-weather]")
  const moment=document.getElementById("battery-moment")
  const fmt=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:1})
  let transmission=1
  const livePanel=document.getElementById("live-grid")
  const recovery=bindBlackStart(document.getElementById("black-start"))
  const grid=createGridState()
  const faults={greenhouse:false,water:false}
  const lampControl=livePanel?.querySelector("[name=live-lamp]")
  const drillControl=livePanel?.querySelector("[name=live-drill]")
  let live=null, jammedRow=-1, nextSweepAt=0, lastSolReport=""
  const jamRow=()=>{
    jammedRow=2
    const button=livePanel?.querySelector("[data-jam]")
    if(button) button.textContent="3. sıranın rayını aç"
  }
  livePanel?.querySelector("[data-jam]")?.addEventListener("click",event=>{
    if(jammedRow<0) jamRow()
    else {
      jammedRow=-1
      event.currentTarget.textContent="3. sıra ray sıkışmasını dene"
    }
  })
  for(const control of livePanel?.querySelectorAll("[data-fault]") ?? []) {
    control.addEventListener("click",()=>{
      const key=control.dataset.fault
      faults[key]=!faults[key]
      control.setAttribute("aria-pressed",String(faults[key]))
      control.textContent=(key==="water"?"Sondaj":"Sera")+(faults[key]?" · Kesiciyi sıfırla":" · Kesici açmasını dene")
    })
  }
  const demo=document.getElementById("wiper-demo")
  let panelDust=demo?.hidden===false?.24:0, cleaningKWh=0, sweepStart=null
  const rowDust=[.8,1.1,.91,1.24,1.02,.93].map(factor=>panelDust*factor)
  let demoStart=null, demoFinished=false
  const controls=document.getElementById("panel-cleaning")
  const status=controls?.querySelector("[role=status]")
  const numberDust=value=>Math.round(value*100)+"%"
  function showDust() {
    panelDust=rowDust.reduce((sum,value)=>sum+value,0)/rowDust.length
    dustMaterials.forEach((material,index)=>{material.opacity=rowDust[index]*.85})
    if(controls) controls.dataset.dust=String(panelDust)
    if(status) status.textContent="Panel kaybı "+numberDust(panelDust)+
      " · "+(sweepStart===null?"Silecekler parkta":"Temizlik çevrimi çalışıyor")+
      " · Temizlik enerji bütçesi "+cleaningKWh.toFixed(2)+" kWh"
  }
  function startSweep() {
    if(sweepStart!==null || panelDust<=.001 || transmission<=0) return
    if(livePanel && (!live || !live.daylight || performance.now()<nextSweepAt || !payForSweep(grid,live.reserve))) return
    sweepStart=performance.now()
    showDust()
  }
  demo?.parentElement.querySelector("button")?.addEventListener("click",()=>{
    rowDust.fill(.24)
    demoFinished=false
    demoStart=null
    cleaningKWh=0
    demo.textContent="Silecekler başlamak üzere"
    showDust()
    update()
  })
  const weatherStatus=document.getElementById("mars-weather")
  const solDurationMs=SOL_HOURS*3600000
  const stepMs=1000
  const previewHours=Number(document.getElementById("charging-preview")?.dataset.hours ?? 0)
  let sol=0,previousFrame=null,elapsedInSol=previewHours*3600000,pendingMs=0,lastDisplay=-Infinity
  document.addEventListener("visibilitychange",()=>{previousFrame=null})
  function advanceWeather(now) {
    const elapsed=previousFrame===null?0:Math.max(0,now-previousFrame)
    previousFrame=now
    if(!weatherStatus || document.hidden) return
    pendingMs+=elapsed
    const step=(start,end)=>{
      if(!livePanel || end<=start) return
      const dt=(end-start)/3600000
      const hour=(start+end)/7200000
      const seasonValue=Number(season?.value ?? 0)
      const daylight=hour<solarDay(seasonValue).daylight
      live=recovery?.step(grid,daylight,dt*3600) ?? stepMicrogrid(grid,hour,dt,{
        season:Number(season?.value ?? 0),transmission,panelDust,rowDust,closed,faults,
        lamp:Number(lampControl?.value ?? 1),drill:drillControl?.checked ?? true
      })
    }
    while(pendingMs>=stepMs) {
      pendingMs-=stepMs
      const end=Math.min(solDurationMs,elapsedInSol+stepMs)
      step(elapsedInSol,end)
      const remainder=elapsedInSol+stepMs-end
      elapsedInSol=end
    if(elapsedInSol>=solDurationMs) {
      if(livePanel) {
        grid.dawn=grid.battery
        lastSolReport="Sol "+(sol+1)+" sabahı: "+number.format(grid.dawn)+" kWh kaldı · habitat açığı "+number.format(grid.dailyShortfall)+" kWh"
        lastSolReport+=" · Gece depodan sera "+number.format(grid.nightDraw.greenhouse)+
          " kWh, sondaj "+number.format(grid.nightDraw.water)+" kWh"
        grid.nightDraw={greenhouse:0,water:0,moxie:0}
        grid.dailyShortfall=0
      }
      elapsedInSol=remainder
      sol++
      const deposition=transmission<=.2?.12:transmission<1?.03:.002
      for(let row=0;row<rowDust.length;row++)
        rowDust[row]=Math.min(.8,rowDust[row]+deposition*(.76+((row+sol)%6)*.096))
      transmission=weatherForSol(sol)
      cleaningKWh=0
      weatherStatus.dataset.sunlight=String(transmission)
      weatherStatus.dataset.sol=String(sol)
      showDust()
      update()
      step(0,elapsedInSol)
    }
    }
    if(demo && demoStart===null) demoStart=now
    if(panelDust>=.12 && (!demo || (!demoFinished && now-demoStart>=1800))) startSweep()
    const hours=elapsedInSol/3600000
    const minute=Math.floor(hours*60)
    if(now-lastDisplay<1000) return
    lastDisplay=now
    const name=transmission===1?"Açık":transmission===.6?"Tozlu pus":"Toz fırtınası"
    weatherStatus.textContent="Sol "+(sol+1)+" · "+name+" · Gün doğumundan beri "+
      Math.floor(minute/60)+" sa "+minute%60+" dk "+Math.floor(elapsedInSol/1000)%60+" sn"
    if(clock) clock.value=String(hours)
    updateMeters()
    if(livePanel && live) {
      livePanel.querySelector("output").textContent=
        (live.backupActive?"Gece yedeği hazır · ":"")+"PV "+number.format(live.production)+" kW · Batarya "+number.format(grid.battery)+" kWh · Gece hedefi "+
        number.format(live.reserve)+" kWh · Kabin "+number.format(grid.temperature)+" °C · Isıtıcı "+
        number.format(live.heater)+" kW · Su "+number.format(grid.water)+" L · MOXIE "+number.format(grid.oxygen)+" kg O₂ · "+
        (jammedRow>=0?"3. sıra sıkışmış · ":"")+
        (panelDust>=.12&&sweepStart===null?"Temizlik bekliyor · ":"")+lastSolReport
      const reserveDisplay=document.getElementById("night-reserve-details")
      if(reserveDisplay) {
        const details=live.reserveDetails
        reserveDisplay.textContent=details?
          "Hedef "+number.format(details.total)+" kWh · Habitat "+number.format(details.habitat)+
          " · Isıtıcı "+number.format(details.heating)+" · Kablo "+number.format(details.cable)+
          " · Deşarj kaybı "+number.format(details.conversion)+" kWh · "+
          (grid.battery>=details.total?"Rezerv karşılanıyor":
            "Eksik "+number.format(details.total-grid.battery)+" kWh"):
          "Acil besleme etkin · Normal gece rezervi hesabı beklemede."
      }
      const flexibility=document.getElementById("grid-flexibility")
      if(flexibility) flexibility.textContent=live.transfers?.length?
        live.transfers.map(link=>"G"+link.from+" → G"+link.to+" · "+number.format(link.kw)+" kW").join(" | "):
        "Bu anda gruplar arası gündüz desteği yok."
      const totals=document.getElementById("grid-load-energy")
      if(totals) totals.textContent=["habitat","greenhouse","moxie","water"].map((key,index)=>
        ["Habitat","Sera","MOXIE","Sondaj"][index]+" "+number.format(grid.loadEnergy[key])+" kWh").join(" · ")
      drawBattery()
    }
  }
  function updateWipers(now) {
    advanceWeather(now)
    if(sweepStart===null) return
    const elapsed=(now-sweepStart)/1000
    const progress=Math.max(0,Math.min(1,elapsed/4))
    const travel=1-Math.abs(2*progress-1)
    wipers.forEach((blade,index)=>{if(Math.floor(index/7)!==jammedRow) blade.position.z=-1.94+3.88*travel})
    if(demo){
      demo.dataset.travel=String(travel)
      demo.textContent=progress<.5?"Fırça aşağı iniyor":"Fırça yukarı dönüyor"
    }
    if(progress===1) {
      sweepStart=null
      for(let row=0;row<rowDust.length;row++) if(row!==jammedRow) rowDust[row]*=.25
      nextSweepAt=now+60000
      if(demo){
        demoFinished=true
        demo.textContent="Temizlik tamamlandı · Panel kaybı %24 → %6"
      }
      cleaningKWh=.20
      showDust()
      update()
    }
  }
  showDust()
  let closed=true
  const breaker=document.getElementById("main-breaker")
  function toggleBreaker() {
    closed=!closed
    update()
    document.dispatchEvent(new CustomEvent("mars-breaker",{detail:closed}))
  }
  breaker?.addEventListener("click",toggleBreaker)
  const season=document.getElementById("mars-season")
  season?.addEventListener("change",update)
  const clock=document.getElementById("meter-hour")
  const gasFormat=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:4})
  function moxieRows(gas) {
    const f=value=>gasFormat.format(value)
    return [
      "CO₂ giriş  "+f(gas.intakeKgHour*1000)+" g/sa",
      "CO₂ toplam  "+f(gas.intakeTotalKg)+" kg",
      "O₂ üretim  "+f(gas.oxygenKgHour*1000)+" g/sa",
      "O₂ tanklar  "+f(gas.tankKg)+" / 15 kg",
      "Tank A / B  "+f(gas.tankKg/2)+" / "+f(gas.tankKg/2)+" kg"
    ]
  }
  const number=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2})
  let forecast
  function updateMeters() {
    if(!forecast) return
    const hour=Number(clock?.value ?? 12.33)
    const time=document.getElementById("meter-time")
    if(time) {
      const minutes=Math.round(hour*60)
      time.textContent=String(Math.floor(minutes/60)).padStart(2,"0")+":"+
        String(minutes%60).padStart(2,"0")+" · "+(hour<forecast.daylight?"Gündüz":"Gece")
    }
    const gas=live?.gas ?? {intakeKgHour:0,oxygenKgHour:0,tankKg:grid.oxygen,intakeTotalKg:grid.co2Intake}
    const gasRows=moxieRows(gas)
    const telemetry=document.getElementById("moxie-process")
    if(telemetry) telemetry.textContent=gasRows.join(" · ")
    const readings=livePanel&&live?{greenhouse:live.greenhouse,water:live.water,moxie:live.moxie,habitat:live.habitat}:forecast.readMeters(hour)
    for(const [key,meter] of Object.entries(readings)) {
      if(!meter) continue
      const status=meter.fault?"KESİCİ ATTI":!closed&&(key==="water"||key==="greenhouse")?"HAT KESİK":meter.duty>.999?"ÇALIŞIYOR":meter.duty>0?"KISMİ BESLEME":"BEKLEMEDE"
      const rows=[
        status,
        "Yük "+number.format(meter.consumption)+" kW",
        "Kayıp "+number.format(meter.loss*1000)+" W",
        "Çıkış "+number.format(meter.supply)+" kW",
        "Akım "+number.format(meter.current)+" A",
        "Kayıp oranı %"+number.format(meter.supply?100*meter.loss/meter.supply:0)
      ]
      if(livePanel && live) rows.push(
        "Kaynak "+(meter.sources?.length?meter.sources.map(index=>"G"+index).join(" / "):"—"),
        "Depodan "+number.format(meter.batteryPower)+" kW",
        "Gece toplam "+number.format(meter.nightEnergy)+" kWh")
      if(meter.kva!==undefined) rows.splice(3,0,
        "Q "+number.format(meter.kvar)+" kvar · S "+number.format(meter.kva)+" kVA",
        "Güç faktörü "+(meter.pf===null?"—":number.format(meter.pf)))
      const label=document.getElementById("meter-"+key)
      if(label) label.textContent=(meter.demand===undefined?"":"Talep "+number.format(meter.demand)+" kW · ")+rows.join(" · ")
      const analyzer=wiring?.analyzers[key]
      if(!analyzer) continue
      const {ctx,texture}=analyzer
      ctx.fillStyle="#101a1b"
      ctx.fillRect(0,0,512,480)
      ctx.fillStyle="#76d9bc"
      ctx.font="bold 40px monospace"
      ctx.fillText(({water:"SONDAJ",greenhouse:"SERA",moxie:"MOXIE",habitat:"HABİTAT"}[key]),25,57)
      ctx.fillStyle="#eff8ec"
      ctx.font="28px monospace"
      const screenRows=key==="moxie"?[status,...gasRows,"Güç  "+number.format(meter.consumption)+" kW",...rows.slice(3,5)]:rows
      screenRows.forEach((line,index)=>ctx.fillText(line,25,101+index*(screenRows.length>10?33:42),462))
      texture.needsUpdate=true
    }
  }
  clock?.addEventListener("input",updateMeters)
  function drawBattery(stored=0) {
    const body=livePanel?.querySelector("tbody")
    const rows=[]
    displays.forEach(({canvas,texture,detail},index)=>{
      const g=live?.groups[index]
      const energy=g?.stored ?? (livePanel?grid.banks[index]:stored/5)
      const values=[
        "Grup "+(index+1)+" · "+(["Sondaj","Sera","MOXIE","Habitat"][index]??"Depolama"),
        number.format(g?.pv ?? 0)+" kW PV",
        number.format(energy)+" kWh depo",
        number.format(g?.charge ?? 0)+" kW şarj",
        number.format(g?.draw ?? 0)+" kW depodan"
      ]
      drawGroupHmi(canvas.getContext("2d"),index,{
        energy,pv:g?.pv??0,charge:g?.charge??0,draw:g?.draw??0,output:g?.output??0,kvar:g?.kvar??0,weakest:g?.weakest??0,strongest:g?.strongest??0,lowPanels:g?.lowPanels??0
      },detail)
      texture.needsUpdate=true
      if(body) {
        const tr=document.createElement("tr")
        for(const value of values) tr.insertCell().textContent=value
        rows.push(tr)
      }
    })
    body?.replaceChildren(...rows)
  }
  function update() {
    const result=powerForecast(transmission,closed,{season:Number(season?.value ?? 0),panelDust,cleaningKWh})
    forecast=result
    updateMeters()
    wiring?.setClosed(closed)
    if(breaker) {
      breaker.setAttribute("aria-pressed",String(closed))
      breaker.textContent=closed?"Ana şalteri indir":"Ana şalteri kaldır"
    }
    const status=document.getElementById("breaker-status")
    if(status) status.textContent=closed?"Sera ve sondaj hattı bağlı":"Sera ve sondaj hattı kesildi"
    const stored=moment?.value==="dawn"?result.dawn:result.dusk
    const soc=stored/180
    drawBattery(stored)
    const metrics={
      "solar-generated":fmt.format(result.energy)+" kWh/sol",
      "solar-balance":fmt.format(result.energy-413)+" kWh/sol",
      "solar-life-gap":fmt.format(result.lifeGap)+" kWh",
      "mars-daylight":fmt.format(result.daylight)+" saat",
      "mars-night":fmt.format(result.night)+" saat",
      "mars-irradiation":fmt.format(result.irradiation)+" kWh/m²/sol",
      "solar-average":fmt.format(result.average)+" kW",
      "solar-reserve":fmt.format(result.dusk)+" / "+fmt.format(result.nightReserve)+" kWh",
      "solar-loss":fmt.format(result.cableLoss)+" kWh",
      "solar-unused":fmt.format(result.unused)+" kWh",
      "branch-habitat":result.lifeGap>.001||result.dayGap>.001?"Enerji açığı":"Besleme yeterli",
      "branch-greenhouse":!closed?"Şalter açık":result.lit>=result.night-.001?"Gece tam ışık":result.lit>0?"Gece kısmi ışık":"Gece ışığı ertelendi",
      "branch-drill":!closed?"Şalter açık":result.drilling>=result.daylight-.001?"Gündüz çalışıyor":result.drilling>0?"Gündüz kısıtlı":"Beklemede",
      "solar-direct":fmt.format(result.direct)+" kWh",
      "solar-backup":fmt.format(result.backup)+" kWh",
      "solar-charged":fmt.format(result.charged)+" kWh",
      "solar-day-led":fmt.format(result.dayLed)+" saat",
      "solar-day-gap":fmt.format(result.dayGap)+" kWh",
      "solar-drill":fmt.format(result.drilling)+" saat · "+fmt.format(result.waterLiters)+" / 100 L",
      "solar-led":fmt.format(result.lit)+" / "+fmt.format(result.night)+" saat · %"+fmt.format(result.lit/result.night*100),
      "solar-storage":fmt.format(stored)+" / 180 kWh · %"+fmt.format(soc*100)
    }
    for(const [id,value] of Object.entries(metrics)) {
      const target=document.getElementById(id)
      if(target) target.textContent=value
    }
    for(const button of weatherButtons) button.setAttribute("aria-pressed",String(Number(button.dataset.solarWeather)===transmission))
  }
  for(const button of weatherButtons) button.addEventListener("click",()=>{
    transmission=Number(button.dataset.solarWeather)
    update()
  })
  moment?.addEventListener("change",update)
  if(livePanel&&previewHours>0) {
    const dt=1/60
    for(let minute=0;minute<previewHours*60;minute++) {
      live=stepMicrogrid(grid,(minute+.5)*dt,dt,{
        season:Number(season?.value ?? 0),transmission,panelDust,rowDust,closed,faults,
        lamp:Number(lampControl?.value ?? 1),drill:drillControl?.checked ?? true
      })
    }
  }
  update()
  bindProjection(document.getElementById("power-mission"),()=>{
    const weather=[0,1,2].map(offset=>({transmission:weatherForSol(sol+offset),rowDust:[...rowDust]}))
    return {state:structuredClone(grid),recovery:recovery?.snapshot(),hour:elapsedInSol/3600000,
      sol,weather,season:Number(season?.value ?? 0),closed,faults:{...faults},
      lamp:Number(lampControl?.value ?? 1)}
  })
  const raycaster=new T.Raycaster()
  function tapDisplay(camera,x,y,maxDistance) {
    raycaster.setFromCamera(new T.Vector2(x,y),camera)
    raycaster.far=maxDistance
    const hit=raycaster.intersectObjects(hmiTargets,false)[0]
    if(!hit) return false
    const display=displays[hit.object.userData.groupIndex]
    display.detail=!display.detail
    drawBattery(live?grid.battery:forecast?.dusk)
    return true
  }
  return {farm, moxieScreen:wiring?.analyzers.moxie?.texture, tapDisplay, frame:updateWipers, get transmission(){return transmission}, get live(){return live}, level, x0, z0, toggleBreaker, switchPosition:wiring && farm.localToWorld(wiring.switchPosition.clone())}
}
