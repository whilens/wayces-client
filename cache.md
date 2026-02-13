# Промпт для реализации системы кеширования и обновления PWA приложения

## Задача

Реализовать систему кеширования и автоматического обновления для Progressive Web App (PWA) с использованием Service Worker. Система должна обеспечивать:

1. **Многоуровневое кеширование** статических ресурсов, изображений и API запросов
2. **Автоматическое обнаружение и применение обновлений** без участия пользователя
3. **Версионирование кешей** с автоматической очисткой старых версий
4. **Офлайн-поддержку** с fallback на кешированные ресурсы
5. **Управление обновлениями** через единый менеджер

## Технические требования

### 1. Service Worker (`sw.js`)

**Версионирование:**
- Использовать timestamp сборки как версию кеша
- Формат версии: `CACHE_VERSION = 'timestamp'` (заменяется при сборке)
- Формат имени кеша: `{app-name}-cache-v{VERSION}`
- Создать отдельные кеши для разных типов ресурсов:
  - `{app-name}-cache-v{VERSION}` - статические ресурсы
  - `{app-name}-runtime-v{VERSION}` - runtime кеш (API, HTML)
  - `{app-name}-images-v{VERSION}` - изображения

**Стратегии кеширования:**

1. **Cache First** (для статики):
   - JS, CSS, шрифты (`.js`, `.css`, `.woff`, `.woff2`, `.ttf`)
   - Пути: `/static/`, `/assets/`, `/pwa/`
   - Логика: сначала проверяем кеш, если нет - загружаем из сети и кешируем

2. **Cache First для изображений** (с фоновым обновлением):
   - Форматы: `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp`
   - Логика: возвращаем из кеша сразу, обновляем в фоне асинхронно

3. **Network First** (для динамического контента):
   - API запросы (`/api/`)
   - HTML страницы
   - Логика: сначала сеть, при ошибке - из кеша

**Жизненный цикл Service Worker:**

1. **Установка (`install`):**
   ```javascript
   - Вызвать self.skipWaiting() для немедленной активации
   - Очистить старые кеши
   - Логировать версию и timestamp
   ```

2. **Активация (`activate`):**
   ```javascript
   - Вызвать self.clients.claim() для контроля над всеми вкладками
   - Удалить старые Service Workers
   - Очистить старые кеши (оставить только последние 2 версии)
   - Отправить сообщение SW_ACTIVATED всем клиентам с версией
   ```

3. **Перехват запросов (`fetch`):**
   ```javascript
   - Пропускать не-GET запросы
   - Определять стратегию по типу ресурса
   - Применять соответствующую стратегию кеширования
   - Для HTML при ошибке возвращать кешированную страницу
   ```

**Очистка кешей:**
- Хранить максимум 2 последние версии (`MAX_OLD_CACHES = 2`)
- Сортировать кеши по версии (новые первыми)
- Удалять кеши других приложений (опционально)
- Логировать процесс очистки

**Обработка сообщений:**
- `SKIP_WAITING` - пропустить ожидание и активироваться
- `CLEAR_CACHE` - очистить все кеши
- `GET_VERSION` - вернуть текущую версию и timestamp
- `CHECK_UPDATE` - проверить наличие обновлений

**Push-уведомления:**
- Обрабатывать `push` события
- Показывать уведомления с иконкой и действиями
- Обрабатывать клики по уведомлениям (открытие приложения)

### 2. Service Worker Manager (`serviceWorkerManager.js`)

**Класс ServiceWorkerManager должен иметь:**

**Свойства:**
- `registration` - регистрация Service Worker
- `updateAvailable` - флаг наличия обновления
- `isUpdating` - флаг процесса обновления
- `updateCheckFrequency` - частота проверки (по умолчанию 5 минут)
- `currentVersion` - текущая версия SW
- `buildTimestamp` - timestamp сборки
- `listeners` - Map для хранения подписчиков на события

**Методы:**

1. **`init()`** - инициализация:
   - Регистрация SW с `updateViaCache: 'none'`
   - Получение версии из SW
   - Подписка на события: `updatefound`, `message`, `controllerchange`
   - Первоначальная проверка обновлений
   - Запуск периодической проверки

2. **`getVersion()`** - получение версии:
   - Отправка сообщения `GET_VERSION` через MessageChannel
   - Сохранение версии и timestamp
   - Таймаут 1 секунда

3. **`handleUpdateFound()`** - обработка найденного обновления:
   - Отслеживание состояния нового SW
   - При `installed` - установка флага `updateAvailable`
   - Автоматический вызов `applyUpdate()`
   - Уведомление подписчиков

4. **`handleServiceWorkerMessage(event)`** - обработка сообщений:
   - `SW_ACTIVATED` - обновление версии, уведомление подписчиков
   - `UPDATE_AVAILABLE` - установка флага, автоматическое применение

5. **`handleControllerChange()`** - обработка смены контроллера:
   - Перезагрузка страницы через 100 мс

6. **`checkForUpdates()`** - проверка обновлений:
   - Вызов `registration.update()`
   - Проверка наличия `registration.waiting`
   - Возврат boolean

7. **`applyUpdate()`** - применение обновления:
   - Проверка наличия `waiting` SW
   - Отправка `SKIP_WAITING`
   - Ожидание `controllerchange` (таймаут 5 сек)
   - Автоматическая перезагрузка страницы

8. **`startPeriodicUpdateCheck()`** - запуск периодической проверки:
   - Установка интервала на основе `updateCheckFrequency`
   - Проверка только если не идет обновление

9. **`stopPeriodicUpdateCheck()`** - остановка проверки

10. **`clearCache()`** - очистка кеша:
    - Отправка `CLEAR_CACHE` через MessageChannel
    - Таймаут 5 секунд

11. **`getCacheInfo()`** - информация о кешах:
    - Список всех кешей
    - Размер каждого кеша (количество записей)
    - Первые 10 URL для примера

12. **`addEventListener(event, callback)`** - подписка на события
13. **`removeEventListener(event, callback)`** - отписка
14. **`notifyListeners(event, data)`** - уведомление подписчиков
15. **`getStatus()`** - получение статуса:
    - supported, registered, updateAvailable, controller, version, buildTimestamp, isUpdating

16. **`setUpdateCheckFrequency(milliseconds)`** - установка частоты проверки

**События для подписки:**
- `updateAvailable` - доступно обновление
- `activated` - SW активирован

### 3. Интеграция в приложение

**В `App.js` или главном компоненте:**
```javascript
import serviceWorkerManager from './utils/serviceWorkerManager';

// Service Worker Manager инициализируется автоматически при импорте
// Дополнительная инициализация не требуется
```

**Создание хука `useServiceWorker.js`:**
- Использование `serviceWorkerManager` для React компонентов
- Состояния: `status`, `updateAvailable`, `isUpdating`
- Методы: `checkForUpdates()`, `applyUpdate()`, `forceUpdate()`, `clearCache()`, `getCacheInfo()`
- Периодическое обновление статуса (каждые 5 секунд)

### 4. Сборка и версионирование

**Требования к процессу сборки:**

1. При сборке проекта:
   - Генерировать timestamp: `Date.now().toString()`
   - Генерировать ISO timestamp: `new Date().toISOString()`
   - Заменять в `sw.js`:
     - `CACHE_VERSION = 'timestamp'` → актуальный timestamp
     - `BUILD_TIMESTAMP = 'ISO-string'` → актуальный ISO timestamp

2. Пример скрипта для замены (Node.js):
   ```javascript
   const fs = require('fs');
   const swPath = './public/sw.js';
   const timestamp = Date.now().toString();
   const buildTime = new Date().toISOString();
   
   let swContent = fs.readFileSync(swPath, 'utf8');
   swContent = swContent.replace(
     /const CACHE_VERSION = '[^']*'/,
     `const CACHE_VERSION = '${timestamp}'`
   );
   swContent = swContent.replace(
     /const BUILD_TIMESTAMP = '[^']*'/,
     `const BUILD_TIMESTAMP = '${buildTime}'`
   );
   fs.writeFileSync(swPath, swContent);
   ```

### 5. Структура файлов

```
project/
├── public/
│   └── sw.js                    # Service Worker
├── src/
│   ├── utils/
│   │   └── serviceWorkerManager.js  # Менеджер SW
│   ├── hooks/
│   │   └── useServiceWorker.js      # React хук
│   └── App.js                       # Главный компонент
└── build-script.js                  # Скрипт для замены версий
```

### 6. Особенности реализации

**Автоматическое обновление:**
- При обнаружении нового SW автоматически применяется обновление
- Пользователь не видит уведомлений, страница перезагружается автоматически
- Для ручного управления можно добавить UI с кнопкой "Обновить"

**Офлайн-поддержка:**
- Статические ресурсы доступны офлайн
- HTML страницы имеют fallback на кешированную версию
- API запросы работают только онлайн (Network First)

**Производительность:**
- Изображения загружаются из кеша мгновенно, обновляются в фоне
- Статика кешируется навсегда (immutable)
- API всегда проверяет сеть первым для актуальности данных

**Отладка:**
- Все действия логируются в консоль с префиксом `[SW]` или `[SW Manager]`
- Можно получить статус через `serviceWorkerManager.getStatus()`
- Информация о кешах через `getCacheInfo()`

### 7. Пример использования

```javascript
// В компоненте
import { useServiceWorker } from './hooks/useServiceWorker';

function MyComponent() {
  const { status, updateAvailable, checkForUpdates, applyUpdate } = useServiceWorker();
  
  useEffect(() => {
    if (updateAvailable) {
      // Можно показать уведомление или применить автоматически
      applyUpdate();
    }
  }, [updateAvailable]);
  
  return <div>Версия: {status.version}</div>;
}
```

### 8. Консольные команды (опционально)

Для отладки можно добавить глобальные команды:
```javascript
window.sw = {
  check: () => serviceWorkerManager.checkForUpdates(),
  update: () => serviceWorkerManager.applyUpdate(),
  clear: () => serviceWorkerManager.clearCache(),
  status: () => serviceWorkerManager.getStatus(),
  cache: () => serviceWorkerManager.getCacheInfo()
};
```

## Результат

После реализации должна получиться система, которая:
- ✅ Автоматически кеширует все статические ресурсы
- ✅ Обнаруживает и применяет обновления без участия пользователя
- ✅ Поддерживает офлайн-режим
- ✅ Управляет версиями кешей и очищает старые
- ✅ Предоставляет API для управления через менеджер
- ✅ Логирует все действия для отладки