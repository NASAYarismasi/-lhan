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
  const surplus=Math.max(0,energy-60)
  const drilling=closed?Math.min(DAYLIGHT_HOURS,DRILL_HOURS,surplus/DRILL_KW):0
  const dusk=Math.min(180,(surplus-drilling*DRILL_KW)*.9)
  const afterLife=Math.max(0,dusk-6*DAYLIGHT_HOURS)
  const lit=closed?Math.min(DAYLIGHT_HOURS,afterLife/LED_KW):0
  return {energy,average:energy/DAYLIGHT_HOURS,drilling,waterLiters:drilling*DRILL_KW/WATER_KWH_PER_L,dusk,lit,lifeGap:Math.max(0,6*DAYLIGHT_HOURS-dusk),dawn:afterLife-lit*LED_KW}
}
