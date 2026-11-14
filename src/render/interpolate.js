const lerp = (a, b, t) => a + (b - a) * t;
/** Never interpolate across reference-frame/phase changes. Double precision subtraction happens before GPU upload. */
export function interpolateState(previous, current, alpha) {
  if (!previous || previous.phase !== current.phase) return current;
  const a = Math.max(0, Math.min(1, alpha));
  const result = { ...current };
  for (const key of ['altitude', 'theta', 'attitude', 'missionTime', 'rotation', 'phaseTime']) {
    if (Number.isFinite(previous[key]) && Number.isFinite(current[key])) result[key] = lerp(previous[key], current[key], a);
  }
  result.position = current.position.map((v, i) => lerp(previous.position[i], v, a));
  result.debris = current.debris.map(b => {
    const p = previous.debris.find(item => item.id === b.id);
    return p ? { ...b, angle: lerp(p.angle, b.angle, a), age: lerp(p.age, b.age, a), vector: b.vector.map((v, i) => lerp(p.vector[i], v, a)) } : b;
  });
  result.countdown = { ...current.countdown, time: lerp(previous.countdown.time, current.countdown.time, a) };
  result.heliocentric = { ...current.heliocentric };
  for (const key of ['ship', 'earth', 'mars']) result.heliocentric[key] = current.heliocentric[key].map((v, i) => lerp(previous.heliocentric[key][i], v, a));
  return result;
}
