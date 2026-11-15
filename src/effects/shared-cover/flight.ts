export function createFlight(source: HTMLElement) {
  if (typeof source.animate !== 'function') return;

  const start = source.getBoundingClientRect();
  if (start.width === 0 || start.height === 0) return;

  const image = source.cloneNode(true) as HTMLElement;
  image.setAttribute('aria-hidden', 'true');
  const screenshot = image.querySelector<HTMLImageElement>(':scope > img');
  if (screenshot) {
    Object.assign(screenshot.style, {
      width: '100%',
      height: '100%',
      maxWidth: 'none',
      maxHeight: 'none',
      objectFit: 'contain',
    });
  }
  Object.assign(image.style, {
    position: 'fixed',
    margin: '0',
    left: `${start.left}px`,
    top: `${start.top}px`,
    width: `${start.width}px`,
    height: `${start.height}px`,
    zIndex: '100',
    pointerEvents: 'none',
  });
  document.body.append(image);

  return {
    discard: () => image.remove(),
    to(target: HTMLElement, onFinish?: () => void, container = document.body) {
      const end = target.getBoundingClientRect();
      if (!end.width || !end.height) {
        image.remove();
        onFinish?.();
        return;
      }
      container.append(image);
      const visibility = target.style.visibility;
      target.style.visibility = 'hidden';
      const animation = image.animate([
        {
          width: `${start.width}px`,
          height: `${start.height}px`,
          transform: 'none',
          borderRadius: getComputedStyle(image).borderRadius,
        },
        {
          width: `${end.width}px`,
          height: `${end.height}px`,
          transform: `translate(${end.left - start.left}px, ${end.top - start.top}px)`,
          borderRadius: getComputedStyle(target).borderRadius,
        },
      ], { duration: 390, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });

      function cleanup() {
        image.remove();
        target.style.visibility = visibility;
        animation.cancel();
      }

      function finish() {
        window.removeEventListener('resize', finish);
        cleanup();
        onFinish?.();
      }

      animation.onfinish = finish;
      window.addEventListener('resize', finish, { once: true });
      return () => {
        window.removeEventListener('resize', finish);
        cleanup();
      };
    },
  };
}
