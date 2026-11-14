// Colony page entry. Scene, FPS and colony rules: İhan (src/colony/scene, mars-koloni.mjs, mars-atolye.mjs).
import { exampleLanding } from './mars-koloni.mjs';
import { readLandingPayload } from './handoff.js';
import './scene/mars-demo.mjs';

const landing = readLandingPayload(exampleLanding);
const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const target = document.getElementById('landing-source');
if (target) {
  const s = landing.supplies;
  target.innerHTML = (landing.source === 'flight'
    ? '<b>Uçuştan gelen iniş verisi</b>'
    : '<b>Örnek iniş verisi</b> (doğrudan koloni bölümü)') +
    ` · Jezero Krateri · O₂ ${number.format(s.oxygen)} · Su ${number.format(s.water)} · Yiyecek ${number.format(s.food)} kişi-sol · Yedek parça ${s.spareParts}`;
}
