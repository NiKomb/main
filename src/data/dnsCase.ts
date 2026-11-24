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
import articlePanelStates from './screens/dns-article-panel-states.webp';
import hoverModalWithoutSwitch from './screens/dns-hover-modal-before.webp';
import hoverModalWithSwitch from './screens/dns-hover-modal-after.webp';
import hoverToggleStates from './screens/dns-hover-toggle-states.png';
import hoverCardDifferences from './screens/dns-hover-card-differences.png';
import processorScenario from './screens/dns-processor-scenario.mp4';
import processorScenarioPoster from './screens/dns-processor-scenario.webp';
import quickChoice from './screens/dns-quick-choice.webp';
import buildRecommendedArticles from './screens/dns-build-recommended-articles.webp';

export type CaseFigure = ProjectImage & { caption: string; label?: string; comment?: string };
export type CaseFact = { title: string; detail: string; comment?: string; highlight?: boolean };
export type CaseMetric = { value: string; label: string; detail?: string; comment?: string; highlight?: boolean };

type Decision = {
  id: string;
  contentsLabel: string;
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

export const dnsCase = {
  title: 'Упростил доступ к сравнению и возврат к сборке после обзора детали',
  role: 'Изучил, как покупатели выбирают комплектующие, спроектировал изменения в конфигураторе и проверил их с пользователями',
  status: 'Рабочая демоверсия',
  decisionsTitle: 'Проектирование',
  summary: {
    title: 'Контекст',
    context: 'В конфигураторе DNS покупатель открывает **каталог**, чтобы добавить или заменить деталь в сборке ПК. Из совместимых моделей он выбирает ту, что подходит под его задачу и бюджет',
    problem: 'Участники с трудом находили **таблицу сравнения**, а за результатами тестов комплектующих обращались к обзорам',
    solution: 'Вынес **кнопку сравнения** к **фильтрам**, показал **обзоры Клуба DNS** над списком товаров и добавил в обзоры **возврат к текущей сборке**. Проверил решения на рабочем веб‑прототипе',
    effect: `В ${ratio(comparisonResult.opened, comparisonResult.withCatalog)} прохождений с каталогом открыли сравнение нескольких моделей. В ${ratio(testCounts.saved, testCounts.started)} сохранили полную сборку`,
    limits: 'Личный проект. Изменения реализованы в прототипе. Внедрение в действующий DNS — за рамками проекта',
  },
  research: {
    title: 'Исследование',
    discussionsTitle: 'Кабинетное исследование',
    discussionAction: 'Разобрал публичные обсуждения сборок, в том числе в Клубе DNS, и архив HappyChat из 612 418 сообщений. Повторные сообщения об одном выборе объединил в один эпизод',
    deskMetrics: [
      { value: '336', label: 'Эпизодов выбора между моделями', detail: 'У 323 аккаунтов в HappyChat', highlight: true },
      { value: '59', label: 'Эпизодов, где искали дополнительную проверку', detail: 'У 57 аккаунтов в HappyChat' },
      { value: '46 из 57', label: 'Аккаунтов, которые искали дополнительную проверку и также обсуждали выбор моделей' },
    ],
    discussionConclusion: 'В обсуждениях люди **сравнивали модели и искали данные, которых не хватало для выбора**. На сессиях в DNS я проверил, как участники решают обе задачи во время подбора деталей',
    auditTitle: 'UX-аудит',
    auditAction: 'Прошёл сценарий добавления и замены детали в действующем DNS',
    auditProblemsTitle: 'Где усложняется выбор детали',
    auditProblems: [
      {
        title: 'Вход в сравнение',
        detail: 'В карточках отмечают чекбоксы «Сравнить». При наведении на отмеченный чекбокс открывается список моделей с кнопкой «Сравнить»',
      },
      {
        title: 'Данные для выбора',
        highlight: true,
        detail: 'В выдаче видны цена и характеристики. Результаты тестов под нагрузкой нужно искать в обзорах',
      },
      {
        title: 'Добавление в сборку',
        detail: 'Из таблицы товар можно добавить в корзину. Для добавления в сборку включают «Режим сборки ПК» справа вверху списка товаров и нажимают «Добавить» в карточке',
      },
    ],
    auditConclusion: '**В DNS характеристики сверяют в таблице, а результаты тестов ищут в обзорах**. В прототипе я вынес вход в сравнение и ссылки на обзоры ближе к товарам, а из обзора сделал возврат к текущей сборке',
    interviewTitle: 'Интервью',
    interviewAction: 'Провёл шесть модерируемых сессий. Участники рассказывали, как выбирают комплектующие, и подбирали детали в действующем DNS под свою задачу и бюджет',
    interviewPrompt: 'В части сессий я просил сравнить детали. Если за минуту участник сам не находил таблицу, спрашивал, где он искал и чего ему не хватало для выбора. Седьмую сессию разобрал по записи. Профессиональный сборщик подбирал детали самостоятельно',
    interviewFindings: [
      {
        value: '5 участников',
        label: 'Сравнение приходилось искать',
        highlight: true,
        detail: 'Четверым понадобилась подсказка. Ещё один нашёл таблицу с задержкой',
      },
      {
        value: '1 участник',
        label: 'Характеристики было сложно связать с игрой',
        detail: 'По характеристикам видеокарт не смог понять, с какой из них игра пойдёт плавнее',
        comment: 'interview-quotes',
      },
      {
        value: '1 участник',
        label: 'Из сравнения видеокарта попала в корзину',
        detail: 'Ожидал увидеть деталь в сборке',
      },
    ],
    interviewConclusion: 'В сессиях чаще всего повторялась одна проблема — **участникам было трудно найти таблицу сравнения**. Поэтому я перенёс кнопку сравнения к фильтрам каталога',
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
      action: 'Посмотрел, что видно при выборе детали в трёх конфигураторах ПК',
      findings: [
        { title: 'Ситилинк', detail: 'Клубная цена видна сразу при выборе детали' },
        { title: 'Регард', detail: 'Поиск по точной модели и активные фильтры помогают уточнить список товаров' },
        { title: 'X-core.by', detail: 'Рядом с подбором видны общая цена, прогресс сборки и результаты проверки совместимости' },
      ],
      conclusion: 'В каждом конфигураторе часть данных для решения видна прямо во время подбора. Для DNS я взял тот же принцип. **Кнопка сравнения и обзоры должны быть рядом со списком деталей, где человек решает, что добавить в сборку**',
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
      rationale: 'Выбрал три из восьми гипотез по тому, что повторялось в сессиях. Участники искали сравнение, проверяли детали в обзорах и с трудом возвращались к сборке. Эффект решений ещё не замерял, поэтому не выставлял баллы RICE и ICE. Конфликты деталей и показ доплаты отложил из-за нехватки примеров',
      evidence: {
        src: prioritizationEvidence, width: 2560, height: 1536,
        alt: 'Верхняя часть матрицы приоритизации с выводами по восьми гипотезам и проверкой признаков по сессиям',
        caption: 'Матрица проверки потребностей. Для каждой гипотезы указаны признак, наблюдения по сессиям и границы вывода',
        original: { src: prioritizationEvidenceFull, alt: 'Полная матрица приоритизации гипотез' },
      },
    },
  },
  test: {
    title: 'Немодерируемый UX-тест',
    action: 'Дал участникам задание самостоятельно подобрать пять комплектующих и сохранить сборку. Все проходили одну версию рабочего веб‑прототипа',
    comparison: comparisonResult,
    counts: testCounts,
    accounting: `В срезе от 16 ноября 2026 года учёл ${testCounts.started} прохождений. Каждое прохождение учитывал один раз в каждом показателе`,
    overview: [
      { value: ratio(comparisonResult.opened, comparisonResult.withCatalog), label: 'Открыли таблицу с двумя или более моделями', detail: 'Среди прохождений с каталогом' },
      { value: ratio(testCounts.assembled, testCounts.started), label: 'Подобрали все пять комплектующих' },
      { value: ratio(testCounts.saved, testCounts.started), label: 'Сохранили полную сборку', comment: 'builds-saved', highlight: true },
    ],
    conclusion: `**В ${testCounts.assembled - testCounts.saved} прохождениях все детали подобрали, но сборку не сохранили**. В следующем тесте отдельно посмотрю, что происходит после выбора последней детали. Чтобы понять, стало ли проще найти сравнение, нужен сопоставимый замер в исходном интерфейсе`,
    journalSource: 'https://nikomb.github.io/dns-prototype/journal/?task=task-3',
  },
  reflection: {
    title: 'Рефлексия',
    summary: 'Рабочий веб‑прототип и журнал действий помогли проследить весь путь от выбора деталей до сохранения сборки',
    takeaways: [
      {
        title: 'Что изменил после проверки',
        highlight: true,
        detail: 'Я добавил сравнение по наведению после одного наблюдения и убрал его после теста. В следующем проекте **сначала проверю, сравнивают ли другие участники характеристики прямо в карточках**',
      },
      {
        title: 'Что узнал об обзорах',
        detail: 'В обзорах я отметил целевые блоки с тестами, характеристиками и данными о совместимости. Журнал показывает, дошёл ли участник до этих блоков. В следующем тесте **спрошу, какие данные из обзора помогли выбрать модель**',
      },
      {
        title: 'Как оценить эффект',
        detail: 'Заранее определю, что проверить для каждого решения. В каталоге посмотрю, **найдёт ли участник кнопку сравнения без подсказки**, пока выбирает деталь',
      },
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
      fact: {
        title: '0 из 5 включили режим',
        highlight: true,
        comment: 'hover-mode-unused',
        detail: 'Убрал переключатель и оставил таблицу',
        context: 'Участник сверял характеристики в карточках. Добавил сравнение с деталью из сборки по наведению. Проверил, включат ли режим при повторном сравнении',
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
};

export const dnsDecisions: readonly Decision[] = [
  {
    id: 'dns-comparison',
    contentsLabel: 'Сравнение товаров',
    hypothesis: testHypotheses.comparison,
    hypothesisText: ['Если ', 'сравнение доступно при выборе или замене детали', ', пользователь заметит его без подсказки и сопоставит варианты внутри DNS.'],
    solution: 'Вынес **кнопку сравнения со счётчиком** к фильтрам, чтобы её можно было найти прямо при выборе детали. В режиме **«Только различия»** таблица показывает только строки с разными значениями',
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
        highlight: true,
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
    contentsLabel: 'Возврат из статьи',
    hypothesis: testHypotheses.evidence,
    hypothesisText: ['Если участник просмотрит в статье целевые данные о комплектующих (тесты, характеристики, совместимость), то ', 'после возврата в конфигуратор', ' он выберет или заменит деталь той же категории.'],
    solution: 'Если обзор открыт из конфигуратора, **закреплённая панель** показывает детали и сумму. Кнопка **«В конфигуратор»** возвращает к той же сборке',
    metrics: [
      {
        value: ratio(evidenceResult.viewed, evidenceResult.opened), label: 'Просмотрели целевые данные',
        detail: 'Среди открывших статью с измеряемыми данными учитывал показ целевого блока не менее пяти секунд подряд',
        comment: 'article-data-view',
        highlight: true,
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
        src: articlePanelStates, width: 2248, height: 1692, label: 'Панель сборки в обзоре',
        previewCrop: { top: 0, height: 1200 },
        alt: 'Сверху широкая панель сборки отдельно, снизу компактная панель над результатами тестирования процессоров',
        caption: 'Сверху — панель при открытии статьи. Снизу — компактная панель, которая остаётся над текстом при прокрутке',
      },
      {
        src: quickChoice, width: 2052, height: 876, showFull: true, label: 'Выбор прямо в сборке',
        previewCrop: { top: 0, height: 876, horizontal: { left: 414, width: 1638 } },
        alt: 'Строка «Процессор» на всю ширину сборки. Сверху лента свёрнута, снизу раскрыта и показывает модели с ценами',
        caption: 'Сверху — свёрнутая строка. Снизу — модели с ценами после нажатия на стрелку рядом с «Добавить»',
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
    contentsLabel: 'Обзоры деталей',
    hypothesis: testHypotheses.recommendation,
    hypothesisText: ['Если при выборе или сравнении ', 'показать подходящие материалы Клуба, объясняющие различия и условия тестов', ', пользователю будет легче обосновать выбор между вариантами.'],
    comment: 'article-skipped',
    solution: 'Показал над товарами **обзоры Клуба DNS**. **Метка на обложке** связывает статью с моделью в каталоге',
    metrics: [
      {
        value: ratio(recommendationResult.viewed, recommendationResult.offered), label: 'Посмотрели рекомендованный обзор',
        detail: 'Засчитывал переход из рекомендации, если статья была видна не менее трёх секунд или её вручную прокрутили дальше середины',
      },
      {
        value: ratio(recommendationResult.selected, recommendationResult.viewed), label: 'Посмотрели обзор и выбрали деталь той же категории',
        highlight: true,
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
      {
        src: buildRecommendedArticles, width: 700, height: 1534, showFull: true,
        previewCrop: { top: 0, height: 480 },
        alt: 'Три карточки Клуба DNS на экране сборки о выборе видеокарты, материнской платы и блока питания',
        caption: 'Если по выбранным деталям нет подходящих обзоров, справа от сборки показываются общие материалы по выбору комплектующих',
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
  { id: 'dns-summary', label: dnsCase.summary.title, note: 'Задача и эффект' },
  { id: 'dns-desk-research', label: 'Погружение', note: dnsCase.research.discussionsTitle, divider: dnsCase.research.title },
  { id: 'dns-audit', label: dnsCase.research.auditTitle, note: 'Путь выбора детали' },
  { id: 'dns-interview-task', label: dnsCase.research.interviewTitle, note: 'Глубинки и юзабилити‑задание' },
  { id: 'dns-competitors', label: 'Конкуренты', note: 'Три конфигуратора' },
  { id: 'dns-prioritization', label: 'Отбор гипотез', note: 'Что вошло в прототип' },
  ...dnsDecisions.map(({ id, contentsLabel, hypothesis }, index) => ({
    id,
    label: contentsLabel,
    note: `Гипотеза ${hypothesis}`,
    divider: index === 0 ? dnsCase.decisionsTitle : undefined,
  })),
  { id: 'dns-scenario', label: dnsCase.scenario.label, note: dnsCase.scenario.title, divider: dnsCase.test.title },
  { id: 'dns-test-overview', label: 'UX‑тест', note: `${testCounts.started} прохождений веб‑прототипа` },
  { id: 'dns-next-test', label: dnsCase.reflection.title, note: 'Что понял по итогам', divider: null },
];

export const dnsMascotComments: Readonly<Record<string, string>> = {
  'intro': 'Сколько выйдет весь ПК, если взять процессор подороже?',
  'external-review': 'В чате просят совета по сборке. Хватило ли им данных в магазине?',
  'comparison-search': 'Где бы ты искал кнопку сравнения деталей в каталоге?',
  'interview-quotes': 'С какой видеокартой моя игра пойдёт плавнее?',
  'comparison-opened': 'Две модели уже в таблице сравнения. Какую взять для сборки?',
  'hover-mode-unused': 'Режим сравнения по наведению никто не включил. Его вообще заметили?',
  'article-skipped': 'Где в обзоре посмотреть тесты для моей игры?',
  'return-caption': 'В новой версии кнопка «В конфигуратор» вернёт меня к моей сборке',
  'ryzen-review': 'А если обзора на мой процессор нет?',
  'builds-saved': `В прототипе полную сборку сохранили в ${testCounts.saved} из ${testCounts.started} прохождений. А сколько сохранили бы в обычном DNS?`,
  'article-data-view': 'Открыл график и ушёл за чаем. Через пять секунд я уже «посмотрел данные»',
};
