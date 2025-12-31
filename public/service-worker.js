// Service Worker для PWA
// Версия кеша - меняйте при обновлении приложения
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `wayces-${CACHE_VERSION}`;
const RUNTIME_CACHE = `wayces-runtime-${CACHE_VERSION}`;
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // Проверка обновлений каждый час

// Файлы для кэширования при установке
// В development режиме пути могут отличаться, поэтому кэшируем только основные файлы
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/192.png',
  '/256.png',
  '/512.png',
  '/favicon.ico'
].filter(Boolean);

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Installing version ${CACHE_VERSION}...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static files:', STATIC_CACHE_URLS);
        // Используем addAll с обработкой ошибок
        return Promise.allSettled(
          STATIC_CACHE_URLS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[Service Worker] Failed to cache ${url}:`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[Service Worker] Installation complete, activating immediately');
        // Активируем сразу, чтобы новый SW начал работать
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[Service Worker] Installation failed:', err);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Activating version ${CACHE_VERSION}...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Удаляем все старые кеши
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => {
      // Заявляем контроль над всеми клиентами
      return self.clients.claim();
    })
    .then(() => {
      // Уведомляем все клиенты о новой версии
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION,
            message: 'Новая версия приложения доступна'
          });
        });
      });
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к API и внешние ресурсы
  if (
    event.request.url.includes('/api/') ||
    event.request.url.startsWith('http://') ||
    event.request.url.startsWith('https://') && !event.request.url.includes(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Стратегия: Network First с fallback на кеш
        // Сначала пытаемся получить свежие данные из сети
        return fetch(event.request)
          .then((response) => {
            // Кэшируем только успешные GET запросы
            if (
              event.request.method === 'GET' &&
              response.status === 200 &&
              response.type === 'basic'
            ) {
              const responseToCache = response.clone();
              caches.open(RUNTIME_CACHE)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(() => {
            // Если сеть недоступна, используем кеш
            if (cachedResponse) {
              return cachedResponse;
            }
            // Если запрос не удался и это HTML, возвращаем главную страницу
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // Клиент просит активировать новый SW
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Клиент просит проверить обновления
    checkForUpdates();
  }
});

// Функция проверки обновлений
async function checkForUpdates() {
  try {
    // Пытаемся загрузить новый service-worker.js
    const response = await fetch('/service-worker.js', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (response.ok) {
      const newScript = await response.text();
      // Проверяем версию в новом скрипте
      const versionMatch = newScript.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
      
      if (versionMatch && versionMatch[1] !== CACHE_VERSION) {
        console.log(`[Service Worker] New version detected: ${versionMatch[1]} (current: ${CACHE_VERSION})`);
        // Уведомляем клиентов о новой версии
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            currentVersion: CACHE_VERSION,
            newVersion: versionMatch[1]
          });
        });
        return true; // Обновление найдено
      }
    }
    return false; // Обновление не найдено
  } catch (error) {
    console.error('[Service Worker] Error checking for updates:', error);
    return false;
  }
}

// Периодическая проверка обновлений
setInterval(() => {
  checkForUpdates();
}, UPDATE_CHECK_INTERVAL);

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Wayces',
    body: 'Новое уведомление',
    icon: '/192.png',
    badge: '/192.png',
    url: '/',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || 'Wayces',
        body: data.body || 'Новое уведомление',
        icon: data.icon || '/192.png',
        badge: data.badge || '/192.png',
        url: data.url || '/',
        data: data.data || {},
      };
    } catch (e) {
      // Если не JSON, используем текст
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    tag: 'wayces-notification',
    data: notificationData.data,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || event.notification.data?.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Ищем открытое окно с нашим сайтом
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(url));
        }
      }
      // Если окно не найдено, открываем новое
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

