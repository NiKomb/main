export const site = {
  title: 'Проекты',
  profile: {
    name: 'Николай Комбин',
    practice: 'Продуктовый дизайнер. Проектирую интерфейсы с опорой на исследования и данные о поведении, чтобы людям было проще сделать выбор и выполнить задачу',
    experience: 'В самостоятельных проектах прорабатывал пользовательские сценарии и состояния интерфейса, собирал интерактивные прототипы в Codex и дорабатывал решения после тестов',
    socialLinks: [
      { id: 'telegram', label: 'Telegram', href: 'https://t.me/nikomb' },
      { id: 'email', label: 'Почта', href: null },
      { id: 'cv', label: 'Резюме', href: `${import.meta.env.BASE_URL}cv.pdf` },
    ] as const,
  },
};
