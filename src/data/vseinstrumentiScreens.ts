import type { ProjectImage } from './projects';
import pickup from './screens/vi-case-pickup-after.webp';
import courier from './screens/vi-case-courier-cover.webp';
import carrier from './screens/vi-case-carrier.webp';
import courierLift from './screens/vi-case-courier-after.webp';
import lifting from './screens/vi-case-lift.webp';
import carrierNextStep from './screens/vi-case-carrier-next-step.webp';
import request from './screens/vi-case-request.webp';

export const viMobileScreen = { width: 800, height: 1780, roundedCorners: true, showFull: true } as const;

export const viPickupScreen = {
  ...viMobileScreen,
  src: pickup,
  alt: 'Оформление с выбранным самовывозом и ограничением по весу',
  previewCrop: { top: 756, height: 488 },
} satisfies ProjectImage;

export const viCourierScreen = {
  ...viMobileScreen,
  src: courier,
  alt: 'Экран оформления заказа с выбранной доставкой курьером',
} satisfies ProjectImage;

export const viCarrierScreen = {
  ...viMobileScreen,
  src: carrier,
  alt: 'Доставка транспортной компанией, цена товаров и кнопка запроса расчёта',
  previewCrop: { top: 1360, height: 420 },
} satisfies ProjectImage;

export const viCourierLiftScreen = {
  ...viMobileScreen,
  src: courierLift,
  alt: 'В сводке курьера виден подъём на второй этаж с лифтом за 150 рублей',
  previewCrop: { top: 712, height: 392 },
} satisfies ProjectImage;

export const viLiftingUnavailableScreen = {
  ...viMobileScreen,
  src: lifting,
  alt: 'В панели подъёма показано, что курьер не поднимет заказ такого веса',
  previewCrop: { top: 1064, height: 716 },
} satisfies ProjectImage;

export const viCarrierNextStepScreen = {
  ...viMobileScreen,
  src: carrierNextStep,
  alt: 'Выбрана транспортная компания. Видны пояснение о согласовании доставки и кнопка запроса расчёта',
  previewCrop: { top: 0, height: 444 },
} satisfies ProjectImage;

export const viRequestScreen = {
  ...viMobileScreen,
  src: request,
  alt: 'Экран результата с подтверждением отправки запроса согласования',
  previewCrop: { top: 0, height: 480 },
} satisfies ProjectImage;
