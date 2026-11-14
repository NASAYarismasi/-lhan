import { it, expect } from 'vitest';
import { createEDL, entryFromOrbit } from '../src/sim/edl.js';
import { LANDER } from '../src/data/sls.js';
import { MARS } from '../src/sim/constants.js';
function land(options, dt = .02) {
  const e = createEDL(options);
  for (let i = 0; i < 500000 && !['LANDED', 'FAILED'].includes(e.state.status); i++) e.step(dt);
  return e;
}
it('starts from the deorbit ellipse and lands safely using lifting entry and SRP, without parachutes', () => {
  const entry = entryFromOrbit();
  expect(entry.vector[0] - MARS.radius).toBe(125000);
  expect(entry.vector[2]).toBeLessThan(0);
  const e = land(), t = e.getTelemetry();
  expect(t.status).toBe('LANDED'); expect(t.altitude).toBe(0);
  expect(t.touchdownSpeed).toBeLessThan(2.5); expect(t.touchdownSpeed).toBeGreaterThan(0);
  expect(t.propellant).toBeGreaterThan(0); expect(t.propellant).toBeLessThan(LANDER.propellantMass);
  expect(t.peakDeceleration).toBeGreaterThan(10); expect(t.peakHeating).toBeGreaterThan(1000); expect(t.heatLoad).toBeGreaterThan(0);
  const srp = e.state.events.find(e => e.type === 'SRP_IGNITION');
  expect(srp.speed).toBeGreaterThan(500); // engines start supersonically.
  expect(Math.abs(land(undefined, .01).getTelemetry().touchdownSpeed - t.touchdownSpeed)).toBeLessThan(.02);
  console.info('EDL', JSON.stringify({ touchdownSpeed: t.touchdownSpeed, propellant: t.propellant, peakDeceleration: t.peakDeceleration, peakHeating: t.peakHeating, srp }));
});
it('reports hard touchdown rather than manufacturing a landing when propellant is absent', () => {
  expect(land({ propellant: 0 }).getTelemetry().status).toBe('FAILED');
});
