import { dnsCase } from './dnsCase';

const { comparison, counts: { started, saved } } = dnsCase.test;

function metric(count: number, total: number) {
  return `${Math.round(count / total * 100)}% (${count}/${total})`;
}

export const projectResults: Readonly<Partial<Record<string, string>>> = {
  'project-dns': `${metric(saved, started)} сохранили сборку\n${metric(comparison.opened, comparison.withCatalog)} открыли сравнение`,
  'project-vseinstrumenti': `${metric(4, 7)} успешных оформлений\n${metric(2, 7)} — курьер без подъёма`,
  'project-preview': '...',
};
