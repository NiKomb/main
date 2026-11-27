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
  'project-dns': `${saved} из ${started} сохранили сборку\n${comparison.opened} из ${comparison.withCatalog} открыли сравнение`,
  'project-vseinstrumenti': `${viCase.test.success} из ${viCase.test.runs} прошли успешно\n${viCase.test.critical} из ${viCase.test.runs} выбрали курьера без нужного подъёма`,
  'project-preview': '...',
};
