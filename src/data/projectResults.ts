import { dnsCase } from './dnsCase';
import { viCase } from './vseinstrumentiCase';

const { comparison, counts: { started, saved } } = dnsCase.test;

function metric(count: number, total: number) {
  return `${Math.round(count / total * 100)}%`;
}

export const projectResults: Readonly<Partial<Record<string, string>>> = {
  'project-dns': `${metric(saved, started)} сохранили сборку\n${metric(comparison.opened, comparison.withCatalog)} открыли сравнение`,
  'project-vseinstrumenti': `${metric(viCase.test.success, viCase.test.runs)} успешных прохождений\n${metric(viCase.test.critical, viCase.test.runs)} выбрали курьера без нужного подъёма`,
  'project-preview': '...',
};
