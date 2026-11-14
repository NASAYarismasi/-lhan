// Colony page entry. Scene, FPS and colony rules: İhan (src/colony/scene, mars-koloni.mjs, mars-atolye.mjs).
import { createColony, exampleLanding } from './mars-koloni.mjs';
import { readLandingPayload } from './handoff.js';
import { mountWristTerminal } from '../ui/wristTerminal.js';
import { colonyWristData } from '../ui/wristData.js';

const landing = readLandingPayload(exampleLanding);
// ARES integration: subscribe before the scene emits its first colony:state snapshot.
// The initial projection is read-only; the scene remains the sole colony state owner.
let wristDetail = { state: createColony(landing) };
const wrist = mountWristTerminal({ root: document.querySelector('main') ?? document.body,
  getData: () => colonyWristData(wristDetail) });
function onColonyState(event) {
  if (!event.detail || typeof event.detail !== 'object') return;
  wristDetail = { ...wristDetail, ...event.detail, state: event.detail.state ?? wristDetail.state };
  // The terminal samples at 4 Hz while raised, even if the scene publishes every frame.
}
window.addEventListener('colony:state', onColonyState);
function disposeWrist() {
  wrist.dispose();
  window.removeEventListener('colony:state', onColonyState);
  window.removeEventListener('pagehide', onPageHide);
}
function onPageHide(event) { if (!event.persisted) disposeWrist(); }
window.addEventListener('pagehide', onPageHide);
if (import.meta.hot) import.meta.hot.dispose(disposeWrist);
// Dynamic import ensures the event listener above exists before scene initialization.
void import('./scene/mars-demo.mjs');
const number = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
const target = document.getElementById('landing-source');
if (target) {
  const s = landing.supplies;
  target.innerHTML = (landing.source === 'flight'
    ? '<b>Uçuştan gelen iniş verisi</b>'
    : '<b>Örnek iniş verisi</b> (doğrudan koloni bölümü)') +
    ` · Jezero Krateri · O₂ ${number.format(s.oxygen)} · Su ${number.format(s.water)} · Yiyecek ${number.format(s.food)} kişi-sol · Yedek parça ${s.spareParts}`;
}
