import { useEffect, useRef, useState } from 'react';
import { connectMotherboard } from './interaction';
import modelUrl from './motherboard-asrock-b650m-satin.glb?url';
import './motherboard.css';

export function Motherboard({ fallback }: { fallback: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const abort = new AbortController();
    let started = false;
    let renderer: ReturnType<typeof import('./renderer').makeRenderer> | undefined;
    let disconnect: (() => void) | undefined;

    function contextLost() {
      disconnect?.();
      disconnect = undefined;
      renderer?.dispose();
      renderer = undefined;
      setReady(false);
    }

    async function load() {
      try {
        const [{ makeRenderer }, response] = await Promise.all([
          import('./renderer'), fetch(modelUrl, { signal: abort.signal }),
        ]);
        if (!response.ok) throw new Error('Model unavailable');
        const buffer = await response.arrayBuffer();
        if (abort.signal.aborted) return;
        renderer = makeRenderer(element!);
        renderer.setModel(buffer);
        disconnect = connectMotherboard(element!, renderer);
        setReady(true);
      } catch {
        // Keep the original illustration if the model or WebGL is unavailable.
        renderer?.dispose();
        renderer = undefined;
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        started = true;
        observer.disconnect();
        void load();
      }
    });
    observer.observe(element);
    element.addEventListener('webglcontextlost', contextLost);
    return () => {
      abort.abort();
      observer.disconnect();
      element.removeEventListener('webglcontextlost', contextLost);
      disconnect?.();
      renderer?.dispose();
    };
  }, []);

  return (
    <span className="motherboard" data-ready={ready ? '' : undefined}>
      {!ready && <img src={fallback} alt="Материнская плата" loading="lazy" />}
      <canvas ref={canvas} tabIndex={ready ? 0 : -1} role="region"
        aria-hidden={!ready}
        aria-label="3D-модель материнской платы. Вращайте зажатой левой кнопкой мыши или стрелками. Пробел — пауза автовращения." />
      <span className="motherboard__focus" aria-hidden="true" />
    </span>
  );
}
