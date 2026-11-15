import dnsMain from './screens/portfolio-dns-main.webp';
import dnsSelection from './screens/portfolio-dns-selection.webp';
import viCourier from './screens/portfolio-vi-courier.webp';
import viPickup from './screens/portfolio-vi-pickup.webp';
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

export const projects = [
  {
    id: 'dns',
    title: 'DNS',
    summary: 'Конфигуратор ПК: выбор комплектующих и материалы исследования.',
    tileIllustration: dnsMotherboard,
    screens: [
      {
        id: 'dns-build',
        title: 'Сборка ПК',
        description: 'Сборку можно начать с любой категории. Счётчик показывает, сколько обязательных комплектующих уже добавлено.',
        image: { src: dnsMain, alt: 'Стартовый экран конфигуратора со списком категорий комплектующих', width: 1380, height: 1073 },
      },
      {
        id: 'dns-selection',
        title: 'Выбор процессора',
        description: 'В списке процессоров видны цена, сокет и характеристики. Компонент можно добавить в сборку прямо из списка.',
        image: { src: dnsSelection, alt: 'Список процессоров в конфигураторе DNS', width: 1380, height: 940 },
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
    summary: 'Мобильный прототип выбора доставки тяжелых товаров.',
    tileIllustration: viHeavyDelivery,
    coverImages: [
      { src: viCoverPickup, alt: 'Самовывоз недоступен из-за веса заказа', width: 800, height: 1778 },
      { src: viCoverCourier, alt: 'Оформление доставки курьером', width: 800, height: 1778 },
      { src: viCoverCarrier, alt: 'Панель расчёта доставки транспортной компанией', width: 800, height: 1778 },
    ],
    screens: [
      {
        id: 'vi-courier',
        title: 'Доставка курьером',
        description: 'При оформлении заказа можно указать адрес и дату доставки, а также выбрать, нужно ли поднять товар на этаж.',
        image: { src: viCourier, alt: 'Панель получения заказа с выбранной доставкой курьером', width: 390, height: 525 },
      },
      {
        id: 'vi-pickup',
        title: 'Ограничение самовывоза',
        description: 'Если товар превышает допустимый вес для самовывоза, интерфейс объясняет причину и предлагает курьера или транспортную компанию.',
        image: { src: viPickup, alt: 'Панель самовывоза с объяснением ограничения по весу товара', width: 390, height: 442 },
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
