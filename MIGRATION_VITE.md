# Чеклист миграции на Vite

## Сделано

- [x] **vite.config.js** — порт 3001, proxy `/api` → backend, сборка в `build/`
- [x] **index.html** в корне `wayces-client` с `<script type="module" src="/src/index.js">`
- [x] Пути в index.html без `%PUBLIC_URL%` (favicon, manifest и т.д. через `/`)
- [x] **Переменные окружения**: `REACT_APP_*` → `VITE_*`
  - `src/services/api.js` — `VITE_API_URL`, `VITE_FRONTEND_VERSION`
  - `src/utils/imageUtils.js` — `VITE_API_URL`
  - `src/store/slices/productsSlice.js` — `VITE_USE_MOCK_DATA`
- [x] **.env** — переименованы переменные на `VITE_*`
- [x] **package.json** — удалён `react-scripts`, добавлены `vite`, `@vitejs/plugin-react`, скрипты `dev`/`start`/`build`/`preview`
- [x] Удалён дубликат `public/index.html`

## Что сделать вручную

1. **Установить зависимости**
   ```bash
   cd wayces-client && npm install
   ```

2. **Проверить запуск**
   ```bash
   npm run dev
   # или
   npm start
   ```
   Откройте http://localhost:3001

3. **Проверить сборку**
   ```bash
   npm run build
   ```
   Результат в папке `build/` (как раньше у CRA).

4. **Опционально: тесты**  
   Сейчас `npm run test` только выводит подсказку. Для тестов можно позже добавить Vitest:
   ```bash
   npm i -D vitest @testing-library/react jsdom
   ```
   и настроить в `vite.config.js`.

## Переменные окружения

В `.env` и при деплое используйте:

- `VITE_API_URL` — базовый URL API (раньше `REACT_APP_API_URL`)
- `VITE_USE_MOCK_DATA` — мок-данные (раньше `REACT_APP_USE_MOCK_DATA`)
- `VITE_FRONTEND_VERSION` — версия фронта для заголовков (если нужна)

## Обратная несовместимость

- **CRA** больше не используется — скрипт `eject` удалён.
- Переменные только с префиксом `VITE_` доступны в коде через `import.meta.env.VITE_*`.
