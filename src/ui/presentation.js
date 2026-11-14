import { CREW_RATES } from '../data/sls.js';

/** UI projections only: all quantities originate in the mission snapshot. */
export function vehicleConfiguration(t) {
  if (['DEORBIT','EDL','LANDED'].includes(t.phase) || t.mars && t.phase==='FAILED') return 'lander';
  if (['TMI_BURN','CRUISE','MOI_BURN','MARS_ORBIT'].includes(t.phase)) return 'transit';
  if (t.stages.find(s=>s.id==='srb')?.attached) return 'boosters';
  return t.stages.find(s=>s.id==='core')?.attached ? 'core' : 'upper';
}

export function apsisReadout(value, eccentricity, kind) {
  if (kind==='apo' && (eccentricity>=1 || value===Infinity)) return {value:'—',unit:'açık yörünge'};
  if (Number.isFinite(value) && value<0) return {value:'—',unit:'yörünge altı'};
  return {value:Number.isFinite(value)?(value/1000).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1}):'—',unit:Number.isFinite(value)?'km':''};
}

export function resourceDays(t, resource) {
  const consumption=CREW_RATES[resource]*t.crew.length;
  return consumption>0 ? t.supplies[resource]/consumption : Infinity;
}

export function nextEvent(t) {
  if (t.phase==='PRELAUNCH') return t.countdown.running ? t.countdown.time < -6.5 ? 'Ana motor ateşlemesi' : 'Kalkış / T−0' : 'Geri sayımı başlat';
  if (t.phase==='ASCENT') {
    if(t.stages.find(s=>s.id==='srb').attached) return 'Katı itici ayrılması';
    if(t.lasAttached) return 'Kurtarma kulesinin atılması';
    return t.stages.find(s=>s.id==='core').attached ? 'Ana kademe ayrılması' : 'Park yörüngesine giriş';
  }
  return {PARKING_ORBIT:'Mars transferi / B',TMI_BURN:'Seyir başlangıcı',CRUISE:'Mars yakalama ateşlemesi',MOI_BURN:'Mars park yörüngesi',MARS_ORBIT:'İnişi başlat / B',DEORBIT:'Atmosfere giriş',EDL:t.engineFiring?'Yüzeye temas':'İniş motoru ateşlemesi',LANDED:'Koloniye devir',FAILED:'Görev değerlendirmesi'}[t.phase]??'Görev takibi';
}
