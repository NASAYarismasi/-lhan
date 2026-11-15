import { SOL_HOURS, solarDay } from "./mars-power.mjs"
import { stepMicrogrid } from "./live-grid.mjs"
import { createAutomaticRecovery } from "./black-start.mjs"

export function projectPower(snapshot, drill) {
  const state=structuredClone(snapshot.state)
  const recovery=createAutomaticRecovery(structuredClone(snapshot.recovery))
  const rows=[]
  const day=solarDay(snapshot.season)
  for(let index=0;index<3;index++) {
    let hour=index===0?snapshot.hour:0
    const {transmission,rowDust}=snapshot.weather[index]
    const beforeGap=state.dailyShortfall
    const beforeWater=state.water
    const beforeOxygen=state.oxygen
    let solar=0, led=0, drillHours=0
    while(hour<SOL_HOURS-1e-9) {
      const untilTransition=hour<day.daylight?day.daylight:SOL_HOURS
      const dt=Math.min(30/3600,untilTransition-hour)
      const midpoint=hour+dt/2
      let live
      // Resolve the short protection sequence in one-second steps.
      if(midpoint>=day.daylight && recovery.needsFastStep) {
        const duration=Math.min(dt,1/3600)
        live=recovery.step(state,false,duration*3600,()=>{})
        hour+=duration
        led+=live.greenhouse.duty*duration
        continue
      }
      live=recovery.step(state,midpoint<day.daylight,dt*3600,()=>{}) ??
        stepMicrogrid(state,midpoint,dt,{...snapshot,transmission,rowDust,drill})
      solar+=live.production*dt
      led+=live.greenhouse.duty*dt
      drillHours+=live.water.duty*dt
      hour+=dt
    }
    rows.push({solar,led,drillHours,stored:state.battery,gap:state.dailyShortfall-beforeGap,water:state.water-beforeWater,oxygen:state.oxygen-beforeOxygen})
  }
  return rows
}

export function bindProjection(panel,capture) {
  if(!panel) return
  const form=panel.querySelector("form")
  const report=panel.querySelector("output")
  const fmt=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2})
  let running=false
  form.addEventListener("submit",async event=>{
    event.preventDefault()
    if(running) return
    const snapshot=capture()
    running=true
    report.textContent="Aynı başlangıçla iki senaryo hesaplanıyor…"
    await new Promise(resolve=>setTimeout(resolve,25))
    try {
      const fields=["solar","stored","gap","water","oxygen","led"]
      const units=["kWh","kWh","kWh","L","kg","sa"]
      const table=document.createElement("table")
      const head=table.createTHead().insertRow()
      for(const name of ["Sol","Sondaj","PV üretimi","Sabah depo","Habitat açığı","Çıkarılan su","Üretilen O₂","Sera ışığı"]){
        const th=document.createElement("th")
        th.scope="col"
        th.textContent=name
        head.append(th)
      }
      const body=table.createTBody()
      for(const drill of [true,false]) projectPower(snapshot,drill).forEach((data,i)=>{
        const row=body.insertRow()
        const values=[snapshot.sol+i+1,drill?"Açık":"Kapalı",
          ...fields.map((field,index)=>fmt.format(data[field])+" "+units[index])]
        for(const value of values) row.insertCell().textContent=value
      })
      const start=document.createElement("p")
      start.textContent="Başlangıç · Sol "+(snapshot.sol+1)+" · "+fmt.format(snapshot.hour)+
        " saat · "+fmt.format(snapshot.state.battery)+" kWh · gruplar "+
        snapshot.state.banks.map(value=>fmt.format(value)).join(" / ")+" kWh"
      const scroll=document.createElement("div")
      scroll.className="power-table"
      scroll.append(table)
      report.replaceChildren(start,scroll)
    } finally {
      running=false
    }
  })
  panel.querySelector("#power-farm")?.addEventListener("click",()=>{
    document.querySelector('[data-view="solar"]')?.click()
    document.getElementById("viewport")?.scrollIntoView({block:"start"})
  })
}
