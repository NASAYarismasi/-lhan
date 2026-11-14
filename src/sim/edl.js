import { MARS, G0 } from './constants.js';
import { LANDER } from '../data/sls.js';
import { marsAtmosphere } from './atmosphere.js';
import { clamp, rk4 } from './numerics.js';

/** Deorbit ellipse from 250 km circular orbit to -50 km periapsis; evaluate inbound at 125 km.
 * GAME ASSUMPTION: demonstrator entry corridor, not a flight-certified trajectory.
 * Carries the actual deorbit ellipse and delta-v so the mission can coast to entry instead of teleporting.
 */
export function entryFromOrbit(orbitAltitude = 250000, periapsisAltitude = -50000) {
  const ra = MARS.radius + orbitAltitude, rp = MARS.radius + periapsisAltitude;
  const a = (ra + rp) / 2, e = (ra - rp) / (ra + rp), p = a * (1 - e * e);
  const r = MARS.radius + LANDER.entryAltitude;
  const nu = 2 * Math.PI - Math.acos(clamp((p / r - 1) / e, -1, 1));
  const vt = Math.sqrt(MARS.mu * p) / r, vr = Math.sqrt(MARS.mu / p) * e * Math.sin(nu);
  return { vector: [r, nu, vr, vt], a, e, trueAnomaly: nu,
    deltaV: Math.sqrt(MARS.mu / ra) - Math.sqrt(MARS.mu * (2 / ra - 1 / a)) };
}

/** Planar rotating-atmosphere lifting entry + throttleable SRP. All output uses SI. */
export function createEDL({ vector = entryFromOrbit().vector, propellant = LANDER.propellantMass } = {}) {
  const state = { vector: [...vector, propellant], time: 0, status: 'ENTRY', throttle: 0, powered: false,
    peakHeating: 0, heatLoad: 0, peakDeceleration: 0, touchdownSpeed: null, events: [] };
  function command(s) {
    const [r, , vr, vt, fuel] = s, altitude = r - MARS.radius;
    const rel = vt - MARS.rotation * r, speed = Math.hypot(vr, rel);
    const mass = LANDER.dryMass + Math.max(0, fuel), g = MARS.mu / r ** 2;
    const stopDistance = speed ** 2 / (2 * Math.max(1, LANDER.thrust / mass - g));
    if (!state.powered && altitude < 15000 && altitude < stopDistance * 1.4 + 2000) {
      state.powered = true; state.events.push({ type: 'SRP_IGNITION', time: state.time, altitude, speed });
    }
    if (!state.powered || fuel <= 0) return { ar: 0, at: 0, throttle: 0 };
    // GAME ASSUMPTION: continuous-throttle ideal engines, 1.2 m/s terminal descent.
    const desiredVr = -Math.min(150, Math.sqrt(1.2 ** 2 + (altitude < 50 ? 1 : 4) * Math.max(0, altitude)));
    const ar = g - vt ** 2 / r + (desiredVr - vr) / (altitude < 50 ? .5 : 3);
    const at = -rel / (altitude < 500 ? 1 : 4) + vr * vt / r;
    const requested = Math.hypot(ar, at), available = LANDER.thrust / mass;
    const fraction = Math.min(1, available / Math.max(1e-9, requested));
    return { ar: ar * fraction, at: at * fraction, throttle: Math.min(1, requested / available) };
  }
  function forces(s, control) {
    const [r, , vr, vt, fuel] = s, mass = LANDER.dryMass + Math.max(0, fuel);
    const atm = marsAtmosphere(r - MARS.radius), rel = vt - MARS.rotation * r, speed = Math.hypot(vr, rel);
    const drag = .5 * atm.density * speed ** 2 * LANDER.cd * LANDER.area;
    // GAME ASSUMPTION: bank lift off as the vehicle approaches a shallow upward trajectory, avoiding skip-out.
    const bankFactor = vr < -80 && !state.powered ? .35 : 0;
    const lift = drag * LANDER.liftToDrag * bankFactor;
    const ar = speed ? (-drag * vr + lift * rel) / (speed * mass) : 0;
    const at = speed ? (-drag * rel - lift * vr) / (speed * mass) : 0;
    // Sutton–Graves Mars coefficient: https://ntrs.nasa.gov/citations/20080013535 ; SI W/m².
    const heating = 1.9027e-4 * Math.sqrt(atm.density / LANDER.noseRadius) * speed ** 3;
    return { ar, at, heating, drag, speed, atm, mass, acceleration: Math.hypot(ar + control.ar, at + control.at) };
  }
  function step(dt) {
    if (state.status === 'LANDED' || state.status === 'FAILED') return;
    const previous = [...state.vector];
    const control = command(previous);
    state.throttle = control.throttle;
    if (state.powered) state.status = 'DESCENT';
    state.vector = rk4(previous, state.time, dt, s => {
      const f = forces(s, control);
      return [s[2], s[3] / s[0], s[3] ** 2 / s[0] - MARS.mu / s[0] ** 2 + f.ar + control.ar,
        f.at + control.at - s[2] * s[3] / s[0], -control.throttle * LANDER.thrust / (LANDER.isp * G0)];
    });
    let elapsed = dt;
    if (state.vector[0] <= MARS.radius) {
      // Locate the ground crossing within the step; do not snap away impact velocity.
      const fraction = clamp((previous[0] - MARS.radius) / (previous[0] - state.vector[0]), 0, 1);
      state.vector = previous.map((v, i) => v + fraction * (state.vector[i] - v));
      state.vector[0] = MARS.radius;
      elapsed *= fraction;
      state.touchdownSpeed = Math.hypot(state.vector[2], state.vector[3] - MARS.rotation * MARS.radius);
      state.status = state.touchdownSpeed < LANDER.safeTouchdownSpeed ? 'LANDED' : 'FAILED';
      state.events.push({ type: state.status === 'LANDED' ? 'TOUCHDOWN' : 'HARD_LANDING', time: state.time + elapsed, speed: state.touchdownSpeed });
      state.throttle = 0;
    }
    state.time += elapsed;
    state.vector[4] = Math.max(0, state.vector[4]);
    const f = forces(state.vector, control);
    state.peakHeating = Math.max(state.peakHeating, f.heating);
    state.heatLoad += f.heating * elapsed;
    state.peakDeceleration = Math.max(state.peakDeceleration, f.acceleration);
    if (state.time > 10000) state.status = 'FAILED';
  }
  function getTelemetry() {
    const [r, theta, vr, vt, propellant] = state.vector;
    const control = { ar: 0, at: 0 }, f = forces(state.vector, control);
    return { time: state.time, altitude: r - MARS.radius, downrange: MARS.radius * theta,
      velocity: Math.hypot(vr, vt), surfaceVelocity: f.speed, verticalSpeed: vr,
      flightPathAngle: Math.atan2(vr, vt), propellant, mass: LANDER.dryMass + propellant,
      throttle: state.throttle, engineFiring: state.throttle > 0, inAtmosphere: r - MARS.radius < LANDER.entryAltitude,
      ballisticCoefficient: f.mass / (LANDER.cd * LANDER.area), mach: f.speed / f.atm.speedOfSound,
      dynamicPressure: .5 * f.atm.density * f.speed ** 2, peakHeating: state.peakHeating,
      heatLoad: state.heatLoad, peakDeceleration: state.peakDeceleration, touchdownSpeed: state.touchdownSpeed, status: state.status };
  }
  return { state, step, getTelemetry };
}

