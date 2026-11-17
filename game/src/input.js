// HIVEWARDEN — input: keyboard + mouse, mapped to logical 1280x720 coords.
// The game reads this module's state each tick; menus read clicks through the
// DOM overlays. Keys: WASD/arrows move, Space smoke, E plant flower,
// P pause, M mute, F fullscreen, Enter confirm on menus, R retry on end screens.
export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 640, y: 360, down: false, clicked: false, clickX: 0, clickY: 0 };
  let onKey = null; // (code, down) => void — the game wires menu shortcuts here

  function toLogical(ev) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - rect.left) / rect.width) * 1280,
      y: ((ev.clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (ev) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.code)) ev.preventDefault();
    if (!ev.repeat) keys.add(ev.code);
    if (onKey) onKey(ev.code, true);
  });
  window.addEventListener('keyup', (ev) => {
    keys.delete(ev.code);
    if (onKey) onKey(ev.code, false);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (ev) => {
    const p = toLogical(ev);
    mouse.x = p.x; mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;
    const p = toLogical(ev);
    mouse.down = true; mouse.clicked = true; mouse.clickX = p.x; mouse.clickY = p.y;
    mouse.x = p.x; mouse.y = p.y;
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

  return {
    keys, mouse,
    setKeyHandler(fn) { onKey = fn; },
    // Movement vector from WASD / arrows, normalized.
    moveVector() {
      let x = 0, y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    pressed(code) { return keys.has(code); },
    // Consume the click flag (one click = one swarm order).
    takeClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.clickX, y: mouse.clickY };
    },
  };
}
