type Renderer = { draw: (azimuth: number, elevation: number, distance: number) => void };

/** Orbit only: no wheel zoom, panning, presets, or viewer toolbar. */
export function connectMotherboard(canvas: HTMLCanvasElement, renderer: Renderer) {
  const document = canvas.ownerDocument;
  const window = document.defaultView!;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let azimuth = -.56;
  let elevation = .66;
  let autoRotate = !motion.matches;
  let inView = false;
  let disposed = false;
  let frame = 0;
  let last = 0;
  let pointer: { id: number; x: number; y: number } | undefined;

  function stopFrame() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }

  function invalidate() {
    if (!disposed && inView && !document.hidden && !frame) frame = window.requestAnimationFrame(render);
  }

  function render(time: number) {
    frame = 0;
    const spinning = autoRotate && !pointer;
    if (spinning && last) azimuth += Math.min(time - last, 40) * .00049;
    last = spinning ? time : 0;
    renderer.draw(azimuth, elevation, 478);
    if (spinning) invalidate();
  }

  function releasePointer() {
    const id = pointer?.id;
    pointer = undefined;
    delete canvas.dataset.dragging;
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    last = 0;
    invalidate();
  }

  function down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.dataset.dragging = '';
    canvas.focus({ preventScroll: true });
    last = 0;
    invalidate();
  }

  function rotate(dx: number, dy: number) {
    azimuth -= dx;
    elevation = Math.max(-1.569, Math.min(1.569, elevation + dy));
    invalidate();
  }

  function move(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (event.pointerType === 'mouse' && !(event.buttons & 1)) {
      releasePointer();
      return;
    }
    rotate((event.clientX - pointer.x) * .0075, (event.clientY - pointer.y) * .0075);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }

  function up(event: PointerEvent) {
    if (event.pointerId === pointer?.id) releasePointer();
  }

  function key(event: KeyboardEvent) {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-.16, 0], ArrowRight: [.16, 0], ArrowUp: [0, .14], ArrowDown: [0, -.14],
    };
    if (steps[event.key]) {
      event.preventDefault();
      rotate(...steps[event.key]);
    } else if (event.code === 'Space' && !event.repeat) {
      event.preventDefault();
      autoRotate = !autoRotate;
      last = 0;
      invalidate();
    }
  }

  function visibility() {
    if (document.hidden) {
      stopFrame();
      releasePointer();
    } else invalidate();
  }

  function preference() {
    autoRotate = !motion.matches;
    stopFrame();
    invalidate();
  }

  const intersection = new window.IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!inView) {
      stopFrame();
      releasePointer();
    } else invalidate();
  });
  const resize = new window.ResizeObserver(invalidate);
  intersection.observe(canvas);
  resize.observe(canvas);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('keydown', key);
  window.addEventListener('blur', releasePointer);
  document.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', preference);

  return () => {
    disposed = true;
    stopFrame();
    releasePointer();
    intersection.disconnect();
    resize.disconnect();
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('lostpointercapture', up);
    canvas.removeEventListener('keydown', key);
    window.removeEventListener('blur', releasePointer);
    document.removeEventListener('visibilitychange', visibility);
    motion.removeEventListener('change', preference);
  };
}
