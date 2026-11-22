import type { CSSProperties } from 'react';

const icons = {
  telegram: [10, 10, 'M7 1h2v1H7zM5 2h2v1H5zM8 2h1v1H8zM3 3h2v1H3zM7 3h1v1H7zM1 4h2v1H1zM7 4h1v1H7zM3 5h2v1H3zM7 5h1v1H7zM5 6h1v1H5zM7 6h1v1H7zM5 7h2v1H5zM6 8h1v1H6z'],
  email: [10, 10, 'M2 2h6v1H2zM1 3h2v1H1zM7 3h2v1H7zM1 4h1v1H1zM3 4h1v1H3zM6 4h1v1H6zM8 4h1v1H8zM1 5h1v1H1zM4 5h2v1H4zM8 5h1v1H8zM1 6h1v1H1zM8 6h1v1H8zM2 7h6v1H2z'],
  cv: [10, 10, 'M3 1h3v1H3zM2 2h1v1H2zM5 2h2v1H5zM2 3h1v1H2zM5 3h1v1H5zM7 3h1v1H7zM2 4h1v1H2zM5 4h3v1H5zM2 5h1v1H2zM7 5h1v1H7zM2 6h1v1H2zM7 6h1v1H7zM2 7h1v1H2zM7 7h1v1H7zM3 8h4v1H3z'],
  left: [4, 7, 'M3 0h1v1h-1zM2 1h1v1h-1zM1 2h1v1h-1zM0 3h1v1H0zM1 4h1v1h-1zM2 5h1v1h-1zM3 6h1v1h-1z'],
  right: [4, 7, 'M0 0h1v1H0zM1 1h1v1h-1zM2 2h1v1h-1zM3 3h1v1h-1zM2 4h1v1h-1zM1 5h1v1h-1zM0 6h1v1H0z'],
  play: [4, 7, 'M0 0h1v1h1v1h1v1h1v1H3v1H2v1H1v1H0z'],
  pause: [6, 7, 'M0 0h2v7H0zM4 0h2v7H4z'],
  link: [6, 6, 'M2 0h4v4H5V1H2zM4 1h1v1H4zM3 2h1v1H3zM2 3h1v1H2zM1 4h1v1H1zM0 5h1v1H0z'],
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
