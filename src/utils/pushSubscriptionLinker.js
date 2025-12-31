import { pushSubscriptionsAPI } from '../services/api';

/**
 * Привязывает существующую push-подписку к авторизованному пользователю
 * Вызывается после успешной авторизации/регистрации
 */
export const linkPushSubscription = async () => {
  try {
    // Проверяем, поддерживает ли браузер push-уведомления
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Получаем текущую подписку
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Нет активной подписки - нечего привязывать
      return;
    }

    // Отправляем запрос на привязку подписки
    await pushSubscriptionsAPI.linkSubscription({
      endpoint: subscription.endpoint,
    });

    console.log('Push-подписка успешно привязана к аккаунту');
  } catch (error) {
    console.error('Ошибка привязки push-подписки:', error);
    // Не показываем ошибку пользователю - это фоновый процесс
  }
};

