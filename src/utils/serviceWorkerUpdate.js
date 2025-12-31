/**
 * Утилита для управления обновлениями Service Worker
 */

let registration = null;
let updateAvailable = false;

/**
 * Инициализация проверки обновлений Service Worker
 */
export const initServiceWorkerUpdate = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    registration = await navigator.serviceWorker.ready;

    // Слушаем сообщения от Service Worker
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    // Проверяем обновления при загрузке
    checkForUpdates();

    // Проверяем обновления периодически (каждые 5 минут)
    setInterval(checkForUpdates, 5 * 60 * 1000);

    // Проверяем обновления при фокусе окна
    window.addEventListener('focus', checkForUpdates);

    // Проверяем обновления при видимости страницы
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    });
  } catch (error) {
    console.error('Error initializing service worker update:', error);
  }
};

/**
 * Проверка обновлений Service Worker
 */
const checkForUpdates = async () => {
  if (!registration) {
    return;
  }

  try {
    // Запрашиваем обновление
    await registration.update();

    // Проверяем, есть ли ожидающий Service Worker
    if (registration.waiting) {
      handleUpdateAvailable();
    }

    // Проверяем, есть ли устанавливающийся Service Worker
    if (registration.installing) {
      registration.installing.addEventListener('statechange', (event) => {
        if (event.target.state === 'installed' && registration.waiting) {
          handleUpdateAvailable();
        }
      });
    }

    // Отправляем сообщение Service Worker для проверки версии
    if (registration.active) {
      registration.active.postMessage({ type: 'CHECK_UPDATE' });
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
};

/**
 * Обработка сообщений от Service Worker
 */
const handleServiceWorkerMessage = (event) => {
  const { type, version, newVersion, currentVersion } = event.data || {};

  if (type === 'UPDATE_AVAILABLE' || type === 'SW_UPDATED') {
    console.log('Update available:', { currentVersion, newVersion, version });
    handleUpdateAvailable();
  }
};

/**
 * Обработка доступного обновления
 */
const handleUpdateAvailable = () => {
  if (updateAvailable) {
    return; // Уже обрабатываем обновление
  }

  updateAvailable = true;

  // Показываем уведомление пользователю
  if (window.confirm('Доступна новая версия приложения. Обновить сейчас?')) {
    applyUpdate();
  } else {
    // Сохраняем информацию об обновлении для следующего раза
    localStorage.setItem('sw-update-pending', 'true');
  }
};

/**
 * Применение обновления
 */
export const applyUpdate = async () => {
  if (!registration || !registration.waiting) {
    // Если нет ожидающего SW, перезагружаем страницу
    window.location.reload();
    return;
  }

  try {
    // Отправляем сообщение ожидающему SW для активации
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Ждем активации нового SW
    registration.waiting.addEventListener('statechange', (event) => {
      if (event.target.state === 'activated') {
        // Перезагружаем страницу для применения обновления
        window.location.reload();
      }
    });

    // Если через 2 секунды не активировался, просто перезагружаем
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error('Error applying update:', error);
    // В случае ошибки просто перезагружаем страницу
    window.location.reload();
  }
};

/**
 * Проверка отложенного обновления
 */
export const checkPendingUpdate = () => {
  if (localStorage.getItem('sw-update-pending') === 'true') {
    localStorage.removeItem('sw-update-pending');
    if (window.confirm('Доступна новая версия приложения. Обновить сейчас?')) {
      applyUpdate();
    }
  }
};

