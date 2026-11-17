// HIVEWARDEN — keyboard + mouse input. Tracks held keys and the mouse
// position in canvas coordinates, plus click/hold state for swarm orders.
export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false, clickX: 0, clickY: 0 };
  let onKeyDown = null;
  let onKeyUp = null;

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!keys.has(k) && onKeyDown) onKeyDown(k, e);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    keys.delete(k);
    if (onKeyUp) onKeyUp(k, e);
  });
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (e) => {
    const p = toCanvas(e);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toCanvas(e);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = p.x;
    mouse.clickY = p.y;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  // Touch: treat as mouse.
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const p = toCanvas(t);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = p.x;
    mouse.clickY = p.y;
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const p = toCanvas(t);
    mouse.x = p.x;
    mouse.y = p.y;
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    mouse.down = false;
  }, { passive: false });

  return {
    keys,
    mouse,
    // True if any of the given keys is held.
    held(...names) {
      return names.some((n) => keys.has(n));
    },
    // Consume the click flag (call once per frame).
    consumeClick() {
      const c = mouse.clicked;
      mouse.clicked = false;
      return c;
    },
    setKeyDownHandler(fn) {
      onKeyDown = fn;
    },
    setKeyUpHandler(fn) {
      onKeyUp = fn;
    },
  };
}
