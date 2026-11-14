export const DAYLIGHT_HOURS=12.33
// Six 1.28 ï¿½ 2.37 m growing trays; algae lights are a separate auxiliary load.
export const LED_KW=6*1.28*2.37*350/(2.5*.8*1000)+.18
export const LED_KWH=LED_KW*DAYLIGHT_HOURS
export const TANK_L=100
export const ICE_FRACTION=.10
export const CAPTURE=.80
// Sealed sublimation: sensible heat to 253 K plus phase change and auxiliaries.
export const WATER_KWH_PER_L=((.9*.8+.1*2.05)*43/.1+2834)/(3600*CAPTURE*.65)+.15
export const DRILL_KW=2
export const DRILL_HOURS=TANK_L*WATER_KWH_PER_L/DRILL_KW
export function solarEnergy(tables, transmission) {
  return tables*20*2.5*.25*.8*transmission
}
// Design assumptions for the isolated AC microgrid.
export const GRID={capacity:180,chargeKW:25,dischargeKW:12,chargeEfficiency:.90,
  dischargeEfficiency:.95,habitatKW:6,voltage:400,powerFactor:.95}
const nightReserve=GRID.habitatKW*DAYLIGHT_HOURS/GRID.dischargeEfficiency
export {nightReserve}

export function feederLoss(kw,length,area) {
  const current=kw*1000/(Math.sqrt(3)*GRID.voltage*GRID.powerFactor)
  return 3*current**2*(.0175*length/area)/1000
}

export function powerForecast(transmission,closed=true,options={}) {
  const {tables=42,capacity=GRID.capacity,initial=0,ledKW=LED_KW,nightDrill=false,dayDrill=true}=options
  const energy=solarEnergy(tables,transmission)
  const steps=120, dt=DAYLIGHT_HOURS/steps
  const profile=Array.from({length:steps},(_,i)=>Math.sin(Math.PI*(i+.5)/steps))
  const normalization=profile.reduce((sum,value)=>sum+value,0)
  const drillKW=DRILL_KW+feederLoss(DRILL_KW,190,4)
  const lampKW=ledKW+feederLoss(ledKW,105,4)
  let battery=Math.min(capacity,initial), direct=0, backup=0, drilling=0, dayLed=0, charged=0, dayGap=0, cableLoss=0, unused=0
  for(const weight of profile) {
    let pv=energy*weight/normalization
    let dischargeBudget=GRID.dischargeKW*dt
    const discharge=(need,floor=0)=>{
      const delivered=Math.min(need,dischargeBudget,Math.max(0,battery-floor)*GRID.dischargeEfficiency)
      battery-=delivered/GRID.dischargeEfficiency
      dischargeBudget-=delivered
      return delivered
    }
    const habitat=60/steps
    const pvHabitat=Math.min(pv,habitat)
    pv-=pvHabitat
    dayGap+=Math.max(0,habitat-pvHabitat-discharge(habitat-pvHabitat))
    const reserveInput=Math.min(pv,GRID.chargeKW*dt,
      Math.max(0,Math.min(capacity,nightReserve)-battery)/GRID.chargeEfficiency)
    pv-=reserveInput
    battery+=reserveInput*GRID.chargeEfficiency
    charged+=reserveInput*GRID.chargeEfficiency
    if(closed) {
      // Keep the night reserve intact. Flexible loads share the common AC bus.
      const use=(kw)=>{
        const need=kw*dt
        const fromPV=Math.min(pv,need)
        pv-=fromPV
        const fromBattery=discharge(need-fromPV,nightReserve)
        direct+=fromPV
        backup+=fromBattery
        return (fromPV+fromBattery)/kw
      }
      if(lampKW>0) {
        const lit=use(lampKW)
        dayLed+=lit
        cableLoss+=lit*(lampKW-ledKW)
      }
      const drillTime=dayDrill?use(drillKW):0
      drilling+=drillTime
      cableLoss+=drillTime*(drillKW-DRILL_KW)
    }
    // Avoid charging and discharging the same bank within a step.
    const chargeInput=dischargeBudget<GRID.dischargeKW*dt?0:
      Math.min(pv,GRID.chargeKW*dt-reserveInput,(capacity-battery)/GRID.chargeEfficiency)
    const added=chargeInput*GRID.chargeEfficiency
    charged+=added
    battery+=added
    unused+=pv-chargeInput
  }
  const dusk=battery
  const life=GRID.habitatKW*DAYLIGHT_HOURS
  const served=Math.min(life,battery*GRID.dischargeEfficiency,GRID.dischargeKW*DAYLIGHT_HOURS)
  let nightExtra=Math.max(0,battery*GRID.dischargeEfficiency-served)
  const nightDrilling=closed&&nightDrill?Math.min(DAYLIGHT_HOURS,nightExtra/drillKW):0
  nightExtra-=nightDrilling*drillKW
  const lit=closed&&lampKW>0?Math.min(DAYLIGHT_HOURS,nightExtra/lampKW):0
  cableLoss+=lit*(lampKW-ledKW)+nightDrilling*(drillKW-DRILL_KW)
  const dawn=Math.max(0,dusk-(served+nightDrilling*drillKW+lit*lampKW)/GRID.dischargeEfficiency)
  return {energy,average:energy/DAYLIGHT_HOURS,direct,backup,charged,dayLed,dayGap,drilling,
    nightDrilling,waterLiters:(drilling+nightDrilling)*DRILL_KW/WATER_KWH_PER_L,dusk,lit,
    lifeGap:life-served,dawn,cableLoss,unused}
}
