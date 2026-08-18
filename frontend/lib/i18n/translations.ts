export type SupportedLanguage = "uk" | "en" | "pl" | "es";
export type FontSizeOption = "compact" | "default" | "large";

export interface TranslationDictionary {
  common: {
    save: string;
    saving: string;
    saved: string;
    cancel: string;
    delete: string;
    confirm: string;
    actions: string;
    status: string;
    search: string;
    loading: string;
    error: string;
    success: string;
    type: string;
    date: string;
    view: string;
    close: string;
  };
  nav: {
    chat: string;
    knowledgeBase: string;
    analytics: string;
    settings: string;
    logout: string;
    feedback: string;
  };
  settings: {
    title: string;
    subtitle: string;
    aiEngine: string;
    groqApiKey: string;
    groqPlaceholder: string;
    trialQuota: string;
    trialRemaining: string;
    vectorDb: string;
    builtInVector: string;
    vectorOnline: string;
    qdrantUrl: string;
    qdrantApiKey: string;
    preferences: string;
    language: string;
    languageDesc: string;
    fontSize: string;
    fontSizeDesc: string;
    fontCompact: string;
    fontDefault: string;
    fontLarge: string;
  };
  feedback: {
    modalTitle: string;
    modalSubtitle: string;
    tabIdea: string;
    tabBug: string;
    ideaPlaceholder: string;
    bugPlaceholder: string;
    submit: string;
    submitting: string;
    valueNotice: string;
    successToast: string;
  };
  analytics: {
    title: string;
    overview: string;
    totalQueries: string;
    activeUsers: string;
    indexedDocs: string;
    totalVectors: string;
    serverUptime: string;
    userManagement: string;
    userApprovals: string;
    approve: string;
    approved: string;
    suspend: string;
    activate: string;
    feedbackBoard: string;
    noFeedback: string;
    markResolved: string;
    markInProgress: string;
  };
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  uk: {
    common: {
      save: "Зберегти",
      saving: "Збереження...",
      saved: "Збережено",
      cancel: "Скасувати",
      delete: "Видалити",
      confirm: "Підтвердити",
      actions: "Дії",
      status: "Статус",
      search: "Пошук...",
      loading: "Завантаження...",
      error: "Помилка",
      success: "Успішно",
      type: "Тип",
      date: "Дата",
      view: "Переглянути",
      close: "Закрити",
    },
    nav: {
      chat: "Чат",
      knowledgeBase: "База знань",
      analytics: "Аналітика",
      settings: "Налаштування",
      logout: "Вийти",
      feedback: "Зворотний зв'язок",
    },
    settings: {
      title: "Системні налаштування",
      subtitle: "Керування параметрами системи, мовою інтерфейсу та API ключами.",
      aiEngine: "Штучний інтелект (Groq API)",
      groqApiKey: "Персональний Groq API Ключ",
      groqPlaceholder: "gsk_...",
      trialQuota: "Пробні запити",
      trialRemaining: "залишилось",
      vectorDb: "Векторна база даних",
      builtInVector: "Вбудований рушій Qdrant",
      vectorOnline: "Активний",
      qdrantUrl: "Qdrant Cloud URL (опціонально)",
      qdrantApiKey: "Qdrant API Key (опціонально)",
      preferences: "Персоналізація інтерфейсу",
      language: "Мова інтерфейсу",
      languageDesc: "Оберіть основну мову для панелі керування та меню.",
      fontSize: "Масштаб шрифту",
      fontSizeDesc: "Налаштування щільності тексту та розміру шрифту.",
      fontCompact: "Компактний (13px)",
      fontDefault: "Стандартний (14px)",
      fontLarge: "Збільшений (15px)",
    },
    feedback: {
      modalTitle: "Зворотний зв'язок та ідеї",
      modalSubtitle: "Допоможіть зробити Vectrieve досконалішим. Ми читаємо кожне повідомлення.",
      tabIdea: "Ідея чи пропозиція",
      tabBug: "Повідомити про баг",
      ideaPlaceholder: "Опишіть, якої функції вам не вистачає або що можна покращити...",
      bugPlaceholder: "Опишіть, що пішло не так і як це відтворити...",
      submit: "Надіслати відгук",
      submitting: "Надсилання...",
      valueNotice: "Прямий канал зв'язку з інженерною командою. Активні автори отримують пріоритетні ліміти.",
      successToast: "Дякуємо! Ваш відгук успішно передано команді розробки.",
    },
    analytics: {
      title: "Аналітика та моніторинг",
      overview: "Загальні показники системи",
      totalQueries: "Всього запитів",
      activeUsers: "Активні користувачі",
      indexedDocs: "Індексовані документи",
      totalVectors: "Векторні ембеддінги",
      serverUptime: "Аптайм сервера",
      userManagement: "Керування користувачами та реєстраціями",
      userApprovals: "Запити на реєстрацію",
      approve: "Схвалити",
      approved: "Підтверджено",
      suspend: "Призупинити",
      activate: "Активувати",
      feedbackBoard: "Дошка відгуків та баг-репортів",
      noFeedback: "Відгуків поки що немає.",
      markResolved: "Вирішено",
      markInProgress: "В роботі",
    },
  },
  en: {
    common: {
      save: "Save",
      saving: "Saving...",
      saved: "Saved",
      cancel: "Cancel",
      delete: "Delete",
      confirm: "Confirm",
      actions: "Actions",
      status: "Status",
      search: "Search...",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      type: "Type",
      date: "Date",
      view: "View",
      close: "Close",
    },
    nav: {
      chat: "Chat",
      knowledgeBase: "Knowledge Base",
      analytics: "Analytics",
      settings: "Settings",
      logout: "Log out",
      feedback: "Feedback & Ideas",
    },
    settings: {
      title: "System Settings",
      subtitle: "Configure AI credentials, interface preferences, and system behavior.",
      aiEngine: "AI Engine (Groq API)",
      groqApiKey: "Personal Groq API Key",
      groqPlaceholder: "gsk_...",
      trialQuota: "Trial Queries",
      trialRemaining: "remaining",
      vectorDb: "Vector Database",
      builtInVector: "Built-in Qdrant Engine",
      vectorOnline: "Online",
      qdrantUrl: "Qdrant Cloud URL (optional)",
      qdrantApiKey: "Qdrant API Key (optional)",
      preferences: "Interface Preferences",
      language: "Display Language",
      languageDesc: "Choose your primary language for the dashboard.",
      fontSize: "Typography Scale",
      fontSizeDesc: "Adjust text density and font size.",
      fontCompact: "Compact (13px)",
      fontDefault: "Default (14px)",
      fontLarge: "Large (15px)",
    },
    feedback: {
      modalTitle: "Feedback & Suggestions",
      modalSubtitle: "Help shape the future of Vectrieve. Every message is reviewed.",
      tabIdea: "Feature Suggestion",
      tabBug: "Report a Bug",
      ideaPlaceholder: "Describe the feature or improvement you would like to see...",
      bugPlaceholder: "Describe what went wrong and how to reproduce it...",
      submit: "Submit Feedback",
      submitting: "Sending...",
      valueNotice: "Direct connection to the engineering team. Active contributors receive priority limits.",
      successToast: "Thank you! Your feedback has been sent directly to the team.",
    },
    analytics: {
      title: "System Analytics & Health",
      overview: "System Performance Overview",
      totalQueries: "Total Queries",
      activeUsers: "Active Users",
      indexedDocs: "Indexed Documents",
      totalVectors: "Vector Embeddings",
      serverUptime: "Server Uptime",
      userManagement: "User Management & Onboarding",
      userApprovals: "Registration Requests",
      approve: "Approve",
      approved: "Approved",
      suspend: "Suspend",
      activate: "Activate",
      feedbackBoard: "User Feedback & Bug Reports Board",
      noFeedback: "No feedback entries recorded yet.",
      markResolved: "Resolved",
      markInProgress: "In Progress",
    },
  },
  pl: {
    common: {
      save: "Zapisz",
      saving: "Zapisywanie...",
      saved: "Zapisano",
      cancel: "Anuluj",
      delete: "Usuń",
      confirm: "Potwierdź",
      actions: "Akcje",
      status: "Status",
      search: "Szukaj...",
      loading: "Ładowanie...",
      error: "Błąd",
      success: "Sukces",
      type: "Typ",
      date: "Data",
      view: "Pokaż",
      close: "Zamknij",
    },
    nav: {
      chat: "Czat",
      knowledgeBase: "Baza wiedzy",
      analytics: "Analityka",
      settings: "Ustawienia",
      logout: "Wyloguj",
      feedback: "Opinie i pomysły",
    },
    settings: {
      title: "Ustawienia systemowe",
      subtitle: "Zarządzaj kluczami AI, preferencjami interfejsu i parametrami bazy.",
      aiEngine: "Silnik AI (Groq API)",
      groqApiKey: "Osobisty klucz Groq API",
      groqPlaceholder: "gsk_...",
      trialQuota: "Zapytania próbne",
      trialRemaining: "pozostało",
      vectorDb: "Wektorowa baza danych",
      builtInVector: "Wbudowany silnik Qdrant",
      vectorOnline: "Aktywny",
      qdrantUrl: "Qdrant Cloud URL (opcjonalnie)",
      qdrantApiKey: "Qdrant API Key (opcjonalnie)",
      preferences: "Preferencje interfejsu",
      language: "Język interfejsu",
      languageDesc: "Wybierz główny język panelu nawigacyjnego.",
      fontSize: "Rozmiar czcionki",
      fontSizeDesc: "Dostosuj gęstość tekstu i wielkość liter.",
      fontCompact: "Kompaktowy (13px)",
      fontDefault: "Domyślny (14px)",
      fontLarge: "Powiększony (15px)",
    },
    feedback: {
      modalTitle: "Opinie i propozycje",
      modalSubtitle: "Pomóż rozwijać Vectrieve. Wszystkie zgłoszenia trafiają bezpośrednio do autorów.",
      tabIdea: "Pomysł / Usprawnienie",
      tabBug: "Zgłoś błąd",
      ideaPlaceholder: "Opisz funkcję, której brakuje lub co można ulepszyć...",
      bugPlaceholder: "Opisz napotkany problem i kroki do jego odtworzenia...",
      submit: "Wyślij zgłoszenie",
      submitting: "Wysyłanie...",
      valueNotice: "Bezpośredni kontakt z inżynierami. Aktywni użytkownicy otrzymują wyższe limity.",
      successToast: "Dziękujemy! Zgłoszenie zostało pomyślnie przekazane zespołowi.",
    },
    analytics: {
      title: "Analityka i stan systemu",
      overview: "Przegląd wydajności",
      totalQueries: "Łączna liczba zapytań",
      activeUsers: "Aktywni użytkownicy",
      indexedDocs: "Zindeksowane dokumenty",
      totalVectors: "Wektory Qdrant",
      serverUptime: "Czas pracy serwera",
      userManagement: "Zarządzanie użytkownikami",
      userApprovals: "Wnioski o rejestrację",
      approve: "Zatwierdź",
      approved: "Zatwierdzony",
      suspend: "Zawieś",
      activate: "Aktywuj",
      feedbackBoard: "Tablica zgłoszeń i opinii użytkowników",
      noFeedback: "Brak zgłoszeń w bazie.",
      markResolved: "Rozwiązany",
      markInProgress: "W trakcie",
    },
  },
  es: {
    common: {
      save: "Guardar",
      saving: "Guardando...",
      saved: "Guardado",
      cancel: "Cancelar",
      delete: "Eliminar",
      confirm: "Confirmar",
      actions: "Acciones",
      status: "Estado",
      search: "Buscar...",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
      type: "Tipo",
      date: "Fecha",
      view: "Ver",
      close: "Cerrar",
    },
    nav: {
      chat: "Chat",
      knowledgeBase: "Base de conocimientos",
      analytics: "Analítica",
      settings: "Configuración",
      logout: "Cerrar sesión",
      feedback: "Comentarios e ideas",
    },
    settings: {
      title: "Configuración del sistema",
      subtitle: "Gestione las credenciales de IA, preferencias de visualización y bases vectoriales.",
      aiEngine: "Motor de IA (Groq API)",
      groqApiKey: "Clave API de Groq personal",
      groqPlaceholder: "gsk_...",
      trialQuota: "Consultas de prueba",
      trialRemaining: "restantes",
      vectorDb: "Base de datos vectorial",
      builtInVector: "Motor Qdrant integrado",
      vectorOnline: "En línea",
      qdrantUrl: "URL de Qdrant Cloud (opcional)",
      qdrantApiKey: "Clave API de Qdrant (opcional)",
      preferences: "Preferencias de interfaz",
      language: "Idioma de la interfaz",
      languageDesc: "Seleccione el idioma principal para el panel.",
      fontSize: "Escala de tipografía",
      fontSizeDesc: "Ajuste la densidad del texto y el tamaño de la fuente.",
      fontCompact: "Compacto (13px)",
      fontDefault: "Predeterminado (14px)",
      fontLarge: "Grande (15px)",
    },
    feedback: {
      modalTitle: "Comentarios y sugerencias",
      modalSubtitle: "Ayúdenos a mejorar Vectrieve. Revisamos cada mensaje.",
      tabIdea: "Sugerencia de función",
      tabBug: "Reportar un error",
      ideaPlaceholder: "Describa la función o mejora que le gustaría ver...",
      bugPlaceholder: "Describa el error y cómo reproducirlo...",
      submit: "Enviar comentarios",
      submitting: "Enviando...",
      valueNotice: "Canal directo con los desarrolladores. Los usuarios activos reciben límites ampliados.",
      successToast: "¡Gracias! Sus comentarios han sido enviados al equipo.",
    },
    analytics: {
      title: "Analítica y salud del sistema",
      overview: "Rendimiento general",
      totalQueries: "Consultas totales",
      activeUsers: "Usuarios activos",
      indexedDocs: "Documentos indexados",
      totalVectors: "Vectores Qdrant",
      serverUptime: "Tiempo de actividad",
      userManagement: "Gestión y aprobación de usuarios",
      userApprovals: "Solicitudes de registro",
      approve: "Aprobar",
      approved: "Aprobado",
      suspend: "Suspender",
      activate: "Activar",
      feedbackBoard: "Panel de comentarios y reportes de errores",
      noFeedback: "Aún no se han recibido comentarios.",
      markResolved: "Resuelto",
      markInProgress: "En progreso",
    },
  },
};
