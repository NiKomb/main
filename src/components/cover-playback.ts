export function connectCoverPlayback(
  video: HTMLVideoElement,
  preference: { current: boolean | null },
  onPlayingChange: (playing: boolean) => void,
) {
  const document = video.ownerDocument;
  const window = document.defaultView;
  if (!window) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const minimumVisible = 0.35;
  let inView = false;
  const updateIndicator = () => onPlayingChange(!video.paused && !video.ended);
  const play = () => void video.play().catch(updateIndicator);
  const updatePlayback = () => {
    if (inView && !document.hidden && (preference.current ?? !motion.matches)) {
      if (video.paused && !video.ended) play();
    } else {
      video.pause();
    }
  };
  const observer = new window.IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting && entry.intersectionRatio >= minimumVisible;
    updatePlayback();
  }, { threshold: minimumVisible });

  video.muted = true;
  video.addEventListener('play', updateIndicator);
  video.addEventListener('pause', updateIndicator);
  video.addEventListener('ended', updateIndicator);
  document.addEventListener('visibilitychange', updatePlayback);
  motion.addEventListener('change', updatePlayback);
  observer.observe(video);
  updateIndicator();

  return {
    toggle() {
      const start = video.paused || video.ended;
      preference.current = start;
      if (start) play();
      else video.pause();
    },
    disconnect() {
      observer.disconnect();
      motion.removeEventListener('change', updatePlayback);
      document.removeEventListener('visibilitychange', updatePlayback);
      video.removeEventListener('play', updateIndicator);
      video.removeEventListener('pause', updateIndicator);
      video.removeEventListener('ended', updateIndicator);
      video.pause();
    },
  };
}
