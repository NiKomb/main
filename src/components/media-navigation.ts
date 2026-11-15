const gallerySelector = '[data-media-gallery]';

export function slidesInGallery(trigger: HTMLButtonElement) {
  const gallery = trigger.closest(gallerySelector);
  if (!gallery) return [trigger];

  return Array.from(gallery.querySelectorAll<HTMLButtonElement>('.case-zoom-trigger'))
    .filter((slide) => slide.closest(gallerySelector) === gallery);
}

export function adjacentSlide(index: number, count: number, direction: -1 | 1) {
  return (index + direction + count) % count;
}

export function swipeDirection(x: number, y: number) {
  if (Math.abs(x) < 44 || Math.abs(x) <= Math.abs(y)) return null;
  return x < 0 ? 1 : -1;
}
