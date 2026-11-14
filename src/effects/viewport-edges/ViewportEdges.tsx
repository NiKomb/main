import { useEffect, useRef, useState } from 'react';
import './viewport-edges.css';

const stripHeight = 44;
const displacementScale = 18;

function createDisplacementMap(viewportWidth: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = stripHeight;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const image = context.createImageData(canvas.width, canvas.height);
  const horizontalStrength = Math.min(viewportWidth, 1440) * .012 / displacementScale;

  for (let row = 0; row < canvas.height; row++) {
    const strength = (row / (canvas.height - 1)) ** 2;
    const green = Math.round(255 * (.5 - .5 * strength));

    for (let column = 0; column < canvas.width; column++) {
      const position = column / (canvas.width - 1) - .5;
      const red = .5 - position * horizontalStrength * strength;
      const offset = (row * canvas.width + column) * 4;
      image.data[offset] = Math.round(255 * red);
      image.data[offset + 1] = green;
      image.data[offset + 2] = 128;
      image.data[offset + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

export function ViewportEdges() {
  const bottom = useRef<HTMLDivElement>(null);
  const [refraction, setRefraction] = useState<{ width: number; map: string } | null>(null);

  useEffect(() => {
    const strip = bottom.current;
    if (!strip || !CSS.supports('backdrop-filter', 'url(#viewport-refraction)')) return;

    let lastWidth = 0;
    function update(width: number) {
      if (width === lastWidth) return;
      lastWidth = width;
      const map = width > 0 ? createDisplacementMap(width) : null;
      setRefraction(map ? { width, map } : null);
    }

    update(strip.clientWidth);
    const observer = new ResizeObserver(() => update(strip.clientWidth));
    observer.observe(strip);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="viewport-edges" aria-hidden="true">
      <div className="viewport-edges__top">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      {refraction && (
        <svg className="viewport-edges__definitions" width="0" height="0">
          <defs>
            <filter id="viewport-refraction" x="0" y="0" width={refraction.width} height={stripHeight}
              filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feImage href={refraction.map} x="0" y="0" width={refraction.width} height={stripHeight}
                preserveAspectRatio="none" result="displacement" />
              <feDisplacementMap in="SourceGraphic" in2="displacement" scale={displacementScale}
                xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
      )}
      <div className="viewport-edges__bottom" style={{ height: stripHeight }}>
        <div ref={bottom} className="viewport-edges__refraction"
          data-ready={refraction ? '' : undefined} />
        <div className="viewport-edges__bottom-blur" />
      </div>
    </div>
  );
}
