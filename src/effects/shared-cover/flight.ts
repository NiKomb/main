function captureVideoFrame(video: HTMLVideoElement) {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return;

  const canvas = document.createElement('canvas');
  canvas.width = Math.min(video.videoWidth, 960);
  canvas.height = Math.round(video.videoHeight * canvas.width / video.videoWidth);
  const context = canvas.getContext('2d');
  if (!context) return;
  try {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .9);
  } catch {
    return;
  }
}

function screenKeyframe(screen: HTMLImageElement): Keyframe {
  const { width, height, transform } = getComputedStyle(screen);
  if (screen.closest('[data-preview-crop]')) return { width, transform };
  if (screen.parentElement?.classList.contains('case-cover-strip')) return { width, height, transform };
  return { width };
}

export function createFlight(source: HTMLElement, resizeImages = false) {
  if (typeof source.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const start = source.getBoundingClientRect();
  if (start.width === 0 || start.height === 0) return;

  const image = source.cloneNode(true) as HTMLElement;
  const sourceVideo = source.querySelector('video');
  const clonedVideo = image.querySelector('video');
  const videoFrame = sourceVideo ? captureVideoFrame(sourceVideo) : undefined;
  if (clonedVideo) {
    clonedVideo.removeAttribute('src');
    if (videoFrame) clonedVideo.poster = videoFrame;
  }
  image.setAttribute('aria-hidden', 'true');
  image.inert = true;
  image.style.removeProperty('visibility');
  const { borderRadius, filter } = getComputedStyle(source);
  const startScreens = resizeImages
    ? Array.from(source.querySelectorAll('img'), screenKeyframe)
    : [];
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
    videoFrame,
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

      const clonedImages = startScreens.length ? image.querySelectorAll('img') : [];
      const imageResizes = startScreens.length
        ? Array.from(target.querySelectorAll('img')).slice(0, startScreens.length)
          .map((screen, index) => clonedImages[index]?.animate([startScreens[index], screenKeyframe(screen)], timing))
        : [];

      function cleanup() {
        image.remove();
        target.style.visibility = visibility;
        animation.cancel();
        imageResizes.forEach((resize) => resize?.cancel());
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
