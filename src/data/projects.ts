export type ProjectLink = {
  id: string;
  kind: 'presentation' | 'prototype' | 'demo' | 'journal';
  label: string;
  href: `https://${string}`;
};

export type Project = {
  id: string;
  title: string;
  summary: string;
  role?: string;
  cover?: { src: string; alt: string };
  links: readonly ProjectLink[];
};

export const projects = [
  {
    id: 'dns',
    title: 'DNS',
    summary: 'Конфигуратор ПК: выбор комплектующих и материалы исследования.',
    links: [
      { id: 'dns-presentation', kind: 'presentation', label: 'Презентация', href: 'https://nikomb.github.io/dns-prototype/presentation/' },
      { id: 'dns-prototype', kind: 'prototype', label: 'Прототип', href: 'https://nikomb.github.io/dns-prototype/' },
      { id: 'dns-changes', kind: 'demo', label: 'Было / стало', href: 'https://nikomb.github.io/dns-prototype/?demo=changes' },
      { id: 'dns-journal', kind: 'journal', label: 'Журнал', href: 'https://nikomb.github.io/dns-prototype/journal/' },
    ],
  },
  {
    id: 'vseinstrumenti',
    title: 'ВсеИнструменты',
    summary: 'Мобильный прототип выбора доставки тяжелых товаров.',
    links: [
      { id: 'vi-presentation', kind: 'presentation', label: 'Презентация', href: 'https://nikomb.github.io/vseinstrumenti-prototype/presentation/' },
      { id: 'vi-prototype', kind: 'prototype', label: 'Прототип', href: 'https://nikomb.github.io/vseinstrumenti-prototype/' },
      { id: 'vi-before', kind: 'demo', label: 'Было', href: 'https://nikomb.github.io/vseinstrumenti-prototype/?variant=before' },
      { id: 'vi-after', kind: 'demo', label: 'Стало', href: 'https://nikomb.github.io/vseinstrumenti-prototype/?variant=after' },
      { id: 'vi-journal', kind: 'journal', label: 'Журнал', href: 'https://nikomb.github.io/vseinstrumenti-prototype/journal/' },
    ],
  },
] as const satisfies readonly Project[];
