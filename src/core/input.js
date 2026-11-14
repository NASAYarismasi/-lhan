export const DEFAULT_BINDINGS = Object.freeze({ forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  lookLeft: 'ArrowLeft', lookRight: 'ArrowRight', lookUp: 'ArrowUp', lookDown: 'ArrowDown', sprint: 'ShiftLeft',
  interact: 'KeyE', watch: 'KeyQ', pause: 'KeyP', outside: 'Digit1', inside: 'Digit2', map: 'Digit3',
  fullscreen: 'KeyF', burn: 'KeyB', warp: 'KeyT', stage: 'Space' });
export function createInput(target, onAction = () => {}, initial = DEFAULT_BINDINGS) {
  const keys = new Set(), bindings = { ...initial };
  const keydown = event => {
    if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)) return;
    if (!Object.values(bindings).includes(event.code)) return;
    event.preventDefault(); keys.add(event.code);
    if (!event.repeat) for (const [action, key] of Object.entries(bindings)) if (key === event.code) onAction(action, event);
  };
  const keyup = event => keys.delete(event.code);
  const blur = () => keys.clear();
  target.addEventListener('keydown', keydown); target.addEventListener('keyup', keyup); target.addEventListener('blur', blur);
  return { keys, bindings, isDown: action => keys.has(bindings[action]),
    rebind(action, code) { if (!(action in bindings)) throw new RangeError('Unknown action'); keys.clear(); bindings[action] = code; },
    dispose() { target.removeEventListener('keydown', keydown); target.removeEventListener('keyup', keyup); target.removeEventListener('blur', blur); keys.clear(); } };
}
