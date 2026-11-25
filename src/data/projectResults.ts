import { dnsCase } from './dnsCase';
import { viCase } from './vseinstrumentiCase';

const { comparison, counts: { started, saved } } = dnsCase.test;

function metric(count: number, total: number) {
  return `${Math.round(count / total * 100)}%`;
}

const savedBuilds = metric(saved, started);
const openedComparison = metric(comparison.opened, comparison.withCatalog);
const successfulCheckouts = metric(viCase.test.success, viCase.test.runs);
const checkoutsWithoutLift = metric(viCase.test.critical, viCase.test.runs);

export const projectCoverMetrics = {
  dns: [
    { value: savedBuilds, label: 'сохранение сборки' },
    { value: openedComparison, label: 'открытие сравнения' },
  ],
  vseinstrumenti: [
    { value: successfulCheckouts, label: 'успешное прохождение' },
    { value: checkoutsWithoutLift, label: 'ошибка выбора доставки' },
  ],
};

export const projectResults: Readonly<Partial<Record<string, string>>> = {
  'project-dns': `${savedBuilds} сохранили сборку\n${openedComparison} открыли сравнение`,
  'project-vseinstrumenti': `${successfulCheckouts} успешных прохождений\n${checkoutsWithoutLift} выбрали курьера без нужного подъёма`,
  'project-preview': '...',
};
