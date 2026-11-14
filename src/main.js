import { createMission } from './sim/mission.js';
import { createLoop, WARPS, SIM_DT } from './core/loop.js';
import { createStore } from './core/store.js';
import { createInput } from './core/input.js';
import { createLaunchScene } from './render/launchScene.js';
import { createFlightScene } from './flight-scene.js';
import { createHUD } from './ui/hud.js';
import { phaseStage } from './ui/flightAdapters.js';
import './style.css';

let mission = createMission();
const ui = { active: false, ready: false, view: 'outside', watchOpen: false, powerRestored: false, paused: false, nearPanel: false };
const store = createStore(mission.getTelemetry());
const flightScene = createFlightScene();
const viewport = document.getElementById('scene');
const view = createLaunchScene(viewport, flightScene, () => { ui.ready = true; hud.ready(); }, error => { hud.error(); console.error(error); });
let previousTelemetry = mission.getTelemetry(), currentTelemetry = previousTelemetry;
const hud = createHUD({ start() { ui.active = true; view.canvas.focus(); }, reset, watch: toggleWatch, pause: togglePause, burn() { mission.burn(); }, warp: cycleWarp, view: selectView });
const input = createInput(window, action => {
  if (!ui.active) return;
  if (action === 'interact') interact();
  if (action === 'watch') toggleWatch();
  if (action === 'pause') togglePause();
  if (['outside', 'inside', 'map'].includes(action)) selectView(action);
  if (action === 'burn') mission.burn();
  if (action === 'stage') mission.stage();
  if (action === 'warp') cycleWarp();
  if (action === 'fullscreen') {
    const task = document.fullscreenElement ? document.exitFullscreen() : document.querySelector('main').requestFullscreen();
    task.catch(() => {});
  }
});
const loop = createLoop({
  step(dt) {
    previousTelemetry = mission.getTelemetry();
    mission.step(dt);
    const phase = mission.state.phase;
    if (ui.active && (phase === 'PRELAUNCH' || ui.view === 'inside')) view.move(input, dt, phase !== 'PRELAUNCH');
    currentTelemetry = mission.getTelemetry();
  },
  getState: () => mission.getTelemetry(),
  advanceCoast: seconds => mission.advanceCoast(seconds),
  render(alpha) {
    currentTelemetry = mission.getTelemetry();
    // Follow phase transitions without any presentation timers.
    if (currentTelemetry.phase !== lastPhase) {
      if (currentTelemetry.phase === 'PARKING_ORBIT') view.reset(true);
      if (currentTelemetry.phase === 'CRUISE' && ui.view !== 'inside') selectView('map');
      if (currentTelemetry.phase === 'MOI_BURN' && ui.view === 'map') selectView('outside');
      store.emit('phase', { previous: lastPhase, phase: currentTelemetry.phase });
      lastPhase = currentTelemetry.phase;
    }
    mission.setWarp(loop.warp);
    currentTelemetry.warp = loop.warp;
    ui.paused = loop.paused;
    ui.nearPanel = view.nearPanel(currentTelemetry.phase !== 'PRELAUNCH');
    store.setState(currentTelemetry);
    hud.update(currentTelemetry, ui, input.bindings);
    view.draw(phaseStage(currentTelemetry.phase), ui.view, currentTelemetry, alpha, previousTelemetry);
  }
});
let lastPhase = 'PRELAUNCH';
function selectView(next) {
  if (next === 'map' && ['PRELAUNCH', 'ASCENT'].includes(mission.state.phase)) return;
  ui.view = next;
  if (document.pointerLockElement && next !== 'inside') document.exitPointerLock();
  if (next === 'inside') view.reset(true);
}
function interact() {
  const ready = mission.state.phase === 'PRELAUNCH';
  if (!ui.active || !view.nearPanel(!ready)) return;
  if (ready) { mission.launch(); ui.view = 'outside'; view.reset(true); }
  else if (ui.view === 'inside') { ui.powerRestored = true; view.setPower(true); }
}
function toggleWatch() { ui.watchOpen = !ui.watchOpen; view.setWatch(ui.watchOpen); }
function togglePause() { loop.setPaused(!loop.paused); }
function cycleWarp() {
  const start = WARPS.indexOf(loop.warp);
  for (let i = 1; i <= WARPS.length; i++) {
    const value = WARPS[(start + i) % WARPS.length];
    if (mission.setWarp(value) && loop.setWarp(value)) break;
  }
}
function reset() {
  mission = createMission(); loop.reset(); input.keys.clear();
  ui.watchOpen = false; ui.powerRestored = false; ui.view = 'outside';
  view.setWatch(false); view.setPower(false); view.reset();
  previousTelemetry = currentTelemetry = mission.getTelemetry();
  lastPhase = 'PRELAUNCH';
  view.canvas.focus();
}
view.canvas.tabIndex = 0;
const click = () => {
  if (!ui.active || document.pointerLockElement === view.canvas) return;
  try { view.canvas.requestPointerLock?.()?.catch(() => {}); } catch { /* Embedded browser: drag/arrow fallback. */ }
};
const pointermove = event => {
  if (!ui.active || (mission.state.phase !== 'PRELAUNCH' && ui.view !== 'inside')) return;
  if (document.pointerLockElement === view.canvas || event.buttons === 1) view.look(-event.movementX * .003, -event.movementY * .003);
};
view.canvas.addEventListener('click', click);
view.canvas.addEventListener('pointermove', pointermove);
let previous = performance.now(), manualTime = false;
view.renderer.setAnimationLoop(now => {
  if (!manualTime) loop.advance(Math.max(0, (now - previous) / 1000));
  previous = now;
});
window.advanceTime = ms => {
  manualTime = true;
  loop.advance(ms / 1000);
  // The deterministic test hook completes its whole request; RAF keeps a bounded per-frame budget.
  while (!loop.paused && loop.backlog + 1e-12 >= SIM_DT) loop.advance(0);
};
window.render_game_to_text = () => JSON.stringify({
  mode: phaseStage(mission.state.phase), stage: phaseStage(mission.state.phase), phase: mission.state.phase,
  stageTime: mission.state.phaseTime, view: ui.view, paused: loop.paused, ready: ui.ready,
  elapsedSeconds: mission.state.time, crew: mission.state.crew.length, watchOpen: ui.watchOpen,
  active: ui.active, powerRestored: ui.powerRestored, nearPanel: ui.nearPanel,
  position: { x: view.camera.position.x, z: view.camera.position.z },
  rocketHeightMeters: mission.state.ascent.getTelemetry().altitude,
  telemetry: currentTelemetry, bindings: { ...input.bindings }, backlogSeconds: loop.backlog,
  coordinates: 'Metre, Y yukarı; uçuş verisi SI, gök cisimleri yerel/ölçekli sahne'
});
// Explicit lifecycle for integration and Vite hot reload.
let disposed = false;
function dispose() {
  if (disposed) return;
  disposed = true;
  window.removeEventListener('pagehide', dispose);
  view.renderer.setAnimationLoop(null); input.dispose(); hud.dispose(); store.dispose();
  view.canvas.removeEventListener('click', click); view.canvas.removeEventListener('pointermove', pointermove);
  flightScene.dispose(); view.dispose();
  delete window.advanceTime; delete window.render_game_to_text;
}
if (import.meta.hot) import.meta.hot.dispose(dispose);
window.addEventListener('pagehide', dispose, { once: true });
loop.advance(0);
