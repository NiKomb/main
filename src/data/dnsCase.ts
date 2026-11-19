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
import articlePanelBefore from './screens/dns-article-panel-before.webp';
import articlePanelAfter from './screens/dns-article-panel-after.webp';
import hoverModalWithoutSwitch from './screens/dns-hover-modal-before.webp';
import hoverModalWithSwitch from './screens/dns-hover-modal-after.webp';
import hoverToggleStates from './screens/dns-hover-toggle-states.png';
import processorScenario from './screens/dns-processor-scenario.mp4';
import processorScenarioPoster from './screens/dns-processor-scenario.webp';
import quickChoice from './screens/dns-quick-choice.webp';
import buildRecommendedArticles from './screens/dns-build-recommended-articles.webp';

export type CaseFigure = ProjectImage & { caption: string; label?: string; comment?: string };
export type CaseFact = { title: string; detail: string; comment?: string };
export type CaseMetric = { value: string; label: string; detail?: string; comment?: string };

type Decision = {
  id: string;
  title: string;
  hypothesis: number;
  hypothesisText: string;
  contentsLabel: string;
  checkTitle: string;
  checkMethod: string;
  metrics: readonly CaseMetric[];
  observation?: { text: string; comment: string };
  solution: string;
  solutionFigure?: CaseFigure;
  comparison: { title: string; frames: readonly [CaseFigure, CaseFigure] };
};

// Срез исследовательского задания task-3 из журнала DNS, 16.11.2026.
const testCounts = { started: 26, selected: 24, assembled: 19, saved: 15 };
const testHypotheses = { comparison: 1, evidence: 2, recommendation: 3 };
const comparisonResult = { started: 14, opened: 12, withCatalog: 24 };
const evidenceResult = { opened: 18, viewed: 8, selected: 7 };
const recommendationResult = { offered: 24, viewed: 12, selected: 11 };

function ratio(numerator: number, denominator: number) {
  return `${numerator} из ${denominator}`;
}

const comparisonTableMetric: CaseMetric = {
  value: ratio(comparisonResult.opened, comparisonResult.withCatalog),
  label: 'Открыли таблицу с двумя или больше товарами',
  detail: 'Из прохождений с каталогом и полной записью взял случаи, когда в открытой таблице было хотя бы два разных товара одной категории. Учитывал и товары, добавленные уже в таблице',
};
const evidenceSelectionMetric: CaseMetric = {
  value: ratio(evidenceResult.selected, evidenceResult.viewed),
  label: 'Выбрали деталь после просмотра данных',
  detail: 'Среди прохождений с подтверждённым просмотром учитывал ручное добавление или замену детали той же категории после возврата в конфигуратор. Просмотры, после которых выбор установить не удалось, остаются в знаменателе',
};
const recommendationViewingMetric: CaseMetric = {
  value: ratio(recommendationResult.viewed, recommendationResult.offered),
  label: 'Просмотрели рекомендованную статью',
  detail: 'Среди получивших рекомендации засчитывал переход из предложения, если статья была видна не менее трёх секунд или участник вручную прокрутил её дальше середины',
};
const recommendationSelectionMetric: CaseMetric = {
  value: ratio(recommendationResult.selected, recommendationResult.viewed),
  label: 'Просмотрели рекомендацию и выбрали деталь',
  detail: 'Среди просмотревших статью с известным результатом выбора искал деталь той же категории. Учитывал выбор после возврата или до просмотра, если деталь осталась в сборке',
};

export const dnsCase = {
  title: 'Как помочь выбрать комплектующие для сборки ПК',
  year: 2026,
  introduction: 'Конфигуратор DNS помогает подобрать совместимые детали. Но даже когда список уже сузился, остаётся вопрос: какую модель взять? Будет ли заметна разница между двумя видеокартами в моей игре? Стоит ли за неё доплачивать?',
  role: 'Исследование, проектирование и проверка прототипа',
  status: 'Исследовательский прототип',
  sectionLabels: {
    research: 'Погружение',
    interviews: 'Интервью',
    decisions: 'Решения',
    scenario: 'Сценарий выбора',
    test: 'Немодерируемый UX-тест',
  },
  summary: {
    task: 'Помочь покупателю выбрать деталь и продолжить сборку. Для DNS сохранённая сборка — один из шагов к заказу',
    solution: 'Вынес сравнение к фильтрам каталога, добавил обзоры по моделям из списка и сделал возврат из статьи к уже выбранным деталям',
    check: 'В самостоятельном тесте нужно было подобрать детали до видеокарты и сохранить сборку',
    next: 'Проверить, легче ли найти сравнение и какую роль статьи играют в выборе',
  },
  research: {
    title: 'Исследование',
    discussionsTitle: 'Как люди проверяют выбор',
    discussions: [
      'Я начал с обсуждений сборок. В Клубе DNS один автор выбирал между тремя конфигурациями и спрашивал, за какую стоит доплатить. Другой уже подобрал детали и сомневался, есть ли смысл брать более дорогую видеокарту.',
      'В публичных обсуждениях отдельно отмечал выбор между вариантами и поиск второго мнения. Например, один автор вынес готовую сборку в чат за оценкой. В HappyChat я исключал рекламу и общие советы, а повторные сообщения об одном выборе объединял в эпизод',
    ],
    deskMetrics: [
      { value: '14', label: 'Публичных обсуждений о выборе деталей' },
      { value: '4', label: 'Публичных обсуждения о внешней проверке' },
      { value: '612 418', label: 'Сообщений в архиве HappyChat', detail: 'С 1 сентября 2025 по 2 сентября 2026 года' },
      { value: '6 059', label: 'Аккаунтов писали в архиве' },
      { value: '13 523', label: 'Сообщения-кандидата', detail: 'Их нашёл поиск перед ручной проверкой и объединением повторов' },
      { value: '323', label: 'Аккаунта обсуждали выбор', detail: '336 эпизодов выбора между вариантами' },
      { value: '57', label: 'Аккаунтов искали внешнюю проверку', detail: '59 эпизодов внешней проверки' },
      { value: '46', label: 'Аккаунтов вошли в обе группы' },
    ],
    auditTitle: 'Что я проверил в DNS',
    audit: 'Я прошёл путь от добавления и замены детали до возврата к сборке. Проверил, где открывается сравнение, какие данные есть в карточке товара и как добавить выбранную модель',
    flow: ['Сборка', '«Добавить» или «Заменить»', 'Каталог', 'Карточка товара', 'Сравнение', 'Возврат к сборке'],
    auditFindings: [
      { title: 'Что уже есть', detail: 'В DNS можно подобрать совместимые детали, сравнить и заменить их. При замене сумма пересчитывается. Сборку можно сохранить, а материалы по деталям найти в Клубе DNS' },
      { title: 'Что остаётся неясным', detail: 'Находит ли человек сравнение в момент выбора и помогает ли таблица понять значимые для его задачи отличия?' },
      { title: 'Границы вывода', detail: 'Сборщик открыл в отдельной вкладке обзор блока питания, проверил платформу и конденсаторы и вернулся к той же сборке. В этом проходе вкладки дополнили конфигуратор. Причины переходов в других сценариях нужно проверять отдельно' },
    ],
    sessionsTitle: 'Как проходили сессии',
    sessions: [
      'На шести сессиях участники подбирали процессор, материнскую плату, видеокарту и корпус в действующем конфигураторе DNS. Задачи и бюджеты различались. Например, в одной сессии нужно было подобрать детали для Cyberpunk 2077 в 1440p и уложиться в 150 000 ₽.',
      'Я смотрел, где участники ищут сравнение, по каким данным выбирают модель и как добавляют её в сборку. Иногда модератор отдельно просил сравнить две модели или подсказывал, где открыть таблицу. Ещё я посмотрел, как профессиональный сборщик подбирает игровой ПК в прямом эфире',
    ],
    interviewFindingsTitle: 'Что показали интервью',
    interviewFindings: [
      {
        title: 'Сравнение приходилось искать',
        detail: 'Часть участников открыла таблицу после подсказки. Один нашёл её сам, но с задержкой',
      },
      {
        title: 'Характеристики было сложно связать с игрой',
        detail: 'Один участник пытался понять, с какой видеокартой игра будет идти плавнее',
        quote: '«Цифры красивые, но вывод я сделать не могу»',
      },
      {
        title: 'Из сравнения видеокарта попала в корзину',
        detail: 'Участник нажал «В корзину» и ожидал увидеть выбранную видеокарту в сборке. Она добавилась в корзину магазина',
      },
    ],
    interviewResultsLimit: 'Чтобы оценить, как часто и надолго покупатели задерживаются при выборе, нужны отдельные замеры',
    interviewDetailsTitle: 'Полные цитаты и подробности интервью',
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
        caption: 'Выбор процессора. Отметка «Сравнить» находится в карточке модели',
      },
      {
        src: sessionCheck, width: 1377, height: 960, showFull: true, roundedCorners: 6, cropInset: 2,
        alt: 'Конфигуратор со списком выбранных деталей и состоянием совместимости',
        caption: 'Проверка сборки. Рядом с деталями видны их цены и статус совместимости',
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
      title: 'Как устроен выбор у других',
      intro: 'В конфигураторе Ситилинка клубная цена видна прямо при выборе детали. В Регарде можно искать по точной модели и видеть активные фильтры. В X-core.by рядом с выбором остаются цена, прогресс сборки и результаты проверок совместимости',
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
      intro: 'Сопоставил восемь исходных гипотез с эпизодами шести интервью и отдельного прохода сборщика. Для каждой записал, по какому действию или реплике можно заметить потребность, и отметил основание по каждой записи',
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
      deferred: 'Разбор различий CPU и GPU опирался на отдельные эпизоды. Выбора между двумя важными несовместимыми деталями в сессиях не возникло. Вопрос к причине предупреждения возник в одной сессии, а для отдельного показа изменения цены после замены данных оказалось недостаточно',
    },
  },
  test: {
    title: 'Результаты UX-теста',
    shortResult: `${ratio(testCounts.assembled, testCounts.started)} подобрали пять деталей, ${ratio(testCounts.saved, testCounts.started)} сохранили полную сборку`,
    intro: 'Участники самостоятельно подбирали комплектующие до видеокарты включительно. Задание заканчивалось сохранением сборки. Все проходили одну версию прототипа без модератора и без сравнения с исходным интерфейсом DNS',
    comparison: comparisonResult,
    counts: testCounts,
    accounting: 'Журнал учитывает прохождение один раз в каждом показателе. В срезе задания на 16 ноября 2026 года — 26 исследовательских прохождений. 12 технических проверок исключены. Для метрик сравнения и статей журнал проверяет, достаточно ли записанных событий для подсчёта',
    overview: [
      { value: ratio(testCounts.assembled, testCounts.started), label: 'Подобрали пять деталей', detail: 'Засчитывал прохождение, если хотя бы раз журнал зафиксировал полный состав из пяти деталей' },
      { value: ratio(testCounts.saved, testCounts.started), label: 'Сохранили полную сборку', comment: 'builds-saved', detail: 'Засчитывал нажатие «Сохранить» при наличии всех пяти деталей в сборке' },
      { value: '4 с', label: 'Медиана от открытия каталога до выбора', detail: 'Первый замер в прохождении — от открытия каталога до ручного добавления или замены детали в той же категории. Медиана по 24 замерам' },
    ],
    journalTitle: 'Что видно по журналу',
    groups: [
      {
        title: 'Сравнение',
        hypothesis: testHypotheses.comparison,
        metrics: [
          { value: ratio(comparisonResult.started, comparisonResult.withCatalog), label: 'Начали пользоваться сравнением', detail: 'Среди открывших каталог с полной записью засчитывал добавление товара в сравнение или открытие таблицы. Пустая таблица тоже учитывалась на этом шаге' },
          comparisonTableMetric,
          { value: '2 с', label: 'Медиана до первого действия со сравнением', detail: 'От открытия каталога до первого добавления товара в сравнение или открытия таблицы в том же посещении каталога. Медиана по 14 замерам' },
        ],
      },
      {
        title: 'Данные в статьях',
        hypothesis: testHypotheses.evidence,
        metrics: [
          { value: ratio(evidenceResult.viewed, evidenceResult.opened), label: 'Просмотрели целевые данные', comment: 'article-data-view', detail: 'Среди открывших статью с измеряемыми данными засчитывал прохождения, где результаты тестов, характеристики или другие размеченные сведения были видны пять секунд подряд' },
          evidenceSelectionMetric,
          { value: '22 с', label: 'Медиана от показа данных до выбора', detail: 'От начала подтверждённого пятисекундного показа до выбора после возврата. Паузы входят во время. Если связанных действий несколько, брал первый по времени выбор. Медиана по 7 замерам' },
        ],
      },
      {
        title: 'Рекомендованные статьи',
        hypothesis: testHypotheses.recommendation,
        metrics: [
          recommendationViewingMetric,
          recommendationSelectionMetric,
          { value: '28 с', label: 'Медиана от открытия рекомендации до выбора', detail: 'От подтверждённого открытия статьи из рекомендации до ручного выбора детали той же категории после возврата. Выбор только до просмотра в замер не входил. Медиана по 11 замерам' },
        ],
      },
    ],
    timing: 'Медиана — центральное значение после сортировки замеров по длительности. Если центральных значений два, журнал берёт среднее из них. Время показано с тем же округлением до секунд, что и в журнале',
    journalLimit: 'Журнал показывает порядок действий. Чтобы понять, что помогло определиться, нужно попросить участника объяснить свой выбор. Влияние на заказы в этом тесте я не измерял',
    journalSource: { href: 'https://nikomb.github.io/dns-prototype/journal/?task=task-3', label: 'Открыть журнал DNS' },
  },
  reflection: {
    title: 'Рефлексия',
    points: [
      {
        title: 'Спрятал режим за переключателем',
        problem: 'Для сравнения по наведению нужно было включить отдельный режим. Из пяти участников, которые сравнивали детали повторно, его никто не включил',
        next: 'Оставил таблицу и вынес кнопку к фильтрам. Дам одно и то же задание в исходном DNS и в прототипе и проверю, где люди находят сравнение сами',
      },
      {
        title: 'Не спросил, что помогло выбрать',
        problem: 'Журнал сохранил шаги до выбора детали. Чтобы понять, почему выбрали именно эту модель, нужно спросить участника',
        next: 'В тесте с модератором сразу после выбора спрошу, какое отличие между моделями заметили и помогла ли статья определиться',
      },
      {
        title: 'Остался вопрос о сохранении',
        problem: `В ${testCounts.assembled - testCounts.saved} прохождениях подобрали все пять деталей, а сохранение в журнале так и не появилось`,
        next: 'Разберу последние шаги этих прохождений и в следующем тесте спрошу, в какой момент участник считает задание законченным. Если пропускают кнопку сохранения, проверю подсказку после выбора последней детали',
      },
    ],
    nextIteration: 'После разбора причин остановок внесу правки, заранее задам критерии и повторю тест',
  },
  comparison: {
    title: 'Счётчик моделей для сравнения',
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
        comment: 'hover-mode-unused',
        detail: 'На тестах никто из тех, кто сравнивал детали повторно, не включил переключатель «Различия при наведении». Я оставил сравнение через таблицу',
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
        src: hoverToggleStates, width: 1600, height: 900, showFull: true, label: 'Переключатель «Различия при наведении»',
        alt: 'Сверху режим выключен. Снизу включён, в подписи указан AMD Ryzen 7 9800X3D',
        caption: 'При повторном входе в категорию режим можно было включить переключателем. В подписи было видно, с какой деталью из сборки сравниваются модели',
      },
    },
  },
  scenario: {
    title: 'Как это работает на примере процессора',
    intro: 'Покупатель нажимает «Добавить» в строке процессора. Над товарами в каталоге он открывает статью со сравнением Ryzen 5 5600X и Core i5‑12400. Затем возвращается в каталог, добавляет Ryzen 7 7800X3D в сборку и переходит к выбору материнской платы',
    video: {
      src: processorScenario,
      poster: processorScenarioPoster,
      title: 'Сценарий выбора процессора в конфигураторе DNS',
    },
  },
  quickChoice: {
    title: 'Быстрый выбор на экране сборки',
    intro: 'Стрелка рядом с кнопкой «Добавить» раскрывает ленту моделей с названиями и ценами. Деталь можно выбрать прямо в строке сборки. Кнопка «Добавить» открывает полный каталог',
    articlesIntro: 'Рядом со сборкой показываются статьи по уже выбранным деталям. Если подходящих статей нет, там появляются общие материалы по сборке ПК',
    frames: [
      {
        src: quickChoice, width: 1060, height: 886, showFull: true, label: 'Быстрый выбор процессора',
        alt: 'Строка «Процессор» в двух состояниях. Сверху она свёрнута, снизу открыта лента с моделями и ценами',
        caption: 'Сверху — свёрнутая строка. Снизу — лента с моделями, ценами и стрелкой прокрутки',
      },
      {
        src: buildRecommendedArticles, width: 700, height: 1534, showFull: true, label: 'Статьи на экране сборки',
        alt: 'Три карточки Клуба DNS на экране сборки о выборе видеокарты, материнской платы и блока питания',
        caption: 'Общие материалы о выборе видеокарты, материнской платы и блока питания',
      },
    ],
  },
};

export const dnsDecisions: readonly Decision[] = [
  {
    id: 'dns-comparison',
    title: 'Кнопка сравнения рядом с фильтрами',
    hypothesis: testHypotheses.comparison,
    hypothesisText: 'Если сравнение доступно при выборе или замене детали, пользователь заметит его без подсказки и сопоставит варианты внутри DNS.',
    contentsLabel: 'Сравнение',
    checkTitle: 'Открытие таблицы',
    checkMethod: 'Смотрел в журнале, кто сам открыл таблицу с двумя или больше товарами. Во время теста не подсказывал',
    metrics: [{ ...comparisonTableMetric, comment: 'comparison-opened' }],
    solution: 'Покупатель отмечает модели в карточках. Кнопка рядом с фильтрами показывает, сколько моделей отмечено, и открывает таблицу. В режиме «Только различия» остаются строки, в которых значения отличаются',
    solutionFigure: {
      src: compareTable, width: 1380, height: 1022,
      alt: 'Таблица сравнения Ryzen 7 7800X3D, 9800X3D и 9700X в режиме «Только различия»',
      caption: 'Перед выбором детали для сборки здесь можно сверить цены и отличия в характеристиках отмеченных моделей',
    },
    comparison: dnsCase.comparison,
  },
  {
    id: 'dns-return',
    title: 'Из статьи обратно к сборке',
    hypothesis: testHypotheses.evidence,
    hypothesisText: 'Если участник просмотрит в статье целевые данные о комплектующих (тесты, характеристики, совместимость), то после возврата в конфигуратор он выберет или заменит деталь той же категории.',
    contentsLabel: 'Возврат',
    checkTitle: 'Продолжение подбора',
    checkMethod: 'В журнале смотрел, кто выбрал деталь после просмотра данных и возврата. Почему выбрали эту модель, стоит спросить у участников',
    metrics: [evidenceSelectionMetric],
    solution: 'Если покупатель открывает статью из конфигуратора, над текстом видна панель с выбранными деталями и общей суммой. Кнопка «В конфигуратор» возвращает к той же сборке',
    comparison: {
      title: 'Панель сборки в статье',
      frames: [
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
  },
  {
    id: 'dns-articles',
    title: 'Обзоры по моделям из каталога',
    hypothesis: testHypotheses.recommendation,
    hypothesisText: 'Если при выборе или сравнении показать подходящие материалы Клуба, объясняющие различия и условия тестов, пользователю будет легче обосновать выбор между вариантами.',
    contentsLabel: 'Обзоры',
    checkTitle: 'Просмотр рекомендации',
    checkMethod: 'В журнале смотрел, кто просмотрел рекомендацию и выбрал деталь. Чтобы узнать, помогла ли статья, нужно спросить участника',
    metrics: [recommendationViewingMetric, recommendationSelectionMetric],
    observation: { comment: 'article-skipped', text: 'На одной из сессий участник открыл статью Клуба DNS из каталога корпусов, бегло посмотрел её и закрыл. Посреди подбора он не захотел читать длинный материал.' },
    solution: 'В прототипе над товарами я предложил показывать обзоры по моделям из текущего списка. Например, при выборе процессора можно открыть обзор с игровыми тестами интересующей модели прямо из каталога',
    comparison: {
      title: 'Рекомендации над списком товаров',
      frames: [
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
  },
];

export const dnsContents = [
  { id: 'projects-heading', label: 'Обзор', note: 'Кейс вкратце' },
  { id: 'dns-research', label: 'Анализ', note: 'Обсуждения и аудит' },
  { id: 'dns-interviews', label: 'Интервью', note: 'Ключевые результаты' },
  { id: 'dns-competitors', label: 'Конкуренты', note: 'Три подхода' },
  { id: 'dns-prioritization', label: 'Приоритеты', note: 'Отбор гипотез' },
  ...dnsDecisions.map(({ id, contentsLabel, hypothesis }) => ({ id, label: contentsLabel, note: `Гипотеза ${hypothesis}` })),
  { id: 'dns-scenario', label: 'Сценарий', note: 'Выбор детали' },
  { id: 'dns-results', label: 'UX-тест', note: 'Результаты и метрики' },
  { id: 'dns-reflection', label: dnsCase.reflection.title, note: 'Ошибки и правки' },
];

export const dnsMascotComments: Readonly<Record<string, string>> = {
  'intro': 'Сборку сохранили. Кто уже мысленно пробил чек?',
  'external-review': 'Сборку кинули в чат. С чего мы решили, что в DNS им было неудобно?',
  'moderator-hint': 'Кнопку нашли. Подсказку модератора тоже добавим в интерфейс?',
  'interview-quotes': 'Цифры есть. Что брать и куда жать? Угадай с трёх раз',
  'comparison-opened': 'Две модели в таблице. Ну и какую брать?',
  'hover-mode-unused': 'Ноль из пяти включили. Удобный был режим? Вот и я не знаю',
  'article-skipped': 'Я за FPS в своей игре. До графика сколько листать?',
  'return-caption': 'Я вернулся. Тот самый процессор теперь искать заново?',
  'ryzen-review': 'А если среди статей нет обзора на мою модель?',
  'builds-saved': `${testCounts.saved} из ${testCounts.started} сохранили сборку. А сколько сохранили бы в обычном DNS?`,
  'article-data-view': 'Открыл график и ушёл за чаем. Через пять секунд я уже «посмотрел данные»',
};
