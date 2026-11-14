export const DAYLIGHT_HOURS=12.33
// Six 1.28 � 2.37 m growing trays; algae lights are a separate auxiliary load.
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
export function powerForecast(transmission,closed=true) {
  const energy=solarEnergy(42,transmission)
  const steps=120, dt=DAYLIGHT_HOURS/steps
  const profile=Array.from({length:steps},(_,i)=>Math.sin(Math.PI*(i+.5)/steps))
  const normalization=profile.reduce((sum,value)=>sum+value,0)
  let battery=0, direct=0, backup=0, drilling=0, dayLed=0, charged=0, dayGap=0
  for(const weight of profile) {
    const production=energy*weight/normalization
    const loadBranch=production*.2
    const chargeBranch=production*.8
    const habitat=60/steps
    const availableForStorage=Math.max(0,chargeBranch-habitat)
    const missingHabitat=Math.max(0,habitat-chargeBranch)
    const habitatBackup=Math.min(battery,missingHabitat)
    battery-=habitatBackup
    dayGap+=missingHabitat-habitatBackup
    const added=Math.min(180-battery,availableForStorage*.9)
    battery+=added
    charged+=added
    if(!closed) continue
    const drillNeed=DRILL_KW*Math.min(dt,DRILL_HOURS-drilling)
    const ledNeed=LED_KW*dt
    const fromSolar=Math.min(loadBranch,drillNeed+ledNeed)
    const fromBattery=Math.min(battery,drillNeed+ledNeed-fromSolar)
    battery-=fromBattery
    direct+=fromSolar
    backup+=fromBattery
    const supply=fromSolar+fromBattery
    const drillEnergy=Math.min(drillNeed,supply)
    drilling+=drillEnergy/DRILL_KW
    dayLed+=(supply-drillEnergy)/LED_KW
  }
  const dusk=battery
  const life=6*DAYLIGHT_HOURS
  const afterLife=Math.max(0,dusk-life)
  const lit=closed?Math.min(DAYLIGHT_HOURS,afterLife/LED_KW):0
  return {energy,average:energy/DAYLIGHT_HOURS,direct,backup,charged,dayLed,dayGap,drilling,
    waterLiters:drilling*DRILL_KW/WATER_KWH_PER_L,dusk,lit,lifeGap:Math.max(0,life-dusk),dawn:afterLife-lit*LED_KW}
}
