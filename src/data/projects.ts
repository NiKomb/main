import dnsMain from './screens/portfolio-dns-main.webp';
import dnsSelection from './screens/portfolio-dns-selection.webp';
import dnsComparison from './screens/portfolio-dns-comparison.webp';
import viCoverPickup from './screens/vi-cover-pickup.png';
import viCoverCourier from './screens/vi-cover-courier.png';
import viCoverCarrier from './screens/vi-cover-carrier.png';
import dnsMotherboard from './screens/dns-motherboard.webp';
import viHeavyDelivery from './screens/vi-heavy-delivery.webp';

export type ProjectLink = {
  id: string;
  kind: 'presentation' | 'prototype' | 'demo' | 'journal';
  label: string;
  href: `https://${string}`;
};

export type ProjectImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  roundedCorners?: boolean;
  showFull?: boolean;
};

export type Project = {
  id: string;
  title: string;
  summary: string;
  role?: string;
  cover?: { src: string; alt: string };
  coverImages?: readonly ProjectImage[];
  tileIllustration?: string;
  screens?: readonly {
    id: string;
    title: string;
    description: string;
    image: ProjectImage;
  }[];
  links: readonly ProjectLink[];
};

const viPickupScreen: ProjectImage = {
  src: viCoverPickup,
  alt: 'Экран оформления заказа с ограничением самовывоза по весу',
  width: 800,
  height: 1778,
  roundedCorners: true,
};
const viCourierScreen: ProjectImage = {
  src: viCoverCourier,
  alt: 'Экран оформления заказа с выбранной доставкой курьером',
  width: 800,
  height: 1778,
  roundedCorners: true,
};

export const projects = [
  {
    id: 'dns',
    title: 'DNS',
    summary: 'Конфигуратор ПК: выбор комплектующих и материалы исследования',
    tileIllustration: dnsMotherboard,
    screens: [
      {
        id: 'dns-selection',
        title: 'Выбор процессора',
        description: 'В каталоге можно отфильтровать совместимые процессоры, посмотреть цены и открыть обзоры',
        image: { src: dnsSelection, alt: 'Модальное окно каталога процессоров с фильтрами, обзорами и карточками моделей', width: 4140, height: 2430 },
      },
      {
        id: 'dns-build',
        title: 'Сборка с двумя деталями',
        description: 'Выбраны процессор и материнская плата. Справа видны стоимость сборки и рекомендованные статьи',
        image: { src: dnsMain, alt: 'Конфигуратор ПК с выбранными процессором AMD Ryzen 7 7800X3D и материнской платой MSI B850 GAMING PLUS WIFI. Справа видны стоимость сборки и рекомендованные статьи', width: 4140, height: 3918 },
      },
      {
        id: 'dns-gallery-comparison',
        title: 'Сравнение процессоров',
        description: 'В режиме «Только различия» видны цены и отличающиеся характеристики двух процессоров',
        image: { src: dnsComparison, alt: 'Таблица сравнения AMD Ryzen 7 7800X3D и AMD Ryzen 7 9800X3D', width: 2688, height: 1590 },
      },
    ],
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
    summary: 'Мобильный прототип выбора доставки тяжелых товаров',
    tileIllustration: viHeavyDelivery,
    coverImages: [
      viPickupScreen,
      viCourierScreen,
      { src: viCoverCarrier, alt: 'Панель расчёта доставки транспортной компанией', width: 800, height: 1778, roundedCorners: true },
    ],
    screens: [
      {
        id: 'vi-courier',
        title: 'Доставка курьером',
        description: 'При оформлении заказа можно указать адрес и дату доставки, а также выбрать, нужно ли поднять товар на этаж',
        image: viCourierScreen,
      },
      {
        id: 'vi-pickup',
        title: 'Ограничение самовывоза',
        description: 'Если товар превышает допустимый вес для самовывоза, интерфейс объясняет причину и предлагает курьера или транспортную компанию',
        image: viPickupScreen,
      },
    ],
    links: [
      { id: 'vi-presentation', kind: 'presentation', label: 'Презентация', href: 'https://nikomb.github.io/vseinstrumenti-prototype/presentation/' },
      { id: 'vi-prototype', kind: 'prototype', label: 'Прототип', href: 'https://nikomb.github.io/vseinstrumenti-prototype/' },
      { id: 'vi-before', kind: 'demo', label: 'Было', href: 'https://nikomb.github.io/vseinstrumenti-prototype/?variant=before' },
      { id: 'vi-after', kind: 'demo', label: 'Стало', href: 'https://nikomb.github.io/vseinstrumenti-prototype/?variant=after' },
      { id: 'vi-journal', kind: 'journal', label: 'Журнал', href: 'https://nikomb.github.io/vseinstrumenti-prototype/journal/' },
    ],
  },
] as const satisfies readonly Project[];
