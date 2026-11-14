/** Проект контракта. Сбор и отправка пока не включены. */
export type EventPayloads = {
  page_view: { referrerOrigin?: string; device?: 'mobile' | 'tablet' | 'desktop' | 'unknown' };
  click: { targetId: string };
  scroll_depth: { percent: 25 | 50 | 75 | 100 };
  section_view: { sectionId: string };
  section_time: { sectionId: string; deltaMs: number };
  page_time: { deltaMs: number };
};

export type AnalyticsEvent = {
  [Name in keyof EventPayloads]: {
    schemaVersion: 1;
    eventId: string;
    siteId: string;
    sessionId: string;
    pageViewId: string;
    pagePath: string;
    occurredAt: string;
    name: Name;
    properties: EventPayloads[Name];
  }
}[keyof EventPayloads];
