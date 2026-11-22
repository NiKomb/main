import type { ProjectImage } from './projects';
import sessionGpu from './screens/dns-session-gpu.webp';
import researchCatalog from './screens/dns-research-catalog.webp';
import sessionMotherboard from './screens/dns-session-motherboard.webp';
import sessionCase from './screens/dns-session-case.webp';
import sessionCheck from './screens/dns-session-check.webp';
import sessionSave from './screens/dns-session-save.webp';
import interviewEvidence from './screens/dns-interview-evidence.webp';
import interviewEvidenceFull from './screens/dns-interview-evidence-full.webp';
import prioritizationEvidence from './screens/dns-prioritization-evidence.webp';
import prioritizationEvidenceFull from './screens/dns-prioritization-evidence-full.webp';
import competitorCitilink from './screens/dns-competitor-citilink.webp';
import competitorRegard from './screens/dns-competitor-regard.webp';
import competitorXcore from './screens/dns-competitor-xcore.webp';
import compareBefore from './screens/dns-compare-before.webp';
import compareSelection from './screens/dns-compare-select.webp';
import compareTable from './screens/dns-compare-table.webp';
import productCardComparison from './screens/dns-product-card-comparison.webp';
import filterPanelComparison from './screens/dns-filter-panel-comparison.png';
import catalogArticlesBefore from './screens/dns-catalog-articles-before.webp';
import catalogArticlesAfter from './screens/dns-catalog-articles-after.webp';
import catalogArticlesDetail from './screens/dns-catalog-articles-detail.png';
import articlePanelBefore from './screens/dns-article-panel-before.webp';
import articlePanelAfter from './screens/dns-article-panel-after.webp';
import articlePanelScroll from './screens/dns-article-panel-scroll.png';
import articlePanelExpandedDetail from './screens/dns-article-panel-expanded-detail.png';
import hoverModalWithoutSwitch from './screens/dns-hover-modal-before.webp';
import hoverModalWithSwitch from './screens/dns-hover-modal-after.webp';
import hoverToggleStates from './screens/dns-hover-toggle-states.png';
import hoverCardDifferences from './screens/dns-hover-card-differences.png';
import processorScenario from './screens/dns-processor-scenario.mp4';
import processorScenarioPoster from './screens/dns-processor-scenario.webp';
import quickChoice from './screens/dns-quick-choice.webp';
import buildRecommendedArticles from './screens/dns-build-recommended-articles.webp';

export type CaseFigure = ProjectImage & { caption: string; label?: string; comment?: string };
export type CaseFact = { title: string; detail: string; comment?: string; quote?: string };
export type CaseMetric = { value: string; label: string; detail?: string; comment?: string };

type Decision = {
  id: string;
  title: string;
  hypothesis: number;
  hypothesisText: readonly [before: string, emphasis: string, after: string];
  metrics: readonly CaseMetric[];
  comment?: string;
  solution: string;
  detailFrames: readonly CaseFigure[];
  solutionFigure?: CaseFigure;
  comparison: readonly [CaseFigure, CaseFigure];
};

// Срез исследовательского задания task-3 из журнала DNS, 16.11.2026.
const testCounts = { started: 26, selected: 24, assembled: 19, saved: 15, technical: 12 };
const testHypotheses = { comparison: 1, evidence: 2, recommendation: 3 };
const comparisonResult = { started: 14, opened: 12, withCatalog: 24 };
const evidenceResult = { opened: 18, viewed: 8, selected: 7 };
const recommendationResult = { offered: 24, viewed: 12, selected: 11 };

function ratio(numerator: number, denominator: number) {
  return `${numerator} из ${denominator}`;
}

const buildArticlesFigure: CaseFigure = {
  src: buildRecommendedArticles, width: 700, height: 1534, showFull: true,
  alt: 'Три карточки Клуба DNS на экране сборки о выборе видеокарты, материнской платы и блока питания',
  caption: 'Общие материалы о выборе видеокарты, материнской платы и блока питания',
};

export const dnsCase = {
  title: 'Упростил доступ к сравнению и возврат к сборке после обзора детали',
  role: 'Исследование, проектирование и проверка прототипа',
  status: 'Исследовательский прототип',
  decisionsTitle: 'Часть 2. Решения и проверка',
  summary: {
    title: 'Контекст',
    context: 'Покупатель собирает ПК под свою задачу и бюджет. DNS помогает отобрать совместимые детали',
    problem: 'Таблицу сравнения трудно найти. По характеристикам сложно понять, какая модель лучше подойдёт и стоит ли доплачивать',
    solution: 'Вынес сравнение к фильтрам, добавил обзоры моделей в каталог и кнопку возврата из статьи к текущей сборке',
    effect: `Таблицу с двумя и более моделями открыли в ${ratio(comparisonResult.opened, comparisonResult.withCatalog)} прохождений с каталогом и полной записью. Полную сборку сохранили в ${ratio(testCounts.saved, testCounts.started)} прохождений`,
    limits: 'Все проходили одну версию прототипа. Для оценки ускорения нужен тест в действующем DNS. Влияние на заказы осталось за рамками теста',
  },
  research: {
    title: 'Часть 1. Исследование',
    discussionsTitle: 'Кабинетное исследование',
    discussionAction: 'Разобрал публичные обсуждения сборок и архив HappyChat. Вручную проверил сообщения и объединил повторы об одном выборе',
    deskMetrics: [
      { value: '336', label: 'Эпизодов выбора между моделями', detail: 'У 323 аккаунтов в HappyChat' },
      { value: '59', label: 'Эпизодов внешней проверки', detail: 'У 57 аккаунтов в HappyChat. Из них 46 также обсуждали выбор' },
      { value: '612 418', label: 'Сообщений в архиве HappyChat', detail: 'От 6 059 аккаунтов за период с 1 сентября 2025 по 2 сентября 2026 года' },
    ],
    discussionExamples: [
      {
        title: 'Публичные обсуждения',
        detail: '14 обсуждений о выборе деталей и 4 о внешней проверке',
      },
      {
        title: 'Понять, стоит ли доплачивать',
        detail: 'В Клубе DNS автор уже подобрал детали и спросил, оправдана ли более дорогая видеокарта',
      },
    ],
    auditTitle: 'UX-аудит',
    auditAction: 'Прошёл сценарий добавления и замены детали в действующем DNS',
    auditFindings: [
      { title: 'Совместимость', detail: 'Фильтр оставляет модели, которые подходят к выбранным деталям' },
      { title: 'Сравнение', detail: 'Модели отмечают в каталоге, а их характеристики сверяют в отдельной таблице' },
      { title: 'Замена', detail: 'При выборе другой модели общая сумма пересчитывается' },
      { title: 'Сохранение', detail: 'Проверенный состав можно сохранить на экране сборки' },
    ],
    interviewTitle: 'Сессии подбора',
    interviewAction: 'Провёл 6 модерируемых сессий в действующем DNS. Участники подбирали детали под свою задачу и бюджет. Седьмую сессию разобрал по записи. Профессиональный сборщик подбирал детали самостоятельно',
    interviewPrompt: 'В части сессий я просил сравнить детали. Если за минуту участник сам не находил таблицу, спрашивал, где он искал и чего ему не хватало для выбора',
    interviewFindings: [
      {
        title: 'Сравнение приходилось искать',
        detail: 'Не всем удалось найти таблицу самостоятельно. Один участник нашёл её сам, но с задержкой',
      },
      {
        title: 'Характеристики было сложно связать с игрой',
        detail: 'Один участник пытался понять, с какой видеокартой игра будет идти плавнее',
        quote: 'Цифры красивые, но вывод я сделать не могу',
        comment: 'interview-quotes',
      },
      {
        title: 'Из сравнения видеокарта попала в корзину',
        detail: 'Участник нажал «В корзину» и ожидал увидеть выбранную видеокарту в сборке. Она добавилась в корзину магазина',
      },
      {
        title: 'Длинную статью закрыли',
        detail: 'Участник открыл статью Клуба DNS из каталога корпусов, бегло посмотрел её и продолжил подбор',
      },
      {
        title: 'Обзор помог проверить блок питания',
        detail: 'В отдельном проходе сборщик открыл обзор в новой вкладке, проверил платформу и конденсаторы, затем вернулся к той же сборке',
      },
    ],
    interviewResultsLimit: 'Чтобы оценить, как часто и надолго покупатели задерживаются при выборе, нужны отдельные замеры',
    interviewDetailsTitle: 'Цитаты и подробности сессий',
    interviewQuotes: [
      {
        title: 'Сравнение видеокарт',
        detail: 'Участник пытался понять, какая характеристика сильнее повлияет на игру',
        quote: '«Я не знаю что мне даст больший выхлоп в игре: турбочастота либо число текстурных блоков. Цифры красивые, но вывод я сделать не могу»',
      },
      {
        title: 'Выбор процессора',
        detail: 'Участники хотели понять, сколько процессор потребляет под реальной нагрузкой, что даёт 3D V-Cache и как рассчитана оценка модели',
        quote: '«Вот есть у них разница такая, а что это за разница, мне надо идти искать на другом сайте. Ладно.»',
      },
      {
        title: 'Возврат к сборке',
        detail: 'Участник выбрал видеокарту в таблице сравнения и нажал «В корзину»',
        quote: '«А подожди, а почему она просто добавилась в корзину? Отсюда я в конструктор интересно могу вернуться?»',
        followUp: 'Другой участник вернулся во вкладку конфигуратора, заново нашёл выбранную видеокарту в каталоге и добавил её оттуда',
      },
    ],
    framesTitle: 'Материалы и кадры исследовательских сессий',
    frames: [
      {
        src: interviewEvidence, width: 3110, height: 774, showFull: true,
        alt: 'Матрица с условиями шести интервью, отдельным проходом сборщика и дословными репликами по сессиям',
        caption: 'Условия заданий, профили и реплики из шести интервью и отдельного прохода сборщика',
        original: { src: interviewEvidenceFull, alt: 'Полная матрица исследовательских сессий' },
      },
      {
        src: researchCatalog, width: 1427, height: 922, showFull: true, roundedCorners: 6, cropInset: 2,
        alt: 'Каталог процессоров Ryzen с отметкой «Сравнить» под названиями моделей',
        caption: 'Отметка «Сравнить» находится в карточке модели',
      },
      {
        src: sessionCheck, width: 1377, height: 960, showFull: true, roundedCorners: 6, cropInset: 2,
        alt: 'Конфигуратор со списком выбранных деталей и состоянием совместимости',
        caption: 'На экране сборки видны цены деталей и статус совместимости',
      },
      {
        src: sessionGpu, width: 1909, height: 1234, showFull: true, roundedCorners: 6, cropInset: 2,
        alt: 'Каталог видеокарт DNS с фильтрами, характеристиками и ценами',
        caption: 'Выбор видеокарты. Характеристики и цены видны в списке моделей',
      },
      {
        src: sessionMotherboard, width: 1906, height: 899, showFull: true, roundedCorners: 6, cropInset: 2,
        alt: 'Список материнских плат с включённым фильтром совместимости',
        caption: 'Выбор материнской платы. Фильтр сужает список до совместимых моделей',
      },
      {
        src: sessionCase, width: 1338, height: 926, showFull: true, roundedCorners: 6, cropInset: 2,
        alt: 'Карточка корпуса DeepCool с фотографией, характеристиками и ценой',
        caption: 'Выбор корпуса. Отдельная карточка показывает фотографии и подробности модели',
      },
      {
        src: sessionSave, width: 1499, height: 924, showFull: true, roundedCorners: 6, cropInset: 2,
        alt: 'Собранный список комплектующих и кнопка «Сохранить» справа',
        caption: 'Состав и сохранение. Действие «Сохранить» находится справа от списка деталей',
      },
    ],
    competitors: {
      title: 'Конкурентный анализ',
      action: 'Сравнил, какие данные видны прямо при подборе детали в трёх конфигураторах',
      findings: [
        { title: 'Ситилинк', detail: 'Клубная цена видна при выборе детали' },
        { title: 'Регард', detail: 'Есть поиск по точной модели и видны активные фильтры' },
        { title: 'X-core.by', detail: 'Рядом с подбором видны цена, прогресс сборки и результаты проверок совместимости' },
      ],
      frames: [
        {
          src: competitorCitilink, width: 1056, height: 594, showFull: true, label: 'Ситилинк',
          alt: 'Слева открыта подсказка о клубной цене в конфигураторе Ситилинка. Справа видны цена со скидкой и клубная цена',
          caption: 'По нажатию на клубную цену появляется подсказка, что для скидки достаточно зарегистрироваться',
        },
        {
          src: competitorRegard, width: 430, height: 430, showFull: true, label: 'Регард',
          alt: 'Схема корпуса в конфигураторе Регарда с кнопками добавления деталей',
          caption: 'Детали можно добавлять прямо на схеме корпуса. Схему отметил один из шести участников',
        },
        {
          src: competitorXcore, width: 1008, height: 944, showFull: true, label: 'X-core.by',
          alt: 'Две готовые конфигурации X-core.by с ценами и наличием деталей',
          caption: 'Перед подбором отдельных деталей можно начать с готовой конфигурации',
        },
      ],
    },
    prioritization: {
      title: 'Приоритизация гипотез',
      action: 'Определил наблюдаемые признаки для 8 гипотез и сверил их с действиями и репликами из сессий',
      evidence: {
        src: prioritizationEvidence, width: 2560, height: 1536,
        alt: 'Верхняя часть матрицы приоритизации с выводами по восьми гипотезам и проверкой признаков по сессиям',
        caption: 'Матрица проверки потребностей. Для каждой гипотезы указаны признак, наблюдения по сессиям и границы вывода',
        original: { src: prioritizationEvidenceFull, alt: 'Полная матрица приоритизации гипотез' },
      },
      selected: [
        {
          title: 'Заметное сравнение',
          hypotheses: [
            'Если сравнение видно при выборе и замене, то его найдут без подсказки',
            'Если видны различия CPU/GPU и можно применить выбор, то сборка продолжится',
          ],
        },
        {
          title: 'Данные для выбора',
          hypotheses: [
            'Если дать результаты, условия и источник, то различия легче проверить и объяснить',
            'Материалы Клуба с различиями и условиями тестов помогут обосновать выбор между вариантами',
          ],
        },
        {
          title: 'Возврат к подбору',
          hypotheses: [
            'Если при переходах сохранять состав и цель, то не придётся искать заново',
            'После целевых данных в статье и возврата в сборку выберут или заменят деталь той же категории',
          ],
        },
      ],
      deferred: 'Отложил сценарии с конфликтами совместимости и показом доплаты после замены. Выбора между важными несовместимыми деталями в сессиях не возникло, а для отдельного показа доплаты наблюдений было мало',
    },
  },
  test: {
    title: 'Немодерируемый UX-тест',
    overviewTitle: 'Подбор и сохранение сборки',
    action: 'Дал участникам задание самостоятельно подобрать пять деталей и сохранить сборку. Все проходили одну версию прототипа',
    comparison: comparisonResult,
    counts: testCounts,
    accounting: `В срезе от 16 ноября 2026 года учёл ${testCounts.started} прохождений. Ещё ${testCounts.technical} были техническими проверками. В каждом показателе журнал считает прохождение один раз`,
    overview: [
      { value: ratio(testCounts.assembled, testCounts.started), label: 'Подобрали все пять деталей' },
      { value: ratio(testCounts.saved, testCounts.started), label: 'Сохранили полную сборку', comment: 'builds-saved' },
      { value: `${testCounts.assembled - testCounts.saved}`, label: 'Подобрали все детали без сохранения' },
      { value: '4 с', label: 'Медиана от открытия каталога до первого выбора', detail: `Первое ручное добавление или замена в той же категории. Медиана по ${testCounts.selected} замерам` },
    ],
    journalSource: 'https://nikomb.github.io/dns-prototype/journal/?task=task-3',
  },
  reflection: {
    title: 'Следующий тест',
    action: 'Дам одинаковое задание в действующем DNS и в прототипе',
    checks: [
      { title: 'Поиск сравнения', detail: 'Где участники сами находят таблицу' },
      { title: 'Выбор модели', detail: 'Какое отличие влияет на выбор детали' },
      { title: 'Завершение сборки', detail: 'В какой момент участники считают сборку законченной' },
    ],
  },
  comparison: {
    frames: [
      {
        src: compareBefore, width: 4020, height: 2400, label: 'Было',
        alt: 'Прототип до изменений. Отметки «Сравнить» в карточках Ryzen 7 7800X3D и 9800X3D',
        caption: 'Ryzen 7 7800X3D и 9800X3D можно отметить для сравнения в карточках',
      },
      {
        src: compareSelection, width: 4020, height: 2400, label: 'Стало',
        alt: 'Те же процессоры отмечены для сравнения. Рядом с фильтрами виден счётчик «2»',
        caption: 'Те же модели отмечены. Кнопка со счётчиком «2» рядом с фильтрами открывает таблицу',
      },
    ] as const,
    detailFrames: [
      {
        src: productCardComparison, width: 1600, height: 900, showFull: true, label: 'Карточка товара',
        alt: 'Сверху чекбокс «Сравнить» в карточке товара. Снизу иконка сравнения рядом с избранным',
        caption: 'Чекбокс «Сравнить» заменили иконкой рядом с избранным',
      },
      {
        src: filterPanelComparison, width: 1600, height: 900, showFull: true, label: 'Панель фильтров',
        alt: 'Сверху поле поиска по фильтрам. Снизу то же поле с кнопкой сравнения',
        caption: 'Справа от поиска появилась кнопка сравнения. Счётчик на ней показывает, сколько товаров отмечено',
      },
    ],
    iteration: {
      title: 'Почему убрал сравнение по наведению',
      label: 'Ранняя итерация',
      shotComment: 'Пятеро сравнивали детали ещё раз. Никто из них не включил этот режим. Поэтому я оставил сравнение в таблице',
      action: 'Проверил, включают ли участники при повторном сравнении режим, который показывает отличия от детали в сборке',
      fact: {
        title: '0 из 5 включили режим',
        comment: 'hover-mode-unused',
        detail: 'Убрал переключатель и оставил таблицу',
      },
      frames: [
        {
          src: hoverModalWithSwitch, width: 4140, height: 2430, label: 'Было',
          alt: 'Каталог с активным переключателем «Сравнение с AMD Ryzen 7 9800X3D» и карточкой Ryzen 7 5700X, показывающей различия',
          caption: 'Включён переключатель «Сравнение с AMD Ryzen 7 9800X3D». При наведении карточка показывает отличия по сокету, частотам и тепловыделению',
        },
        {
          src: hoverModalWithoutSwitch, width: 4140, height: 2430, label: 'Стало',
          alt: 'Тот же каталог без переключателя сравнения по наведению, с обычными характеристиками в карточке Ryzen 7 5700X',
          caption: 'Переключатель убран. Карточка Ryzen 7 5700X показывает обычные характеристики',
        },
      ] as const,
      toggleFigure: {
        src: hoverToggleStates, width: 1600, height: 900, showFull: true,
        alt: 'Сверху режим выключен. Снизу включён, в подписи указан AMD Ryzen 7 9800X3D',
        caption: 'При повторном входе в категорию режим можно было включить переключателем. В подписи было видно, с какой деталью из сборки сравниваются модели',
      },
      differencesFigure: {
        src: hoverCardDifferences, width: 2464, height: 584,
        previewCrop: { top: 32, height: 520, horizontal: { left: 500, width: 1000 } },
        alt: 'Карточка AMD Ryzen 7 5700X с блоком «Различие» и характеристиками AMD Ryzen 7 9800X3D',
        caption: 'При наведении карточка показывала, чем процессор отличается от уже выбранного',
      },
    },
  },
  scenario: {
    label: 'Сценарий',
    title: 'Выбор процессора',
    action: 'Покупатель открывает обзор из каталога и возвращается к подбору',
    result: 'Добавляет Ryzen 7 7800X3D в сборку и переходит к выбору материнской платы',
    video: {
      src: processorScenario,
      poster: processorScenarioPoster,
      title: 'Сценарий выбора процессора в конфигураторе DNS',
    },
  },
  quickChoice: {
    title: 'Быстрый выбор на экране сборки',
    action: 'Покупатель нажимает стрелку рядом с «Добавить»',
    result: 'Открывается лента моделей с ценами. Деталь можно выбрать прямо в сборке. Кнопка «Добавить» открывает полный каталог',
    articlesIntro: 'Рядом со сборкой показываются статьи по уже выбранным деталям. Если подходящих статей нет, там появляются общие материалы по сборке ПК',
    frames: [
      {
        src: quickChoice, width: 1060, height: 886, showFull: true, label: 'Быстрый выбор процессора',
        alt: 'Строка «Процессор» в двух состояниях. Сверху она свёрнута, снизу открыта лента с моделями и ценами',
        caption: 'Сверху — свёрнутая строка. Снизу — лента с моделями, ценами и стрелкой прокрутки',
      },
      { ...buildArticlesFigure, label: 'Статьи на экране сборки' },
    ],
  },
};

export const dnsDecisions: readonly Decision[] = [
  {
    id: 'dns-comparison',
    title: 'Сравнение у фильтров',
    hypothesis: testHypotheses.comparison,
    hypothesisText: ['Если ', 'сравнение доступно при выборе или замене детали', ', пользователь заметит его без подсказки и сопоставит варианты внутри DNS.'],
    solution: 'Вынес кнопку сравнения со счётчиком к фильтрам. В режиме «Только различия» в таблице остаются строки с разными значениями',
    metrics: [
      {
        value: ratio(comparisonResult.started, comparisonResult.withCatalog),
        label: 'Начали пользоваться сравнением',
        detail: 'Учитывал прохождения с каталогом и полной записью. Первым шагом считал добавление модели или открытие таблицы, в том числе пустой',
      },
      {
        value: ratio(comparisonResult.opened, comparisonResult.withCatalog),
        label: 'Открыли таблицу с двумя или более моделями',
        detail: 'Учитывал модели одной категории, включая добавленные в самой таблице',
        comment: 'comparison-opened',
      },
      {
        value: '2 с', label: 'Медиана до первого действия со сравнением',
        detail: `От открытия каталога. Медиана по ${comparisonResult.started} замерам`,
      },
    ],
    detailFrames: dnsCase.comparison.detailFrames,
    solutionFigure: {
      src: compareTable, width: 1380, height: 1022,
      alt: 'Таблица сравнения Ryzen 7 7800X3D, 9800X3D и 9700X в режиме «Только различия»',
      caption: 'Перед выбором детали для сборки здесь можно сверить цены и отличия в характеристиках отмеченных моделей',
    },
    comparison: dnsCase.comparison.frames,
  },
  {
    id: 'dns-return',
    title: 'Возврат к сборке',
    hypothesis: testHypotheses.evidence,
    hypothesisText: ['Если участник просмотрит в статье целевые данные о комплектующих (тесты, характеристики, совместимость), то ', 'после возврата в конфигуратор', ' он выберет или заменит деталь той же категории.'],
    solution: 'Если обзор открыт из конфигуратора, закреплённая панель показывает детали и сумму. Кнопка «В конфигуратор» возвращает к той же сборке',
    metrics: [
      {
        value: ratio(evidenceResult.viewed, evidenceResult.opened), label: 'Просмотрели целевые данные',
        detail: 'Среди открывших статью с измеряемыми данными учитывал показ целевого блока не менее пяти секунд подряд',
        comment: 'article-data-view',
      },
      {
        value: ratio(evidenceResult.selected, evidenceResult.viewed), label: 'Выбрали деталь после просмотра и возврата',
        detail: 'Учитывал ручное добавление или замену в той же категории. В знаменатель входят и просмотры, после которых выбор установить не удалось',
      },
      {
        value: '22 с', label: 'Медиана от показа данных до выбора',
        detail: `От начала подтверждённого показа до первого выбора после возврата, включая паузы. Медиана по ${evidenceResult.selected} замерам`,
      },
    ],
    detailFrames: [
      {
        src: articlePanelExpandedDetail, width: 2248, height: 244, label: 'При открытии статьи',
        previewCrop: { top: 0, height: 244, horizontal: { left: 48, width: 1160 } },
        alt: 'Широкая панель сборки в начале обзора с выбранным процессором и материнской платой',
        caption: 'При переходе из конфигуратора видны две выбранные детали и стоимость сборки',
      },
      {
        src: articlePanelScroll, width: 1712, height: 1416, roundedCorners: 6, label: 'При прокрутке',
        previewCrop: { top: 0, height: 963 },
        alt: 'Компактная панель сборки над разделом обзора DNS с результатами тестирования процессоров',
        caption: 'Компактная панель с суммой, деталями и кнопкой «В конфигуратор» закреплена над результатами тестирования',
      },
    ],
    comparison: [
      {
        src: articlePanelBefore, width: 1920, height: 1120, label: 'Было',
        alt: 'Раздел с результатами тестирования процессоров в середине обзора Клуба DNS',
        caption: 'В разделе с результатами тестирования ещё нет панели сборки и кнопки возврата',
      },
      {
        src: articlePanelAfter, width: 1920, height: 1120, label: 'Стало',
        alt: 'Над результатами тестирования закреплена панель с выбранным процессором, суммой и кнопкой «В конфигуратор»',
        comment: 'return-caption',
        caption: 'При прокрутке панель остаётся видна. Кнопка «В конфигуратор» возвращает к текущей сборке',
      },
    ],
  },
  {
    id: 'dns-articles',
    title: 'Обзоры моделей в каталоге',
    hypothesis: testHypotheses.recommendation,
    hypothesisText: ['Если при выборе или сравнении ', 'показать подходящие материалы Клуба, объясняющие различия и условия тестов', ', пользователю будет легче обосновать выбор между вариантами.'],
    comment: 'article-skipped',
    solution: 'Показал над товарами обзоры Клуба DNS. Метка на обложке связывает статью с моделью в каталоге',
    metrics: [
      {
        value: ratio(recommendationResult.viewed, recommendationResult.offered), label: 'Посмотрели рекомендованный обзор',
        detail: 'Засчитывал переход из рекомендации, если статья была видна не менее трёх секунд или её вручную прокрутили дальше середины',
      },
      {
        value: ratio(recommendationResult.selected, recommendationResult.viewed), label: 'Посмотрели обзор и выбрали деталь той же категории',
        detail: 'Учитывал выбор после возврата и случаи, когда деталь выбрали до просмотра и оставили в сборке. Чтобы выяснить, помог ли обзор, нужно спросить участника',
      },
      {
        value: '28 с', label: 'Медиана от открытия обзора до выбора',
        detail: 'Считал до ручного выбора детали той же категории после возврата. Медиана по 11 замерам',
      },
    ],
    detailFrames: [
      {
        src: catalogArticlesDetail, width: 1648, height: 464,
        previewCrop: { top: 0, height: 464, horizontal: { left: 500, width: 1040 } },
        alt: 'Лента из трёх обзоров процессоров с оранжевыми метками моделей над выдачей',
        caption: 'Метки на обложках показывают, о каких процессорах рассказывают обзоры над выдачей',
      },
    ],
    comparison: [
      {
        src: catalogArticlesBefore, width: 2048, height: 1152, label: 'Было',
        alt: 'В каталоге процессоров сразу под фильтрами начинаются карточки товаров',
        caption: 'Сразу под фильтрами — список процессоров',
      },
      {
        src: catalogArticlesAfter, width: 2048, height: 1152, label: 'Стало',
        alt: 'Над списком процессоров появилась лента обзоров Клуба DNS с оранжевыми метками моделей',
        caption: 'Над товарами появилась лента обзоров. Метка «AMD Ryzen 7 9800X3D» связывает обзор с моделью в выдаче',
      },
    ],
  },
];

export const dnsContents = [
  { id: 'projects-heading', label: dnsCase.summary.title, note: 'Проблема, решение и эффект' },
  { id: 'dns-desk-research', label: dnsCase.research.discussionsTitle, note: 'Обсуждения сборок' },
  { id: 'dns-audit', label: dnsCase.research.auditTitle, note: 'Путь выбора детали' },
  { id: 'dns-interview-task', label: dnsCase.research.interviewTitle, note: '6 модерируемых и 1 самостоятельная' },
  { id: 'dns-competitors', label: dnsCase.research.competitors.title, note: 'Три конфигуратора' },
  { id: 'dns-prioritization', label: dnsCase.research.prioritization.title },
  ...dnsDecisions.map(({ id, title, hypothesis }) => ({ id, label: title, note: `Гипотеза ${hypothesis}` })),
  { id: 'dns-scenario', label: dnsCase.scenario.label, note: dnsCase.scenario.title },
  { id: 'dns-quick-choice', label: dnsCase.quickChoice.title },
  { id: 'dns-test-overview', label: dnsCase.test.overviewTitle, note: `${testCounts.started} прохождений` },
  { id: 'dns-next-test', label: dnsCase.reflection.title },
];

export const dnsMascotComments: Readonly<Record<string, string>> = {
  'intro': 'Сборку сохранили. Кто уже мысленно пробил чек?',
  'external-review': 'Сборку кинули в чат. С чего мы решили, что в DNS им было неудобно?',
  'comparison-search': 'А где бы ты искал кнопку сравнения?',
  'interview-quotes': 'Цифры есть. Что брать и куда жать? Угадай с трёх раз',
  'comparison-opened': 'Две модели в таблице. Ну и какую брать?',
  'hover-mode-unused': 'Ноль из пяти включили. Удобный был режим? Вот и я не знаю',
  'article-skipped': 'Я за FPS в своей игре. До графика сколько листать?',
  'return-caption': 'Я вернулся. Тот самый процессор теперь искать заново?',
  'ryzen-review': 'А если среди статей нет обзора на мою модель?',
  'builds-saved': `${testCounts.saved} из ${testCounts.started} сохранили сборку. А сколько сохранили бы в обычном DNS?`,
  'article-data-view': 'Открыл график и ушёл за чаем. Через пять секунд я уже «посмотрел данные»',
};
