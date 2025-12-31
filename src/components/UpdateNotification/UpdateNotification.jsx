import React, { useEffect, useState } from 'react';
import { notification } from 'antd';
import { applyUpdate } from '../../utils/serviceWorkerUpdate';
import './UpdateNotification.css';

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // Слушаем сообщения от Service Worker
    const handleMessage = (event) => {
      const { type } = event.data || {};
      if (type === 'UPDATE_AVAILABLE' || type === 'SW_UPDATED') {
        setUpdateAvailable(true);
        showUpdateNotification();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Проверяем отложенное обновление
    if (localStorage.getItem('sw-update-pending') === 'true') {
      setUpdateAvailable(true);
      showUpdateNotification();
    }

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const showUpdateNotification = () => {
    notification.info({
      message: 'Доступно обновление',
      description: 'Новая версия приложения готова к установке. Обновить сейчас?',
      duration: 0, // Не закрывается автоматически
      placement: 'topRight',
      btn: (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            onClick={() => {
              notification.destroy();
              applyUpdate();
            }}
            style={{
              padding: '0.375rem 0.75rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Обновить
          </button>
          <button
            onClick={() => {
              notification.destroy();
              localStorage.setItem('sw-update-pending', 'true');
            }}
            style={{
              padding: '0.375rem 0.75rem',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Позже
          </button>
        </div>
      ),
    });
  };

  return null; // Компонент не рендерит UI, только показывает уведомления
};

export default UpdateNotification;

