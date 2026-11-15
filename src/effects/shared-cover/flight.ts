export function createFlight(source: HTMLElement, resizeImage = false) {
  if (typeof source.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const start = source.getBoundingClientRect();
  if (start.width === 0 || start.height === 0) return;

  const image = source.cloneNode(true) as HTMLElement;
  image.setAttribute('aria-hidden', 'true');
  image.inert = true;
  const { borderRadius, filter } = getComputedStyle(source);
  const sourceImage = resizeImage ? source.querySelector('img') : null;
  const startImageWidth = sourceImage && getComputedStyle(sourceImage).width;
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
      const timing = { duration: 390, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' } as const;
      const animation = image.animate([
        {
          width: `${start.width}px`,
          height: `${start.height}px`,
          transform: 'none',
          borderRadius,
          filter,
        },
        {
          width: `${end.width}px`,
          height: `${end.height}px`,
          transform: `translate(${end.left - start.left}px, ${end.top - start.top}px)`,
          borderRadius: getComputedStyle(target).borderRadius,
          filter: getComputedStyle(target).filter,
        },
      ], timing);

      const targetImage = startImageWidth && target.querySelector('img');
      const imageResize = targetImage ? image.querySelector('img')?.animate([
        { width: startImageWidth },
        { width: getComputedStyle(targetImage).width },
      ], timing) : undefined;

      function cleanup() {
        image.remove();
        target.style.visibility = visibility;
        animation.cancel();
        imageResize?.cancel();
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
