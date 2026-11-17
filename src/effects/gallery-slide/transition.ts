export function replaceGallerySlide(content: HTMLElement, next: HTMLElement, direction?: -1 | 1) {
  const previous = content.firstElementChild;
  if (!previous || !direction || typeof next.animate !== 'function') {
    content.replaceChildren(next);
    return;
  }

  const video = previous.querySelector('video');
  if (video) {
    video.pause();
    video.controls = false;
  }
  previous.setAttribute('inert', '');
  previous.setAttribute('data-gallery-outgoing', '');
  content.prepend(next);

  const offset = direction * 24;
  const timing = { duration: 160, easing: 'ease-out', fill: 'both' } as const;
  const outgoing = previous.animate([
    { opacity: 1, translate: '0px' },
    { opacity: 0, translate: `${-offset}px` },
  ], timing);
  const incoming = next.animate([
    { opacity: 0, translate: `${offset}px` },
    { opacity: 1, translate: '0px' },
  ], timing);

  const finish = () => {
    previous.remove();
    outgoing.cancel();
    incoming.cancel();
  };

  outgoing.onfinish = finish;
  return finish;
}
