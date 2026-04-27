import React, { useEffect } from 'react';
import { pushSubscriptionsAPI } from '../../services/api';

const PushNotificationPrompt = () => {
  useEffect(() => {
    // Проверяем, поддерживает ли браузер push-уведомления
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Проверяем, не отклонял ли пользователь подписку недавно
    const dismissedTime = localStorage.getItem('push-dismissed');
    if (dismissedTime) {
      const hoursDiff = (Date.now() - new Date(dismissedTime).getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 2) {
        return; // Не спрашиваем, если отклонили менее 2 часов назад
      }
    }

    // Проверяем текущий статус подписки
    checkSubscriptionStatus();

    // Запрашиваем разрешение через 5 секунд после загрузки
    const timer = setTimeout(() => {
      requestPushPermission();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Ошибка проверки подписки:', error);
      return false;
    }
  };

  const requestPushPermission = async () => {
    try {
      // Проверяем, не подписан ли уже пользователь
      const isSubscribed = await checkSubscriptionStatus();
      if (isSubscribed) {
        return;
      }

      // Загружаем VAPID ключ
      let vapidPublicKey;
      try {
        const response = await pushSubscriptionsAPI.getVapidPublicKey();
        vapidPublicKey = response.data.publicKey;
      } catch (error) {
        console.error('Ошибка загрузки VAPID ключа:', error);
        return;
      }

      if (!vapidPublicKey) {
        console.warn('VAPID ключ не настроен');
        return;
      }

      // Сразу запрашиваем разрешение (без модального окна)
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        // Пользователь отклонил - сохраняем время отклонения
        localStorage.setItem('push-dismissed', new Date().toISOString());
        return;
      }

      // Разрешение получено - создаем подписку
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Сохраняем подписку на сервере
      await pushSubscriptionsAPI.subscribe({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
        userAgent: navigator.userAgent,
      });

      localStorage.removeItem('push-dismissed');
      console.log('Успешно подписались на push-уведомления');
    } catch (error) {
      console.error('Ошибка подписки на push-уведомления:', error);
      // Сохраняем время ошибки, чтобы не спрашивать сразу снова
      localStorage.setItem('push-dismissed', new Date().toISOString());
    }
  };

  // Вспомогательные функции для конвертации ключей
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer | null) {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Компонент не рендерит ничего - только запрашивает разрешение
  return null;
};

export default PushNotificationPrompt;

