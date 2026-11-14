import { DAY, G0 } from '../sim/constants.js';
import { PHASE_LABELS, phaseStage } from './flightAdapters.js';

export function createHUD(commands) {
  const get = id => document.getElementById(id);
  const listeners = [];
  function bind(id, action) { const node = get(id); node.onclick = action; listeners.push(() => { node.onclick = null; }); }
  bind('start-btn', commands.start); bind('reset-btn', commands.reset); bind('watch-btn', commands.watch);
  bind('pause-btn', commands.pause); bind('burn-btn', commands.burn); bind('warp-btn', commands.warp);
  document.querySelectorAll('[data-view]').forEach(button => { button.onclick = () => commands.view(button.dataset.view); listeners.push(() => { button.onclick = null; }); });
  return {
    ready() { get('start-btn').disabled = false; get('watch-btn').disabled = false; get('status').textContent = 'Roket kalkışa hazır.'; },
    error() { get('status').textContent = 'Model yüklenemedi. Sayfayı yenileyip tekrar dene.'; },
    update(t, ui, bindings) {
      const stage = phaseStage(t.phase), key = action => bindings[action].replace('Key', '').replace('Digit', '');
      get('intro').hidden = ui.active;
      get('label').textContent = PHASE_LABELS[t.phase];
      if (ui.ready) get('status').textContent = t.failureReason ?? PHASE_LABELS[t.phase];
      get('flight-controls').hidden = stage === 'ready'; get('reset-btn').hidden = stage === 'ready';
      get('pause-btn').hidden = ['LANDED', 'FAILED'].includes(t.phase);
      get('pause-btn').textContent = ui.paused ? 'Uçuşa devam et' : 'Uçuşu duraklat';
      get('map-btn').disabled = stage === 'launch';
      get('burn-btn').hidden = !['PARKING_ORBIT', 'MARS_ORBIT'].includes(t.phase);
      get('burn-btn').textContent = t.phase === 'PARKING_ORBIT' ? `${key('burn')} · Mars transferini başlat` : `${key('burn')} · Yörüngeden çık`;
      get('warp-btn').textContent = `${key('warp')} · Zaman: ${t.warp}×`;
      get('watch').hidden = !ui.watchOpen; get('watch-btn').setAttribute('aria-expanded', String(ui.watchOpen));
      get('watch-btn').textContent = ui.watchOpen ? 'Kol bilgisayarını kapat' : 'Kol bilgisayarını aç';
      get('crosshair').hidden = stage !== 'ready' && ui.view !== 'inside';
      const seconds = Math.floor(t.missionTime);
      get('mission-time').textContent = `T+ ${Math.floor(seconds / DAY)} gün ${String(Math.floor(seconds / 3600) % 24).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      get('objective').textContent = t.phase === 'LANDED' ? 'Mars yüzeyine ulaşıldı' :
        t.phase === 'PRELAUNCH' ? 'Kalkışı başlat' : ui.view === 'inside' ? (ui.powerRestored ? 'Kabin gücü aktif' : 'Kabin gücünü geri getir') : PHASE_LABELS[t.phase];
      get('prompt').textContent = !ui.active ? '' : stage === 'ready' ? (ui.nearPanel ? `${key('interact')} · Kalkışı başlat` : `${key('forward')} · Yeşil kalkış paneline yaklaş`) :
        ui.view === 'inside' && !ui.powerRestored ? (ui.nearPanel ? `${key('interact')} · Kabin gücünü geri getir` : 'Kırmızı güç paneline yaklaş') : '';
      const physics = stage === 'launch' ? `${(t.altitude / 1000).toFixed(1)} km · ${(t.velocity / 1000).toFixed(2)} km/s · Q ${(t.dynamicPressure / 1000).toFixed(1)} kPa · ${(t.acceleration / G0).toFixed(2)} g · ${t.stage.toUpperCase()}` :
        t.phase === 'CRUISE' ? `Gün ${(t.phaseTime / DAY).toFixed(1)} · ${(t.heliocentric.speed / 1000).toFixed(2)} km/s (Güneş’e göre)` :
        t.phase === 'EDL' || t.phase === 'LANDED' ? `${(t.altitude / 1000).toFixed(2)} km · İniş ${Math.abs(t.verticalSpeed).toFixed(2)} m/s · Yakıt ${(t.propellant / 1000).toFixed(1)} t` :
        `${((t.altitude ?? 0) / 1000).toFixed(1)} km · Δv kalan ${(t.burnRemaining / 1000).toFixed(2)} km/s`;
      get('telemetry').textContent = `${physics} · O₂ ${t.supplies.oxygen.toFixed(1)} kg`;
      document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === ui.view)));
    },
    dispose() { for (const fn of listeners) fn(); }
  };
}
