export type SupportedLanguage = "en" | "uk" | "pl" | "es";
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
    copy: string;
    copied: string;
    retry: string;
    edit: string;
  };
  nav: {
    chat: string;
    knowledgeBase: string;
    analytics: string;
    settings: string;
    logout: string;
    feedback: string;
    platformOps: string;
    recentChats: string;
    newChat: string;
    deleteChatTitle: string;
    createSpace: string;
    spaceSettings: string;
    spaceMembers: string;
    allSpaces: string;
    personalSpace: string;
  };
  header: {
    cloudEnterprise: string;
    personaMentor: string;
    personaAuditor: string;
    personaArchitect: string;
    personaSelect: string;
  };
  chat: {
    inputPlaceholder: string;
    send: string;
    stop: string;
    attachFile: string;
    dropFilesHere: string;
    emptyTitle: string;
    emptySubtitle: string;
    sourcesCited: string;
    sourcesCount: string;
    copyReply: string;
    playAudio: string;
    stopAudio: string;
    audioBriefing: string;
    audioGenerating: string;
    exportMarkdown: string;
    exportPdf: string;
    trialExhaustedTitle: string;
    trialExhaustedDesc: string;
    setupApiKeyTitle: string;
    goToSettings: string;
  };
  files: {
    title: string;
    subtitle: string;
    uploadAreaTitle: string;
    uploadAreaDesc: string;
    supportedFormats: string;
    colName: string;
    colType: string;
    colSize: string;
    colStatus: string;
    colChunks: string;
    colActions: string;
    statusReady: string;
    statusProcessing: string;
    statusFailed: string;
    reindex: string;
    deleteModalTitle: string;
    deleteModalDesc: string;
    noFilesFound: string;
    searchPlaceholder: string;
  };
  spaces: {
    createTitle: string;
    namePlaceholder: string;
    promptTitle: string;
    promptPlaceholder: string;
    promptTip: string;
    membersTitle: string;
    addMember: string;
    emailPlaceholder: string;
    roleOwner: string;
    roleEditor: string;
    roleViewer: string;
  };
  settings: {
    title: string;
    subtitle: string;
    aiEngine: string;
    groqApiKey: string;
    groqPlaceholder: string;
    trialQuota: string;
    trialRemaining: string;
    personalKeyActive: string;
    personalKeyActiveDesc: string;
    groqTierInfo: string;
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
    cloudBannerTitle: string;
    cloudBannerDesc: string;
    setupGuideTitle: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
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
    totalLatency: string;
    tokenSpeed: string;
    dbPool: string;
    serverUptime: string;
    dailyUsageTrend: string;
    dailyUsageDesc: string;
    queriesLegend: string;
    docsLegend: string;
    ragLatencyBreakdown: string;
    denseSearch: string;
    sparseSearch: string;
    reranker: string;
    llmInference: string;
    dbPoolTitle: string;
    activeConnections: string;
    idleConnections: string;
    poolSizeLimit: string;
    poolOverflow: string;
    llmThroughput: string;
    avgGenSpeed: string;
    totalTokensGen: string;
    userManagement: string;
    userManagementDesc: string;
    totalRegistered: string;
    pendingApproval: string;
    colEmail: string;
    colRole: string;
    colApproval: string;
    colState: string;
    colIndexedDocs: string;
    colActions: string;
    roleAdmin: string;
    roleUser: string;
    approved: string;
    pending: string;
    active: string;
    suspended: string;
    approve: string;
    suspend: string;
    activate: string;
    feedbackBoard: string;
    feedbackBoardDesc: string;
    noFeedback: string;
    statusResolved: string;
    statusInProgress: string;
    statusNew: string;
    markResolved: string;
    markInProgress: string;
  };
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
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
      copy: "Copy",
      copied: "Copied!",
      retry: "Retry",
      edit: "Edit",
    },
    nav: {
      chat: "Chat",
      knowledgeBase: "Knowledge Base",
      analytics: "Admin",
      settings: "Settings",
      logout: "Log out",
      feedback: "Feedback & Ideas",
      platformOps: "Platform Operations",
      recentChats: "Recent Chats",
      newChat: "New Chat",
      deleteChatTitle: "Delete Chat?",
      createSpace: "Create New Space",
      spaceSettings: "Space Settings",
      spaceMembers: "Members & Access",
      allSpaces: "Workspaces",
      personalSpace: "Personal Workspace",
    },
    header: {
      cloudEnterprise: "Cloud Enterprise",
      personaMentor: "Mentor Mode",
      personaAuditor: "Auditor Mode",
      personaArchitect: "Architect Mode",
      personaSelect: "Persona",
    },
    chat: {
      inputPlaceholder: "Ask anything about your documents, transcripts, and data...",
      send: "Send",
      stop: "Stop generation",
      attachFile: "Attach file",
      dropFilesHere: "Drop files to attach to this prompt",
      emptyTitle: "Private AI Knowledge Assistant",
      emptySubtitle: "Ask questions, synthesize documents, and verify facts with exact source citations.",
      sourcesCited: "Sources Cited",
      sourcesCount: "source documents referenced",
      copyReply: "Copy response",
      playAudio: "Play Audio Brief",
      stopAudio: "Stop Audio",
      audioBriefing: "Audio Briefing",
      audioGenerating: "Synthesizing voice briefing...",
      exportMarkdown: "Export as Markdown",
      exportPdf: "Export as PDF",
      trialExhaustedTitle: "Free Trial Complete",
      trialExhaustedDesc: "You have used all 20 free trial queries. To continue using Vectrieve, add your personal Groq API key.",
      setupApiKeyTitle: "How to get your free key (30 seconds)",
      goToSettings: "Go to Settings",
    },
    files: {
      title: "Knowledge Base Documents",
      subtitle: "Upload and manage PDF, Word, text, audio recordings, and video files for hybrid RAG search.",
      uploadAreaTitle: "Upload Documents & Media Files",
      uploadAreaDesc: "Drag & drop files here or click to browse",
      supportedFormats: "Supported: PDF, DOCX, TXT, MD, MP3, WAV, M4A, FLAC, MP4, MOV, MKV, WEBM (up to 100MB)",
      colName: "File Name",
      colType: "Type",
      colSize: "Size",
      colStatus: "Indexing Status",
      colChunks: "Semantic Chunks",
      colActions: "Actions",
      statusReady: "Indexed & Ready",
      statusProcessing: "Processing...",
      statusFailed: "Failed",
      reindex: "Re-index",
      deleteModalTitle: "Delete Document?",
      deleteModalDesc: "This will permanently remove the document and its vector embeddings from Qdrant and storage.",
      noFilesFound: "No documents uploaded yet. Upload your first document above to start indexing.",
      searchPlaceholder: "Search uploaded documents by name...",
    },
    spaces: {
      createTitle: "Create Knowledge Space",
      namePlaceholder: "e.g. Legal Documents, Customer Support, Engineering...",
      promptTitle: "Space System Prompt & Reasoning Guidelines",
      promptPlaceholder: "Define how the AI should reason, analyze policies, and draft replies...",
      promptTip: "Tip: You can instruct the AI to provide a 2-tier briefing (Manager summary + Ready-to-copy client reply).",
      membersTitle: "Workspace Members & Access Control",
      addMember: "Add Member",
      emailPlaceholder: "user@company.com",
      roleOwner: "Owner",
      roleEditor: "Editor",
      roleViewer: "Viewer",
    },
    settings: {
      title: "System Settings",
      subtitle: "Configure AI credentials, interface preferences, and vector database routing.",
      aiEngine: "AI Engine (Groq Cloud API)",
      groqApiKey: "Personal Groq API Key",
      groqPlaceholder: "gsk_...",
      trialQuota: "Trial Queries",
      trialRemaining: "remaining",
      personalKeyActive: "Personal API Key Connected",
      personalKeyActiveDesc: "Direct high-speed connection active. Trial limits bypassed.",
      groqTierInfo: "Groq Cloud provides up to 30 RPM / 7,000 TPM / 14,400 RPD for free on GPT-OSS 120B",
      vectorDb: "Vector Database",
      builtInVector: "Built-in Qdrant Engine",
      vectorOnline: "Online",
      qdrantUrl: "Qdrant Cloud URL (optional override)",
      qdrantApiKey: "Qdrant API Key (optional)",
      preferences: "Interface Preferences",
      language: "Display Language",
      languageDesc: "Choose your primary language for the dashboard and operations.",
      fontSize: "Typography Scale & Density",
      fontSizeDesc: "Adjust text density and font size for optimal reading comfort.",
      fontCompact: "Compact (13px)",
      fontDefault: "Default (14px)",
      fontLarge: "Large (15px)",
      cloudBannerTitle: "Cloud Enterprise Mode",
      cloudBannerDesc: "This server runs exclusively on high-performance cloud inference. AI responses are delivered with sub-second latency and zero server CPU load.",
      setupGuideTitle: "Setup Guide (30 sec)",
      step1: "1. Open console.groq.com",
      step2: "2. Sign up for free (no credit card required)",
      step3: "3. Go to API Keys → Create API Key",
      step4: '4. Paste your key above and click "Save"',
    },
    feedback: {
      modalTitle: "Feedback & Suggestions",
      modalSubtitle: "Help shape the future of Vectrieve. Every message is reviewed by our engineering team.",
      tabIdea: "Feature Suggestion",
      tabBug: "Report a Bug",
      ideaPlaceholder: "Describe the feature or improvement you would like to see...",
      bugPlaceholder: "Describe what went wrong and how to reproduce it...",
      submit: "Submit Feedback",
      submitting: "Sending...",
      valueNotice: "Direct channel to core engineers. Active contributors receive expanded workspace limits.",
      successToast: "Thank you! Your feedback has been sent directly to the engineering team.",
    },
    analytics: {
      title: "System Analytics & Monitoring",
      overview: "System Performance Overview",
      totalQueries: "Total Queries",
      activeUsers: "Active Users",
      indexedDocs: "Indexed Documents",
      totalVectors: "Vector Embeddings",
      totalLatency: "Total Latency",
      tokenSpeed: "Token Speed",
      dbPool: "Database Pool",
      serverUptime: "Server Uptime",
      dailyUsageTrend: "Daily Usage Trend",
      dailyUsageDesc: "Queries and indexed documents per day",
      queriesLegend: "Queries",
      docsLegend: "Docs",
      ragLatencyBreakdown: "RAG Pipeline Latency Breakdown",
      denseSearch: "Dense Embedding (FastEmbed BGE)",
      sparseSearch: "Sparse Vector (BM25 / SPLADE)",
      reranker: "Cross-Encoder Reranker",
      llmInference: "Groq Cloud LLM Inference",
      dbPoolTitle: "Database Connection Pool",
      activeConnections: "Active connections",
      idleConnections: "Idle connections",
      poolSizeLimit: "Pool size limit",
      poolOverflow: "Overflow",
      llmThroughput: "LLM Throughput",
      avgGenSpeed: "Avg Generation Speed",
      totalTokensGen: "Total Tokens Generated",
      userManagement: "User Access Control & Approvals",
      userManagementDesc: "Review and approve registered accounts before they gain workspace access.",
      totalRegistered: "Total Registered",
      pendingApproval: "Pending Approval",
      colEmail: "User Email",
      colRole: "Role",
      colApproval: "Approval Status",
      colState: "Account State",
      colIndexedDocs: "Indexed Docs",
      colActions: "Actions",
      roleAdmin: "Admin",
      roleUser: "User",
      approved: "Approved",
      pending: "Pending Approval",
      active: "Active",
      suspended: "Suspended",
      approve: "Approve",
      suspend: "Suspend",
      activate: "Activate",
      feedbackBoard: "User Feedback & Bug Reports Board",
      feedbackBoardDesc: "User-submitted feature suggestions, optimization ideas, and bug reports.",
      noFeedback: "No feedback entries recorded yet.",
      statusResolved: "Resolved",
      statusInProgress: "In Progress",
      statusNew: "New",
      markResolved: "Resolved",
      markInProgress: "In Progress",
    },
  },
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
      copy: "Копіювати",
      copied: "Скопійовано!",
      retry: "Повторити",
      edit: "Редагувати",
    },
    nav: {
      chat: "Чат",
      knowledgeBase: "База знань",
      analytics: "Адмін",
      settings: "Налаштування",
      logout: "Вийти",
      feedback: "Зворотний зв'язок",
      platformOps: "Операції платформи",
      recentChats: "Останні чати",
      newChat: "Новий чат",
      deleteChatTitle: "Видалити чат?",
      createSpace: "Створити новий простір",
      spaceSettings: "Налаштування простору",
      spaceMembers: "Учасники та доступ",
      allSpaces: "Робочі простори",
      personalSpace: "Особистий простір",
    },
    header: {
      cloudEnterprise: "Хмарний Enterprise",
      personaMentor: "Режим ментора",
      personaAuditor: "Режим аудитора",
      personaArchitect: "Режим архітектора",
      personaSelect: "Роль ШІ",
    },
    chat: {
      inputPlaceholder: "Задайте будь-яке питання по документах, стенограмах чи базі знань...",
      send: "Надіслати",
      stop: "Зупинити генерацію",
      attachFile: "Прикріпити файл",
      dropFilesHere: "Перетягніть файли, щоб прикріпити до повідомлення",
      emptyTitle: "Приватний ШІ-асистент бази знань",
      emptySubtitle: "Ставте запитання, аналізуйте документи та отримуйте точні відповіді з першоджерелами.",
      sourcesCited: "Використані першоджерела",
      sourcesCount: "документів використано для відповіді",
      copyReply: "Скопіювати відповідь",
      playAudio: "Озвучити аудіо-бриф",
      stopAudio: "Зупинити аудіо",
      audioBriefing: "Аудіо-бриф",
      audioGenerating: "Генерація голосового брифу...",
      exportMarkdown: "Експорт у Markdown",
      exportPdf: "Експорт у PDF",
      trialExhaustedTitle: "Пробний період вичерпано",
      trialExhaustedDesc: "Ви використали 20 безкоштовних запитів. Щоб продовжити, додайте власний Groq API ключ.",
      setupApiKeyTitle: "Як отримати безкоштовний ключ (30 секунд)",
      goToSettings: "Перейти в налаштування",
    },
    files: {
      title: "Документи бази знань",
      subtitle: "Завантажуйте та керуйте файлами PDF, Word, текстовими записами, аудіо та відео для пошуку RAG.",
      uploadAreaTitle: "Завантаження документів та медіа-файлів",
      uploadAreaDesc: "Перетягніть файли сюди або натисніть для вибору",
      supportedFormats: "Формати: PDF, DOCX, TXT, MD, MP3, WAV, M4A, FLAC, MP4, MOV, MKV, WEBM (до 100MB)",
      colName: "Назва файлу",
      colType: "Тип",
      colSize: "Розмір",
      colStatus: "Статус індексації",
      colChunks: "Семантичні чанки",
      colActions: "Дії",
      statusReady: "Проіндексовано",
      statusProcessing: "Обробка...",
      statusFailed: "Помилка",
      reindex: "Переіндексувати",
      deleteModalTitle: "Видалити документ?",
      deleteModalDesc: "Це назавжди видалить документ та його векторні ембеддінги з Qdrant і бази даних.",
      noFilesFound: "Документів ще немає. Завантажте перший файл вище, щоб розпочати індексацію.",
      searchPlaceholder: "Пошук документів за назвою...",
    },
    spaces: {
      createTitle: "Створити простір знань",
      namePlaceholder: "наприклад: Юридичні договори, Підтримка клієнтів...",
      promptTitle: "Системний промпт та правила аналізу простору",
      promptPlaceholder: "Опишіть, як ШІ повинен міркувати, аналізувати правила та складати відповіді...",
      promptTip: "Порада: Можна налаштувати дворівневу відповідь (бриф для керівника + готове повідомлення для клієнта).",
      membersTitle: "Учасники простору та права доступу",
      addMember: "Додати учасника",
      emailPlaceholder: "user@company.com",
      roleOwner: "Власник",
      roleEditor: "Редактор",
      roleViewer: "Гість",
    },
    settings: {
      title: "Системні налаштування",
      subtitle: "Керування параметрами системи, мовою інтерфейсу та API ключами.",
      aiEngine: "Штучний інтелект (Groq Cloud API)",
      groqApiKey: "Персональний Groq API Ключ",
      groqPlaceholder: "gsk_...",
      trialQuota: "Пробні запити",
      trialRemaining: "залишилось",
      personalKeyActive: "Підключено персональний API-ключ",
      personalKeyActiveDesc: "Пряме підключення активне. Пробні ліміти знято.",
      groqTierInfo: "Groq Cloud безкоштовно надає до 30 RPM / 7,000 TPM / 14,400 RPD для GPT-OSS 120B",
      vectorDb: "Векторна база даних",
      builtInVector: "Вбудований рушій Qdrant",
      vectorOnline: "Активний",
      qdrantUrl: "Qdrant Cloud URL (опціонально)",
      qdrantApiKey: "Qdrant API Key (опціонально)",
      preferences: "Персоналізація інтерфейсу",
      language: "Мова інтерфейсу",
      languageDesc: "Оберіть основну мову для панелі керування та меню.",
      fontSize: "Масштаб шрифту",
      fontSizeDesc: "Налаштування щільності тексту та розміру шрифту для зручності читання.",
      fontCompact: "Компактний (13px)",
      fontDefault: "Стандартний (14px)",
      fontLarge: "Збільшений (15px)",
      cloudBannerTitle: "Хмарний корпоративний режим",
      cloudBannerDesc: "Сервер працює виключно на швидкісній хмарній моделі. Відповіді генеруються за частки секунди без навантаження на процесор сервера.",
      setupGuideTitle: "Інструкція підключення (30 сек)",
      step1: "1. Відкрийте console.groq.com",
      step2: "2. Зареєструйтесь безкоштовно (картка не потрібна)",
      step3: "3. Перейдіть у API Keys → Create API Key",
      step4: '4. Вставте ключ вище та натисніть "Зберегти"',
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
      valueNotice: "Прямий канал зв'язку з інженерною командою. Активні автори отримують розширені ліміти.",
      successToast: "Дякуємо! Ваш відгук успішно передано команді розробки.",
    },
    analytics: {
      title: "Аналітика та моніторинг",
      overview: "Загальні показники системи",
      totalQueries: "Всього запитів",
      activeUsers: "Активні користувачі",
      indexedDocs: "Індексовані документи",
      totalVectors: "Векторні ембеддінги",
      totalLatency: "Загальна затримка",
      tokenSpeed: "Швидкість токенів",
      dbPool: "Пул бази даних",
      serverUptime: "Аптайм сервера",
      dailyUsageTrend: "Динаміка використання",
      dailyUsageDesc: "Кількість запитів та проіндексованих документів по днях",
      queriesLegend: "Запити",
      docsLegend: "Документи",
      ragLatencyBreakdown: "Розподіл затримки пайплайну RAG",
      denseSearch: "Dense пошук (FastEmbed BGE)",
      sparseSearch: "Sparse пошук (BM25 / SPLADE)",
      reranker: "Крос-енкодер Reranker",
      llmInference: "Генерація відповіді LLM (Groq)",
      dbPoolTitle: "Пул з'єднань з базою даних",
      activeConnections: "Активні з'єднання",
      idleConnections: "Вільні з'єднання",
      poolSizeLimit: "Ліміт пулу",
      poolOverflow: "Переповнення",
      llmThroughput: "Продуктивність LLM",
      avgGenSpeed: "Сер. швидкість генерації",
      totalTokensGen: "Всього згенеровано токенів",
      userManagement: "Керування користувачами та реєстраціями",
      userManagementDesc: "Перевірка та підтвердження зареєстрованих акаунтів перед наданням доступу.",
      totalRegistered: "Всього зареєстровано",
      pendingApproval: "Очікують схвалення",
      colEmail: "Пошта користувача",
      colRole: "Роль",
      colApproval: "Статус схвалення",
      colState: "Стан акаунту",
      colIndexedDocs: "Документів",
      colActions: "Дії",
      roleAdmin: "Адмін",
      roleUser: "Користувач",
      approved: "Підтверджено",
      pending: "Очікує схвалення",
      active: "Активний",
      suspended: "Призупинений",
      approve: "Схвалити",
      suspend: "Призупинити",
      activate: "Активувати",
      feedbackBoard: "Дошка відгуків та баг-репортів",
      feedbackBoardDesc: "Пропозиції функцій, ідеї покращення та звіти про помилки від користувачів.",
      noFeedback: "Відгуків поки що немає.",
      statusResolved: "Вирішено",
      statusInProgress: "В роботі",
      statusNew: "Новий",
      markResolved: "Вирішено",
      markInProgress: "В роботі",
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
      copy: "Kopiuj",
      copied: "Skopiowano!",
      retry: "Ponów",
      edit: "Edytuj",
    },
    nav: {
      chat: "Czat",
      knowledgeBase: "Baza wiedzy",
      analytics: "Admin",
      settings: "Ustawienia",
      logout: "Wyloguj",
      feedback: "Opinie i pomysły",
      platformOps: "Operacje platformy",
      recentChats: "Ostatnie czaty",
      newChat: "Nowy czat",
      deleteChatTitle: "Usunąć czat?",
      createSpace: "Utwórz nową przestrzeń",
      spaceSettings: "Ustawienia przestrzeni",
      spaceMembers: "Członkowie i uprawnienia",
      allSpaces: "Przestrzenie robocze",
      personalSpace: "Przestrzeń osobista",
    },
    header: {
      cloudEnterprise: "Cloud Enterprise",
      personaMentor: "Tryb mentora",
      personaAuditor: "Tryb audytora",
      personaArchitect: "Tryb architekta",
      personaSelect: "Rola AI",
    },
    chat: {
      inputPlaceholder: "Zadaj pytanie dotyczące dokumentów, nagrań lub bazy wiedzy...",
      send: "Wyślij",
      stop: "Zatrzymaj generowanie",
      attachFile: "Załącz plik",
      dropFilesHere: "Upuść pliki, aby dołączyć do wiadomości",
      emptyTitle: "Prywatny Asystent Bazy Wiedzy AI",
      emptySubtitle: "Zadawaj pytania, analizuj dokumenty i weryfikuj fakty z dokładnymi źródłami.",
      sourcesCited: "Wykorzystane źródła",
      sourcesCount: "wykorzystanych dokumentów",
      copyReply: "Kopiuj odpowiedź",
      playAudio: "Odtwórz brief audio",
      stopAudio: "Zatrzymaj audio",
      audioBriefing: "Brief audio",
      audioGenerating: "Generowanie briefu głosowego...",
      exportMarkdown: "Eksportuj do Markdown",
      exportPdf: "Eksportuj do PDF",
      trialExhaustedTitle: "Wykorzystano limit próbny",
      trialExhaustedDesc: "Wykorzystano 20 darmowych zapytań. Dodaj swój klucz Groq API w ustawieniach.",
      setupApiKeyTitle: "Jak uzyskać darmowy klucz (30 sekund)",
      goToSettings: "Przejdź do ustawień",
    },
    files: {
      title: "Dokumenty bazy wiedzy",
      subtitle: "Przesyłaj i zarządzaj plikami PDF, Word, tekstowymi, nagraniami audio oraz wideo.",
      uploadAreaTitle: "Prześlij dokumenty i pliki multimedialne",
      uploadAreaDesc: "Przeciągnij i upuść pliki tutaj lub kliknij, aby wybrać",
      supportedFormats: "Formaty: PDF, DOCX, TXT, MD, MP3, WAV, M4A, FLAC, MP4, MOV, MKV, WEBM (do 100MB)",
      colName: "Nazwa pliku",
      colType: "Typ",
      colSize: "Rozmiar",
      colStatus: "Status indeksowania",
      colChunks: "Fragmenty semantyczne",
      colActions: "Akcje",
      statusReady: "Zindeksowano",
      statusProcessing: "Przetwarzanie...",
      statusFailed: "Błąd",
      reindex: "Przeindeksuj",
      deleteModalTitle: "Usunąć dokument?",
      deleteModalDesc: "Spowoduje to trwałe usunięcie dokumentu oraz jego wektorów z bazy Qdrant.",
      noFilesFound: "Brak dokumentów. Prześlij pierwszy plik powyżej, aby rozpocząć indeksowanie.",
      searchPlaceholder: "Szukaj dokumentów po nazwie...",
    },
    spaces: {
      createTitle: "Utwórz przestrzeń wiedzy",
      namePlaceholder: "np. Umowy prawne, Obsługa klienta...",
      promptTitle: "Główny prompt i reguły przestrzeni",
      promptPlaceholder: "Określ, jak AI powinno analizować reguły i tworzyć odpowiedzi...",
      promptTip: "Wskazówka: Możesz ustawić odpowiedź dwupoziomową (podsumowanie dla managera + gotowy tekst dla klienta).",
      membersTitle: "Członkowie przestrzeni i uprawnienia",
      addMember: "Dodaj członka",
      emailPlaceholder: "user@company.com",
      roleOwner: "Właściciel",
      roleEditor: "Edytor",
      roleViewer: "Gość",
    },
    settings: {
      title: "Ustawienia systemowe",
      subtitle: "Zarządzaj kluczami AI, preferencjami interfejsu i parametrami bazy.",
      aiEngine: "Silnik AI (Groq Cloud API)",
      groqApiKey: "Osobisty klucz Groq API",
      groqPlaceholder: "gsk_...",
      trialQuota: "Zapytania próbne",
      trialRemaining: "pozostało",
      personalKeyActive: "Połączono osobisty klucz API",
      personalKeyActiveDesc: "Bezpośrednie szybkie połączenie aktywne. Limity próbne zniesione.",
      groqTierInfo: "Groq Cloud oferuje bezpłatnie do 30 RPM / 7,000 TPM / 14,400 RPD dla GPT-OSS 120B.",
      vectorDb: "Wektorowa baza danych",
      builtInVector: "Wbudowany silnik Qdrant",
      vectorOnline: "Aktywny",
      qdrantUrl: "Qdrant Cloud URL (opcjonalnie)",
      qdrantApiKey: "Qdrant API Key (opcjonalnie)",
      preferences: "Preferencje interfejsu",
      language: "Język interfejsu",
      languageDesc: "Wybierz główny język panelu nawigacyjnego.",
      fontSize: "Rozmiar czcionki i gęstość",
      fontSizeDesc: "Dostosuj gęstość tekstu i wielkość liter dla wygody czytania.",
      fontCompact: "Kompaktowy (13px)",
      fontDefault: "Domyślny (14px)",
      fontLarge: "Powiększony (15px)",
      cloudBannerTitle: "Tryb Cloud Enterprise",
      cloudBannerDesc: "Serwer działa wyłącznie na szybkiej chmurze inferencji. Odpowiedzi są generowane w ułamku sekundy bez obciążania procesora serwera.",
      setupGuideTitle: "Instrukcja (30 sek)",
      step1: "1. Otwórz console.groq.com",
      step2: "2. Zarejestruj się za darmo (bez karty)",
      step3: "3. Przejdź do API Keys → Create API Key",
      step4: '4. Wklej klucz powyżej i kliknij "Zapisz"',
    },
    feedback: {
      modalTitle: "Opinie i propozycje",
      modalSubtitle: "Pomóż rozwijać Vectrieve. Wszystkie zgłoszenia trafiają bezpośrednio do inżynierów.",
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
      totalLatency: "Łączny czas odpowiedzi",
      tokenSpeed: "Prędkość tokenów",
      dbPool: "Pula bazy danych",
      serverUptime: "Czas pracy serwera",
      dailyUsageTrend: "Dynamika użytkowania",
      dailyUsageDesc: "Liczba zapytań i indeksowanych dokumentów dziennie",
      queriesLegend: "Zapytania",
      docsLegend: "Dokumenty",
      ragLatencyBreakdown: "Podział opóźnień potoku RAG",
      denseSearch: "Wyszukiwanie Dense (FastEmbed BGE)",
      sparseSearch: "Wyszukiwanie Sparse (BM25 / SPLADE)",
      reranker: "Reranker Cross-Encoder",
      llmInference: "Generowanie odpowiedzi LLM (Groq)",
      dbPoolTitle: "Pula połączeń bazy danych",
      activeConnections: "Aktywne połączenia",
      idleConnections: "Wolne połączenia",
      poolSizeLimit: "Limit puli",
      poolOverflow: "Przepełnienie",
      llmThroughput: "Przepustowość LLM",
      avgGenSpeed: "Śr. prędkość generowania",
      totalTokensGen: "Łącznie wygenerowanych tokenów",
      userManagement: "Zarządzanie użytkownikami",
      userManagementDesc: "Weryfikacja i akceptacja zarejestrowanych kont przed przyznaniem dostępu.",
      totalRegistered: "Łącznie zarejestrowanych",
      pendingApproval: "Oczekuje na akceptację",
      colEmail: "Email użytkownika",
      colRole: "Rola",
      colApproval: "Status akceptacji",
      colState: "Stan konta",
      colIndexedDocs: "Dokumenty",
      colActions: "Akcje",
      roleAdmin: "Admin",
      roleUser: "Użytkownik",
      approved: "Zatwierdzony",
      pending: "Oczekuje na zatwierdzenie",
      active: "Aktywny",
      suspended: "Zawieszony",
      approve: "Zatwierdź",
      suspend: "Zawieś",
      activate: "Aktywuj",
      feedbackBoard: "Tablica zgłoszeń i opinii użytkowników",
      feedbackBoardDesc: "Zgłoszone propozycje funkcji, pomysły i raporty o błędach.",
      noFeedback: "Brak zgłoszeń w bazie.",
      statusResolved: "Rozwiązany",
      statusInProgress: "W trakcie",
      statusNew: "Nowy",
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
      copy: "Copiar",
      copied: "¡Copiado!",
      retry: "Reintentar",
      edit: "Editar",
    },
    nav: {
      chat: "Chat",
      knowledgeBase: "Base de conocimientos",
      analytics: "Admin",
      settings: "Configuración",
      logout: "Cerrar sesión",
      feedback: "Comentarios e ideas",
      platformOps: "Operaciones de plataforma",
      recentChats: "Chats recientes",
      newChat: "Nuevo chat",
      deleteChatTitle: "¿Eliminar chat?",
      createSpace: "Crear nuevo espacio",
      spaceSettings: "Configuración del espacio",
      spaceMembers: "Miembros y accesos",
      allSpaces: "Espacios de trabajo",
      personalSpace: "Espacio personal",
    },
    header: {
      cloudEnterprise: "Cloud Enterprise",
      personaMentor: "Modo mentor",
      personaAuditor: "Modo auditor",
      personaArchitect: "Modo arquitecto",
      personaSelect: "Rol de IA",
    },
    chat: {
      inputPlaceholder: "Haga cualquier pregunta sobre sus documentos, grabaciones o datos...",
      send: "Enviar",
      stop: "Detener generación",
      attachFile: "Adjuntar archivo",
      dropFilesHere: "Suelte los archivos para adjuntarlos al mensaje",
      emptyTitle: "Asistente de IA para Base de Conocimientos",
      emptySubtitle: "Haga preguntas, sintetice documentos y verifique datos con citas exactas.",
      sourcesCited: "Fuentes consultadas",
      sourcesCount: "documentos consultados",
      copyReply: "Copiar respuesta",
      playAudio: "Reproducir resumen de audio",
      stopAudio: "Detener audio",
      audioBriefing: "Resumen de audio",
      audioGenerating: "Sintetizando resumen de voz...",
      exportMarkdown: "Exportar como Markdown",
      exportPdf: "Exportar como PDF",
      trialExhaustedTitle: "Prueba gratuita completada",
      trialExhaustedDesc: "Ha utilizado sus 20 consultas gratuitas. Añada su clave de Groq API en configuración.",
      setupApiKeyTitle: "Cómo obtener su clave gratuita (30 segundos)",
      goToSettings: "Ir a Configuración",
    },
    files: {
      title: "Documentos de la Base de Conocimientos",
      subtitle: "Suba y gestione archivos PDF, Word, texto, grabaciones de audio y video para búsqueda RAG.",
      uploadAreaTitle: "Subir documentos y archivos multimedia",
      uploadAreaDesc: "Arrastre y suelte archivos aquí o haga clic para seleccionar",
      supportedFormats: "Formatos: PDF, DOCX, TXT, MD, MP3, WAV, M4A, FLAC, MP4, MOV, MKV, WEBM (hasta 100MB)",
      colName: "Nombre del archivo",
      colType: "Tipo",
      colSize: "Tamaño",
      colStatus: "Estado de indexación",
      colChunks: "Fragmentos semánticos",
      colActions: "Acciones",
      statusReady: "Indexado y listo",
      statusProcessing: "Procesando...",
      statusFailed: "Error",
      reindex: "Reindexar",
      deleteModalTitle: "¿Eliminar documento?",
      deleteModalDesc: "Esto eliminará permanentemente el documento y sus vectores de Qdrant.",
      noFilesFound: "Aún no hay documentos. Suba su primer archivo arriba para comenzar.",
      searchPlaceholder: "Buscar documentos por nombre...",
    },
    spaces: {
      createTitle: "Crear espacio de conocimiento",
      namePlaceholder: "ej. Contratos legales, Soporte al cliente...",
      promptTitle: "Prompt del sistema y directrices del espacio",
      promptPlaceholder: "Defina cómo la IA debe razonar, analizar políticas y redactar respuestas...",
      promptTip: "Consejo: Puede configurar una respuesta de 2 niveles (resumen para el gestor + mensaje listo para el cliente).",
      membersTitle: "Miembros del espacio y control de acceso",
      addMember: "Añadir miembro",
      emailPlaceholder: "usuario@empresa.com",
      roleOwner: "Propietario",
      roleEditor: "Editor",
      roleViewer: "Lector",
    },
    settings: {
      title: "Configuración del sistema",
      subtitle: "Gestione las credenciales de IA, preferencias de visualización y bases vectoriales.",
      aiEngine: "Motor de IA (Groq Cloud API)",
      groqApiKey: "Clave API de Groq personal",
      groqPlaceholder: "gsk_...",
      trialQuota: "Consultas de prueba",
      trialRemaining: "restantes",
      personalKeyActive: "Clave API personal conectada",
      personalKeyActiveDesc: "Conexión directa activa. Límites de prueba desbloqueados.",
      groqTierInfo: "Groq Cloud ofrece hasta 30 RPM / 7,000 TPM / 14,400 RPD gratis en GPT-OSS 120B.",
      vectorDb: "Base de datos vectorial",
      builtInVector: "Motor Qdrant integrado",
      vectorOnline: "En línea",
      qdrantUrl: "URL de Qdrant Cloud (opcional)",
      qdrantApiKey: "Clave API de Qdrant (opcional)",
      preferences: "Preferencias de interfaz",
      language: "Idioma de la interfaz",
      languageDesc: "Seleccione el idioma principal para el panel y operaciones.",
      fontSize: "Escala de tipografía y densidad",
      fontSizeDesc: "Ajuste la densidad del texto y el tamaño de la fuente para mayor comodidad.",
      fontCompact: "Compacto (13px)",
      fontDefault: "Predeterminado (14px)",
      fontLarge: "Grande (15px)",
      cloudBannerTitle: "Modo Cloud Enterprise",
      cloudBannerDesc: "Este servidor funciona exclusivamente con inferencia en la nube de alto rendimiento. Las respuestas se generan en milisegundos sin carga de CPU en el servidor.",
      setupGuideTitle: "Guía de configuración (30 seg)",
      step1: "1. Abra console.groq.com",
      step2: "2. Regístrese gratis (sin tarjeta de crédito)",
      step3: "3. Vaya a API Keys → Create API Key",
      step4: '4. Pegue su clave arriba y haga clic en "Guardar"',
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
      totalLatency: "Latencia total",
      tokenSpeed: "Velocidad de tokens",
      dbPool: "Grupo de base de datos",
      serverUptime: "Tiempo de actividad",
      dailyUsageTrend: "Tendencia de uso diario",
      dailyUsageDesc: "Consultas y documentos indexados por día",
      queriesLegend: "Consultas",
      docsLegend: "Docs",
      ragLatencyBreakdown: "Desglose de latencia del pipeline RAG",
      denseSearch: "Búsqueda densa (FastEmbed BGE)",
      sparseSearch: "Vector disperso (BM25 / SPLADE)",
      reranker: "Reranker Cross-Encoder",
      llmInference: "Inferencia LLM en Groq Cloud",
      dbPoolTitle: "Grupo de conexiones de base de datos",
      activeConnections: "Conexiones activas",
      idleConnections: "Conexiones libres",
      poolSizeLimit: "Límite del grupo",
      poolOverflow: "Desbordamiento",
      llmThroughput: "Rendimiento de LLM",
      avgGenSpeed: "Velocidad media de generación",
      totalTokensGen: "Total de tokens generados",
      userManagement: "Gestión y aprobación de usuarios",
      userManagementDesc: "Revise y apruebe cuentas registradas antes de otorgar acceso.",
      totalRegistered: "Total registrados",
      pendingApproval: "Pendientes de aprobación",
      colEmail: "Email del usuario",
      colRole: "Rol",
      colApproval: "Estado de aprobación",
      colState: "Estado de cuenta",
      colIndexedDocs: "Docs",
      colActions: "Acciones",
      roleAdmin: "Admin",
      roleUser: "Usuario",
      approved: "Aprobado",
      pending: "Pendiente de aprobación",
      active: "Activo",
      suspended: "Suspendido",
      approve: "Aprobar",
      suspend: "Suspender",
      activate: "Activar",
      feedbackBoard: "Panel de comentarios y reportes de errores",
      feedbackBoardDesc: "Sugerencias de funciones, ideas de optimización y reportes de errores.",
      noFeedback: "Aún no se han recibido comentarios.",
      statusResolved: "Resuelto",
      statusInProgress: "En progreso",
      statusNew: "Nuevo",
      markResolved: "Resuelto",
      markInProgress: "En progreso",
    },
  },
};
