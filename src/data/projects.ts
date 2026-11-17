import dnsMain from './screens/portfolio-dns-main.webp';
import dnsShowreel from './screens/dns-configurator-showreel.mp4';
import dnsShowreelPoster from './screens/dns-configurator-showreel.webp';
import dnsSelection from './screens/portfolio-dns-selection.webp';
import dnsComparison from './screens/portfolio-dns-comparison.webp';
import dnsMotherboard from './screens/dns-motherboard.webp';
import viHeavyDelivery from './screens/vi-heavy-delivery.webp';
import {
  viCarrierNextStepScreen, viCarrierScreen, viCourierLiftScreen, viCourierScreen, viLiftingUnavailableScreen,
  viPickupScreen, viRequestScreen,
} from './vseinstrumentiScreens';

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
  roundedCorners?: boolean | number;
  cropInset?: number;
  previewCrop?: { top: number; height: number };
  showFull?: boolean;
  original?: { src: string; alt: string };
};

export type Project = {
  id: string;
  title: string;
  summary: string;
  tileSummary?: string;
  role?: string;
  cover?: { src: string; alt: string };
  coverVideo?: { src: string; poster: string; title: string };
  coverImages?: readonly ProjectImage[];
  tileIllustration?: string;
  screens?: readonly {
    id: string;
    title: string;
    description: string;
    image: ProjectImage;
    additionalImages?: readonly ProjectImage[];
  }[];
  links: readonly ProjectLink[];
};

export const projects = [
  {
    id: 'dns',
    title: 'DNS',
    summary: 'Конфигуратор ПК: выбор комплектующих и материалы исследования',
    tileSummary: 'Сравнение деталей для сборки ПК',
    tileIllustration: dnsMotherboard,
    coverVideo: { src: dnsShowreel, poster: dnsShowreelPoster, title: 'Шоурил конфигуратора DNS' },
    screens: [
      {
        id: 'dns-build',
        title: 'Сборка с двумя деталями',
        description: 'Выбраны процессор и материнская плата. Справа видны стоимость сборки и рекомендованные статьи',
        image: { src: dnsMain, alt: 'Конфигуратор ПК с выбранными процессором AMD Ryzen 7 7800X3D и материнской платой MSI B850 GAMING PLUS WIFI. Справа видны стоимость сборки и рекомендованные статьи', width: 4140, height: 3918 },
      },
      {
        id: 'dns-selection',
        title: 'Выбор процессора',
        description: 'В каталоге можно отфильтровать совместимые процессоры, посмотреть цены и открыть обзоры',
        image: { src: dnsSelection, alt: 'Модальное окно каталога процессоров с фильтрами, обзорами и карточками моделей', width: 4140, height: 2430 },
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
    tileSummary: 'Выбор доставки тяжёлых товаров',
    tileIllustration: viHeavyDelivery,
    coverImages: [viPickupScreen, viCourierScreen].map((image) => ({
      ...image,
      previewCrop: { top: 278, height: 864 },
    })),
    screens: [
      {
        id: 'vi-courier',
        title: 'Доставка курьером',
        description: 'При оформлении заказа можно указать адрес и дату доставки, а также выбрать, нужно ли поднять товар на этаж',
        image: viCourierScreen,
      },
      {
        id: 'vi-lifting',
        title: 'Стоимость и доступность подъёма',
        description: 'Для лёгкого товара видна доплата за подъём, для тяжёлого — причина ограничения и следующий шаг',
        image: viCourierLiftScreen,
        additionalImages: [viLiftingUnavailableScreen],
      },
      {
        id: 'vi-carrier',
        title: 'Запрос расчёта доставки через ТК',
        description: 'Покупатель видит цену товаров, отправляет запрос и узнаёт, какие условия предстоит согласовать',
        image: { ...viCarrierNextStepScreen, previewCrop: viCarrierScreen.previewCrop },
        additionalImages: [viRequestScreen],
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
