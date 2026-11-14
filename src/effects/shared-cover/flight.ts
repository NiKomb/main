export function createFlight(source: HTMLElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || typeof source.animate !== 'function') return;

  const start = source.getBoundingClientRect();
  if (start.width === 0 || start.height === 0) return;

  const image = source.cloneNode(false) as HTMLElement;
  image.setAttribute('aria-hidden', 'true');
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
      container.append(image);
      const visibility = target.style.visibility;
      target.style.visibility = 'hidden';
      image.style.transformOrigin = 'top left';
      const animation = image.animate([
        { transform: 'none' },
        {
          transform: `translate(${end.left - start.left}px, ${end.top - start.top}px) scale(${end.width / start.width}, ${end.height / start.height})`,
          borderRadius: `${parseFloat(getComputedStyle(target).borderRadius) * start.width / end.width}px`,
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
