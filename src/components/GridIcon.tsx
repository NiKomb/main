import type { CSSProperties } from 'react';

const icons = {
  telegram: [8, 8,
    'M5 1h2v1H5zM3 2h2v1H3zM6 2h1v4H6zM2 3h1v1H2z' +
    'M0 4h2v1H0zM3 4h2v1H3zM2 5h2v1H2zM2 6h1v1H2zM4 6h3v1H4zM6 7h1v1H6z'],
  email: [10, 8,
    'M1 0h8v1H1zM0 1h1v6H0zM9 1h1v6H9zM2 2h1v4H2zM7 2h1v4H7z' +
    'M3 3h1v1H3zM6 3h1v1H6zM4 4h2v1H4zM1 7h8v1H1z'],
  cv: [8, 8,
    'M2 0h3v1H2zM1 1h1v6H1zM3 1h1v2H3zM5 1h1v1H5z' +
    'M6 2h1v5H6zM4 3h2v1H4zM2 7h4v1H2z'],
  left: [4, 7, 'M3 0h1v1h-1zM2 1h1v1h-1zM1 2h1v1h-1zM0 3h1v1H0zM1 4h1v1h-1zM2 5h1v1h-1zM3 6h1v1h-1z'],
  right: [4, 7, 'M0 0h1v1H0zM1 1h1v1h-1zM2 2h1v1h-1zM3 3h1v1h-1zM2 4h1v1h-1zM1 5h1v1h-1zM0 6h1v1H0z'],
  play: [4, 7, 'M0 0h1v1h1v1h1v1h1v1H3v1H2v1H1v1H0z'],
  pause: [6, 7, 'M0 0h2v7H0zM4 0h2v7H4z'],
  link: [6, 5, 'M2 0h4v4H5V1H2zM4 1h1v1H4zM3 2h1v1H3zM2 3h1v1H2zM1 4h1v1H1z'],
} as const;

export function GridIcon({ name }: { name: keyof typeof icons }) {
  const [columns, rows, path] = icons[name];
  return (
    <svg className={`grid-icon grid-icon--${name}`} viewBox={`0 0 ${columns} ${rows}`}
      style={{ '--icon-columns': columns, '--icon-rows': rows } as CSSProperties}
      fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}
