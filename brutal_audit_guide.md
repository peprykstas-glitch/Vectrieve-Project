# Vectrieve AI — Deep Step-by-Step Audit Checklist (v2)

Цей інтерактивний гайд призначений для покрокового аудиту системи. Ставте `[x]` навпроти кожного пункту лише після реальної перевірки в браузері чи консолі. Якщо якийсь крок не проходить, використовуйте інструкцію **🔧 Якщо FAIL** для швидкої діагностики коду.

---

## 0. Передумови та запуск

- [x] **Крок 0.1**: Запустіть систему за допомогою `start.bat`. Консоль відкрилася і показує лог `Vectrieve AI Core Stack is online`, відкривши вкладку браузера [http://localhost:3000](http://localhost:3000).
  - 🔧 **Якщо FAIL**: Перевірте конфлікти портів (Next.js на 3000, FastAPI на 8000). Запустіть `docker compose ps`, щоб перевірити статус Postgres (5432) та Qdrant (6333). Якщо ngrok повертає помилку `ERR_NGROK_334`, ngrok вже працює в іншій вкладці або системі — це не блокує систему, проігноруйте.
- [fail] **Крок 0.2**: У логах бекенду немає спотвореного тексту на кшталт `вљ пёЏ` замість емодзі `⚠️` або `✅` (юнікодні принти в `main.py` замінено на ASCII префікси `[INFO]` та `[OK]`).
все таки не все 
[FRONTEND] вњ“ Starting...
[FRONTEND] вњ“ Ready in 2.6s

---

## 1. Авторизація та Створення Адміністратора

- [x] **Крок 1.1**: Перейдіть на сторінку реєстрації `/register`, створіть тестовий акаунт `pepryk.stas@gmail.com` з паролем `Test1234!`. Реєстрація завершується успішно, відбувається редірект на `/login?registered=true`.
  - 🔧 **Якщо FAIL**: Перевірте лог бекенду на помилки валідації пароля. Перевірте з'єднання з базою в [auth.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/api/endpoints/auth.py).
- [x] **Крок 1.2**: Виконайте вхід під цим акаунтом. Вхід успішний, ви потрапляєте на головну `/`.
- [x] **Крок 1.3**: Запустіть скрипт призначення прав адміністратора:
  ```powershell
  & "backend/venv/Scripts/python.exe" backend/scripts/make_admin.py pepryk.stas@gmail.com
  ```
  Команда має вивести: `[OK] User 'pepryk.stas@gmail.com' successfully promoted to Admin.` без будь-яких помилок чи UnicodeEncodeError.
  - 🔧 **Якщо FAIL**: Перевірте код у [make_admin.py](file:///c:/Projects/Project%20X/Vectrieve/backend/scripts/make_admin.py). Переконайтеся, що файл не містить емодзі `✅` або `❌`, які ламають консоль Windows (CP1251).
- [x] **Крок 1.4**: Перезайдіть в акаунт у браузері (Logout -> Login). Спробуйте відкрити сторінку `/analytics`. Доступ дозволено (немає `403 Forbidden`).
  - 🔧 **Якщо FAIL**: Перевірте значення поля `is_admin` у базі даних: `SELECT is_admin FROM "user" WHERE username='pepryk.stas@gmail.com'`. Якщо воно `false`, переконайтеся, що скрипт `make_admin.py` підключається до тієї ж бази даних, що й додаток (перевірте `DATABASE_URL` у `backend/.env`).
- [x] **Крок 1.5**: Натисніть кнопку Logout. Спробуйте вручну перейти на `/` або надіслати запит на `http://localhost:8000/auth/me`. Бекенд повинен повернути помилку `401 Unauthorized`.
  - 🔧 **Якщо FAIL**: Кукі або авторизаційні заголовки не видаляються. Перевірте логіку логауту в [auth.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/api/endpoints/auth.py).

---

## 2. Ізоляція Просторів та Промпти (Phase 1 & Phase 4)

- [x] **Крок 2.1**: Створіть простір "Space Alpha". У його налаштуваннях вкажіть системний простір-промпт (System Prompt): *"You are a helpful assistant. Always end every single sentence with the word 'Sir!' without exception."* Оберіть локальну модель (наприклад, `qwen2.5-coder:7b`).
- [x] **Крок 2.2**: Створіть простір "Space Beta" з іншою конфігурацією (інша модель або без системного промпту).

- [x] **Крок 2.3**: У "Space Alpha" завантажте текстовий файл `alpha.txt`, що містить фразу: *"The secret key is Alpha123"*. Дочекайтеся статусу `COMPLETED` (може тривати 5–15 секунд).
- [x] **Крок 2.4**: У "Space Beta" завантажте файл `beta.txt` з текстом: *"The secret key is Beta999"*. Дочекайтеся статусу `COMPLETED`.
- [x] **Крок 2.5**: Перейдіть до "Space Alpha", створіть сесію чату і запитайте: *"What is the secret key?"*.
  - **Очікуваний результат**: Відповідь містить *"Alpha123"*, асистент посилається на файл `alpha.txt` і **закінчує кожне речення словом "Sir!"**.
  Secret Key Analysis

The secret key, as mentioned in the provided document context, is stored in the file пароль відсейфу.txt.
According to the file, the secret key is Alpha123, Sir!


Key Details


File name: пароль відсейфу.txt

Secret key: Alpha123, Sir!
This information is directly extracted from the provided document context, specifically from the file пароль відсейфу.txt, Sir!

  - 🔧 **Якщо FAIL (немає "Sir!")**: Перевірте [chat.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/api/endpoints/chat.py#L240-L241) — чи підставляється `space.system_prompt` у перше (system) повідомлення перед генерацією.
- [x] **Крок 2.6**: Перейдіть до "Space Beta", почніть новий чат і запитайте те саме: *"What is the secret key?"*.
  - **Очікуваний результат**: Відповідь містить *"Beta999"* і посилання на `beta.txt`. Відповідь **не** повинна містити жодної згадки про "Alpha123" чи слово "Sir!".
  - 🔧 **Якщо FAIL (інформація зливається)**: Дані протекли. Перевірте [vector_service.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/services/vector_service.py#L225) та переконайтеся, що `space_id` фільтрується як для dense Qdrant (`space_id` field match), так і для SQL sparse search (`where(Document.space_id == space_id)`).

---

## 3. Права Доступу та Спільні Простори (Phase 4 RBAC)

- [x] **Крок 3.1**: Зареєструйте другого користувача `viewer@example.com`. 
- [FAIL] **Крок 3.2**: Під першим акаунтом (власником "Space Alpha") запросіть `viewer@example.com` до простору з роллю **Viewer** (через 
інтерфейс налаштувань простору або додавши запис у таблицю `spacemember` через БД).
інтерфейсі та в логах не получиться ніде добавити нового користувача, ви мабуть створили це в беккенді але в фонртенді жодної інтеграції такої немає, тому тут потрібна нова імплементація в фронтенд але це вже не дебаг для тесту а треба прописати епік для цього тому автоматом FAIL
- [FAIL] **Крок 3.3**: Увійдіть під `viewer@example.com`. Переконайтеся, що ви бачите "Space Alpha" у списку просторів.
- [FAIL] **Крок 3.4**: Спробуйте видалити документ `alpha.txt` під акаунтом `viewer@example.com`.
  - **Очікуваний результат**: Кнопка видалення неактивна, або API повертає `403 Forbidden`.
  - 🔧 **Якщо FAIL**: Ролі не обмежують права. Перевірте перевірку ролі у файлі [upload.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/api/endpoints/upload.py) (ендпоінт `DELETE /upload/{doc_id}`).
- [FAIL] **Крок 3.5**: Змініть роль `viewer@example.com` на **Editor**. Спробуйте видалити `alpha.txt`.
  - **Очікуваний результат**: Документ успішно видалено.
- [FAIL] **Крок 3.6**: Спробуйте видалити весь простір "Space Alpha" під акаунтом Editor (`viewer@example.com`).
  - **Очікуваний результат**: API повертає `403 Forbidden`. Тільки **Owner** може видалити простір.
  - 🔧 **Якщо FAIL**: Перевірте ендпоінт `DELETE /spaces/{id}` у [spaces.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/api/endpoints/spaces.py). Переконайтеся, що там дозволено видалення лише для `SpaceRole.OWNER`.
- [FAIL] **Крок 3.7**: Під акаунтом Owner видаліть простір "Space Alpha". Перевірте в БД, що всі зв'язані документи, членства та сесії чату автоматично видалилися (каскадне видалення).
  - 🔧 **Якщо FAIL**: Залишилися сироти. Перевірте зв'язки CASCADE у [sql_models.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/models/sql_models.py).

---

## 4. Якість роботи парсерів (Phase 3a/3b/3c)

- [x] **Крок 4.1: Rich Text (DOCX/MD/HTML)**. Завантажте документ із вкладеною структурою заголовків та абзаців. Перевірте в чаті, чи розуміє модель розділи. Заголовки не повинні зливатися з наступними реченнями в одну стрічку.
ось я спитав про слова в DOCX : Lorem Ipsum - це текст-розплід, який використовується у дизайні та видавництві. Він був створений у 16 столітті і складається з випадкових слів та фраз латинської мови.


що таке Lorem Ipsum?

Як ми бачимо у файлі file-sample_500kB.docx, текст Lorem Ipsum використовується у багатьох місцях, наприклад у сегментах 1, 2, 3, 4, 5, 6 та 7. Це вказує на те, що цей файл може бути використаний як шаблон або зразок для дизайну документів.


На відміну від цього, у файлі пароль від сейфу.txt ми не бачимо жодного сліду Lorem Ipsum. Замість цього, ми бачимо тільки один рядок тексту, який містить пароль від сейфу: "Beta999".


Це підводить нас до питання: чому у одному файлі використовується Lorem Ipsum, а у іншому - ні? Яка була мета створення цих файлів, і чому вони містять такий різний вміст? Що ви думаєте про це? 

md : який файл є Sample 1 з бази даних
Відповідь проста: файл, який містить інформацію про "Sample 1", це sample-1.md. Цей файл містить заголовок "# Sample 1" і текст "This is the content of sample file 1."


Якщо порівняти з іншими файлами, то в пароль від сейфу.txt міститься тільки пароль, в sample html file download.html лише слово "Hi", а в file-sample_500kB.docx - великий текст на латинській мові. Тому, якщо ви шукаєте інформацію про "Sample 1", то файл sample-1.md є тим, що вам потрібно.

в якому документі просто пише "Hi"
Цю фразу "Hi" можна знайти в документі sample html file download.html. Там вона написана просто так, без жодного додаткового контексту чи інформації.


Якщо порівняти з іншими документами, то в пароль від сейфу.txt ми бачимо пароль, в sample-1.md описується контент зазначеного файлу, а в file-sample_500kB.docx міститься великий текстовий фрагмент.


Але якщо вас цікавить, чому саме в sample html file download.html стоїть тільки "Hi", то варто подумати про призначення цього файлу. Можливо, це просто приклад або тестовий файл, де автор просто хотів перевірити щось просте.


Що ви думаєте про призначення цього файлу? Чи мали ви якийсь конкретний контекст на увазі, коли запитували про цей документ?
мабуть цей найнудніший чи в цьому щось є філософське
Це цікавий погляд! Можливо, в тому, що в sample html file download.html стоїть тільки "Hi", є щось філософське. Це можна розглядати як мінімалістичний підхід до комунікації. Просто "Hi" - і нічого більше. Якби це був художній проєкт, то можна було б говорити про концепцію мінімалізму або про дослідження межі між порожнечею і змістом.


Якщо порівняти з іншими документами, то в пароль від сейфу.txt ми бачимо щось надзвичайно конкретне і практичне - пароль. У sample-1.md описується контент файлу, що знову ж таки має певну практичну мету. А в file-sample_500kB.docx міститься великий текст, який можна розглядати як певну сукупність інформації.


Але sample html file download.html з його простим "Hi" видається якимось антитезисом до всього цього. Це якби питання про сутність комунікації: чого ми хочемо досягти, коли спілкуємося? Чи потрібно нам завжди щось конкретне, чи іноді достатньо просто звернутися до когось, як би сказати "привіт"?


Що ви думаєте, чи є тут щось більше, ніж просто простий текст? Чи можна розглядати це як певний художній або філософський експеримент?

А тепер питання до вас: чого саме ви шукаєте в цьому файлі sample-1.md? Чи є щось конкретне, що вас цікавить?
  - 🔧 **Якщо FAIL**: Перевірте регулярні вирази розділення тексту в [pdf_parser.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/services/pdf_parser.py) або специфічних парсерах.
- [x] **Крок 4.2: Structured Data (CSV/XLSX)**. Завантажте таблицю з колонками `Ім'я`, `Посада`, `Зарплата`. Запитайте в чаті: *"Яка зарплата у [Конкретне Ім'я]?"*.
яка зп в нашого пма льохи
Якщо дивитися в файл зп в пма налто висока для такої бідної фірми.csv, то бачимо, що зарплата (Зарплата) Олексія, який займає посаду IT Project Manager, становить $3,500.


Цікаво, що порівнюючи з іншими працівниками, зарплата Олексія нижче, ніж у Дмитра (DevOps Engineer) - $4,100 та Тетяни (Product Owner) - $4,000.


Хочу звернути увагу, що ці дані містяться лише в одному файлі, і не знаємо, чи відповідають вони реальному становищу. Але якщо дивитися лише на ці дані, то зарплата Олексія складає $3,500.


А тепер питання до вас: чи думаєте ви, що ця зарплата відповідає реальним вимогам ринку праці для IT Project Manager? Чи потрібно додатково аналізувати інші джерела інформації, наприклад, ринки праці чи інші файли?
  - **Очікуваний результат**: Модель відповідає точно. Це доводить, що працює Row-Group RAG (рядки групуються з назвами колонок).
  - 🔧 **Якщо FAIL**: Перевірте [parsers.py](file:///c:/Projects/Project%20X/Vectrieve/backend/tests/test_parsers.py) та функцію `_group_rows_with_char_budget` в [pdf_parser.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/services/pdf_parser.py). Переконайтеся, що назви стовпців додаються до кожного чанку.
- [FAIL] **Крок 4.3: OCR (Сканований PDF)**. Завантажте PDF-документ, який містить лише фотографії сторінок з текстом (скан). Дочекайтеся статусу `COMPLETED`. Запитайте чат про текст з цього скану.
що міститься в файлі test-image.pdf окрім тексту
Як ми бачимо в контексті, файл test-image.pdf містить наступний текст:


TESTPDFWITHIMAGE

TESTPDFWITHIMAGE

Однак, як це вказано в назві файлу (test-image.pdf), він також містить зображення. Нажаль, контекст не надає інформації про те, яким саме є зображення, але ми можемо припустити, що воно присутнє в файлі.


Якщо порівняти з іншими файлами, наприклад, зп в пма налто висока для такої бідної фірми.csv, який містить таблицю з інформацією про працівників, то файл test-image.pdf видається досить простим. Але якщо порівняти з пароль від сейфу.txt, який містить лише один рядок з паролем, то файл test-image.pdf видається більш складним через наявність зображення.


Що ви думаєте про призначення цього файлу? Чи думаєте ви, що зображення в ньому має певне значення, або це просто тестовий файл?
ось логи для твого спокою [FRONTEND] GET / 200 in 515ms (compile: 347ms, proxy.ts: 7ms, render: 161ms)
[FRONTEND] GET / 200 in 54ms (compile: 8ms, proxy.ts: 5ms, render: 41ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/auth/me
[BACKEND] [INFO] Initializing Database...
[BACKEND] [OK] Database ready!
[BACKEND] INFO:     ::1:0 - "GET /auth/me HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/auth/me 200 in 1176ms (compile: 1042ms, proxy.ts: 12ms, render: 121ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/auth/me
[FRONTEND] GET / 200 in 80ms (compile: 15ms, proxy.ts: 11ms, render: 54ms)
[BACKEND] INFO:     ::1:0 - "GET /auth/me HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/auth/me 200 in 105ms (compile: 65ms, proxy.ts: 14ms, render: 25ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/auth/me
[BACKEND] INFO:     ::1:0 - "GET /auth/me HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/auth/me 200 in 52ms (compile: 20ms, proxy.ts: 10ms, render: 22ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/auth/me
[BACKEND] INFO:     ::1:0 - "GET /auth/me HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/auth/me 200 in 60ms (compile: 19ms, proxy.ts: 13ms, render: 29ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/sessions
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/auth/me
[BACKEND] INFO:     ::1:0 - "GET /sessions HTTP/1.1" 200 OK
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/spaces
[FRONTEND] GET /api/proxy/sessions 200 in 156ms (compile: 39ms, proxy.ts: 13ms, render: 104ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/sessions
[BACKEND] INFO:     ::1:0 - "GET /spaces HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/spaces 200 in 210ms (compile: 32ms, proxy.ts: 34ms, render: 143ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/spaces
[BACKEND] INFO:     ::1:0 - "GET /spaces HTTP/1.1" 200 OK
[BACKEND] INFO:     ::1:0 - "GET /auth/me HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/spaces 200 in 84ms (compile: 26ms, proxy.ts: 14ms, render: 44ms)
[FRONTEND] GET /api/proxy/auth/me 200 in 361ms (compile: 51ms, proxy.ts: 18ms, render: 292ms)
[BACKEND] INFO:     ::1:0 - "GET /sessions HTTP/1.1" 200 OK
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/spaces
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/auth/me
[FRONTEND] GET /api/proxy/sessions 200 in 303ms (compile: 17ms, proxy.ts: 26ms, render: 261ms)
[BACKEND] INFO:     ::1:0 - "GET /auth/me HTTP/1.1" 200 OK
[BACKEND] INFO:     ::1:0 - "GET /spaces HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/auth/me 200 in 99ms (compile: 41ms, proxy.ts: 17ms, render: 41ms)
[FRONTEND] GET /api/proxy/spaces 200 in 110ms (compile: 23ms, proxy.ts: 15ms, render: 71ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/sessions
[BACKEND] INFO:     ::1:0 - "GET /sessions HTTP/1.1" 200 OK
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/auth/me
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/spaces
[FRONTEND] GET /api/proxy/sessions 200 in 133ms (compile: 45ms, proxy.ts: 28ms, render: 61ms)
[BACKEND] INFO:     ::1:0 - "GET /auth/me HTTP/1.1" 200 OK
[BACKEND] INFO:     ::1:0 - "GET /spaces HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/auth/me 200 in 132ms (compile: 62ms, proxy.ts: 22ms, render: 48ms)
[FRONTEND] GET /api/proxy/spaces 200 in 134ms (compile: 72ms, proxy.ts: 18ms, render: 44ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/sessions
[BACKEND] INFO:     ::1:0 - "GET /sessions HTTP/1.1" 200 OK
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/auth/me
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/spaces
[FRONTEND] GET /api/proxy/sessions 200 in 137ms (compile: 44ms, proxy.ts: 30ms, render: 63ms)
[BACKEND] INFO:     ::1:0 - "GET /auth/me HTTP/1.1" 200 OK
[BACKEND] INFO:     ::1:0 - "GET /spaces HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/auth/me 200 in 125ms (compile: 59ms, proxy.ts: 16ms, render: 49ms)
[FRONTEND] GET /api/proxy/spaces 200 in 128ms (compile: 69ms, proxy.ts: 17ms, render: 42ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/sessions
[BACKEND] INFO:     ::1:0 - "GET /sessions HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/sessions 200 in 104ms (compile: 43ms, proxy.ts: 19ms, render: 42ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/auth/me
[BACKEND] INFO:     ::1:0 - "GET /auth/me HTTP/1.1" 200 OK
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/spaces
[FRONTEND] GET /api/proxy/auth/me 200 in 132ms (compile: 65ms, proxy.ts: 20ms, render: 47ms)
[BACKEND] INFO:     ::1:0 - "GET /spaces HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/spaces 200 in 139ms (compile: 82ms, proxy.ts: 18ms, render: 39ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/sessions
[BACKEND] INFO:     ::1:0 - "GET /sessions HTTP/1.1" 200 OK
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/auth/me
[FRONTEND] GET /api/proxy/sessions 200 in 77ms (compile: 21ms, proxy.ts: 28ms, render: 28ms)
[BACKEND] INFO:     ::1:0 - "GET /auth/me HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/auth/me 200 in 67ms (compile: 27ms, proxy.ts: 12ms, render: 28ms)
[FRONTEND] GET /?session=8b5500f0-6d35-448b-b5db-c2ed5e5517f8 200 in 38ms (compile: 9ms, proxy.ts: 5ms, render: 24ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/sessions
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/sessions/8b5500f0-6d35-448b-b5db-c2ed5e5517f8
[BACKEND] INFO:     ::1:0 - "GET /sessions HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/sessions 200 in 77ms (compile: 24ms, proxy.ts: 7ms, render: 46ms)
[BACKEND] INFO:     ::1:0 - "GET /sessions/8b5500f0-6d35-448b-b5db-c2ed5e5517f8 HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/sessions/8b5500f0-6d35-448b-b5db-c2ed5e5517f8 200 in 104ms (compile: 40ms, proxy.ts: 7ms, render: 57ms)
[FRONTEND] GET / 200 in 32ms (compile: 8ms, proxy.ts: 4ms, render: 20ms)
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/sessions
[BACKEND] INFO:     ::1:0 - "GET /sessions HTTP/1.1" 200 OK
[FRONTEND] GET /api/proxy/sessions 200 in 69ms (compile: 20ms, proxy.ts: 6ms, render: 44ms)
[FRONTEND] [BFF Proxy] Requesting: POST http://localhost:8000/chat/stream
[BACKEND] вљ пёЏ Cloud Qdrant not configured in .env
[BACKEND] INFO:     ::1:0 - "POST /chat/stream HTTP/1.1" 200 OK
[FRONTEND] [BFF Proxy] Requesting: GET http://localhost:8000/sessions
[FRONTEND] GET /api/proxy/sessions 200 in 428ms (compile: 30ms, proxy.ts: 9ms, render: 390ms)
[FRONTEND] POST /api/proxy/chat/stream 200 in 7.3s (compile: 16ms, proxy.ts: 5ms, render: 7.3s)і

  - 🔧 **Якщо статус FAILED**: Перевірте `error_log` документа в базі даних. Найчастіша причина — відсутність vision-моделі на Ollama (перевірте `ollama list` в системі) або некоректні ключі Groq.
- [FAIL] **Крок 4.4: Презентації (PPTX)**. Завантажте слайди `.pptx`, що містять зображення. Перевірте, чи генерує модель текстовий опис зображень та чи додає його до контенту слайда.
взагалі не можна вставити файл цього формату
  - 🔧 **Якщо описів немає**: Перевірте функцію `_extract_images_from_shape` та `describe_image_bytes` у [pdf_parser.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/services/pdf_parser.py).

---

## 5. Адмінська Аналітика та Телеметрія (Phase 2)

- [x] **Крок 5.1**: Перейдіть на Swagger за адресою [http://localhost:8000/docs](http://localhost:8000/docs), авторизуйтесь під адміном `pepryk.stas@gmail.com`. Викличте `GET /analytics/stats`. Ендпоінт повертає `200 OK` з реальною статистикою затримок та токенів.
- [x] **Крок 5.2**: Викличте цей самий ендпоінт під звичайним користувачем. Бекенд повертає `403 Forbidden` з деталями `"Forbidden: Admin access required."`.
  - 🔧 **Якщо FAIL**: Перевірте залежність `require_admin` у файлі [deps.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/api/deps.py#L39-L45) та її застосування в [analytics.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/api/endpoints/analytics.py#L19).
- [x] **Крок 5.3**: Надішліть кілька повідомлень у чат (як звичайні, так і стрімінгові). Перевірте таблицю `telemetrylog` у базі даних. Усі затримки (`dense_latency`, `sparse_latency`, `llm_latency`) мають бути реальними дробовими числами (не 0.0).
якщо зайти в вкладку аналітики там є дані System Analytics & Telemetry
Live
Real-time performance metrics, RAG latency, and database pool telemetry

Total Queries

117

Indexed Documents

24

Total Users

14

Avg Queries/Session

1.6

Storage Used (MB)

13.21

Vector Count

365

RAG & LLM Latency Breakdown
Average execution durations across query pipelines

Dense Search Latency
1519 ms
Sparse Search Latency
66 ms
Reranker Latency
694 ms
LLM Generation Latency
1.33 sec
Total Response Latency
4.03 sec
Database Pool Health
Active SQLAlchemy connections status

Checked Out (Active)
1
Checked In (Idle)
3
Pool Size Limit
15
Pool Overflow
-11
LLM Token Output
Token generation performance

Avg Generation Speed
95.9 t/s
User Feedback Ratio
0
0
  - 🔧 **Якщо затримки нульові**: Перевірте роботу `rag_telemetry.set()` та `rag_telemetry.get()` у [vector_service.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/services/vector_service.py) та [chat.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/api/endpoints/chat.py).

---

## 6. Конкурентне Навантаження та Баги 19-го липня

- [FAIL] **Крок 6.1: Асинхронний Pull без зависань**. У налаштуваннях простору почніть завантаження (pull) великої моделі (наприклад, `qwen2.5-coder:14b` або іншої понад 5 ГБ). **Поки триває завантаження**:
  - Спробуйте змінити активний простір у боковому меню.
  - Надішліть тестове повідомлення в чат іншого простору.
  - Відкрийте сторінку `/analytics` в окремій вкладці.
  Усі ці операції мають відбутися миттєво (до 2 секунд). Інтерфейс та бекенд **не повинні зависати** на час завантаження моделі.
  - 🔧 **Якщо зависає**: Перевірте [status.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/api/endpoints/status.py#L50-L84). Переконайтеся, що `pull_model_stream` використовує асинхронний `ollama.AsyncClient` та асинхронний генератор `async def sse_generator()`.

Все ще стабільно зависає незалежно, якщо робити все повільно і на фоні роботи Vectrieve не включати важки процесів то працює але під час тестів мені прийшлось перезавантажувати сервер разів 10
- [x] **Крок 6.2: WebSocket 403 спам-фільтр**. Відкрийте консоль розробника в браузері (F12, вкладка Network -> WS). Переконайтеся, що підключення по WebSocket встановлюється успішно (`101 Switching Protocols`). Лог бекенду більше не спамить кожні кілька секунд рядками `WebSocket /ws 403 Forbidden / connection rejected`.
  - 🔧 **Якщо з'являється 403**: Перевірте [ws.py](file:///c:/Projects/Project%20X/Vectrieve/backend/app-backend/api/endpoints/ws.py#L10-L11). Ендпоінт має бути зареєстрований і на `@router.websocket("")` (без слейша), і на `@router.websocket("/")` (зі слейшем), оскільки клієнти підключаються до `/ws?token=...`.
- [x] **Крок 6.3: Паралельне завантаження файлів**. Виберіть 3 файли одночасно та завантажте їх в один простір. Переконайтеся, що всі три файли успішно парсяться та набувають статусу `COMPLETED` паралельно, не блокуючи та не затираючи прогрес один одного в UI.
  - 🔧 **Якщо один файл застрягає в процесингу або перезаписує інший**: Перевірте обробку повідомлень у фронтенд-хуку `useFiles.ts` — оновлення стану має орієнтуватись на унікальний ID файлу (`doc_id`), а не на порядковий індекс у масиві.

---

## 7. Коректне завершення (Shutdown)

- [x] **Крок 7.1**: Натисніть `Ctrl+C` у вікні запущеного батника `start.bat`. 
  - **Очікуваний результат**: Застосунок зупиняє бекенд, фронтенд, ngrok та робить `docker compose down` для баз даних. Порти 3000 та 8000 повністю звільняються, жодних "зомбі" процесів Python чи Node не залишається в пам'яті.
  - 🔧 **Якщо порти 3000/8000 залишаються зайнятими**: Перевірте логіку завершення процесів у [start_vectrieve.py](file:///c:/Projects/Project%20X/Vectrieve/start_vectrieve.py#L76-L101) (функція `cleanup`). На Windows має коректно відпрацьовувати команда `taskkill /T /F /PID` для кожної запущеної підпрограми.
