import { useLayoutEffect, useRef, useState } from 'react';
import breathedgePortrait from '../../data/pixel-portrait-breathedge.webp';
import defaultPortrait from '../../data/pixel-portrait-default.webp';
import falloutPortrait from '../../data/pixel-portrait-fallout.webp';
import phantomBladePortrait from '../../data/pixel-portrait-phantom-blade-zero.webp';
import stardewPortrait from '../../data/pixel-portrait-stardew.webp';
import subnauticaPortrait from '../../data/pixel-portrait-subnautica.webp';
import zeldaPortrait from '../../data/pixel-portrait-zelda.webp';
import { revealAvatar } from './reveal';
import { connectAvatarRotation, mascotAppearanceEvent, mascotTakeoffEvent } from './rotation';
import './profile-avatar.css';

const portraits = [
  { id: 'default', src: defaultPortrait },
  { id: 'astro', src: breathedgePortrait },
  { id: 'zelda', src: zeldaPortrait },
  { id: 'fallout', src: falloutPortrait },
  { id: 'stardew', src: stardewPortrait },
  { id: 'phantom-blade-zero', src: phantomBladePortrait },
  { id: 'subnautica', src: subnauticaPortrait },
];

const size = 88;
const defaultIndex = portraits.findIndex(({ id }) => id === 'default');
const helmetIndex = portraits.findIndex(({ id }) => id === 'astro');

export function ProfileAvatar() {
  const [previewIndex] = useState(() => {
    const theme = new URLSearchParams(window.location.search).get('avatar');
    return portraits.findIndex(({ id }) => id === theme);
  });
  const [{ activeIndex, previousIndex, step }, setSelection] = useState(() => ({
    activeIndex: previewIndex < 0 ? defaultIndex : previewIndex,
    previousIndex: -1,
    step: 0,
  }));
  const button = useRef<HTMLButtonElement>(null);
  const rotation = useRef<ReturnType<typeof connectAvatarRotation>>(null);
  const images = useRef<(HTMLImageElement | null)[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const element = button.current;
    const controller = connectAvatarRotation(document, (target) => setSelection((current) => {
      const next = target ?? (current.activeIndex + 1) % portraits.length;
      return next === current.activeIndex ? current : {
        activeIndex: next, previousIndex: current.activeIndex, step: current.step + 1,
      };
    }));
    const showHelmet = () => controller.rotate(helmetIndex);
    const showDefault = () => controller.rotate(defaultIndex);
    if (previewIndex < 0) {
      element?.addEventListener(mascotAppearanceEvent, showHelmet, { once: true });
      element?.addEventListener(mascotTakeoffEvent, showDefault, { once: true });
    }
    rotation.current = controller;
    return () => {
      element?.removeEventListener(mascotAppearanceEvent, showHelmet);
      element?.removeEventListener(mascotTakeoffEvent, showDefault);
      controller.disconnect();
      rotation.current = null;
    };
  }, [previewIndex]);

  useLayoutEffect(() => {
    const overlay = canvas.current;
    const previous = images.current[previousIndex];
    const active = images.current[activeIndex];
    if (overlay && previous && active) {
      return revealAvatar(overlay, previous, active, size);
    }
  }, [activeIndex, previousIndex, step]);

  return (
    <button ref={button} className="portfolio-avatar" type="button" aria-label="Сменить образ на портрете"
      onClick={() => rotation.current?.rotate()}>
      {portraits.map(({ id, src }, index) => (
        <img key={id} ref={(image) => { images.current[index] = image; }}
          src={src} width={size} height={size} hidden={index !== activeIndex} alt="" />
      ))}
      {step > 0 && <canvas key={step} ref={canvas} hidden aria-hidden="true" />}
    </button>
  );
}
