import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Проверяем, установлено ли приложение
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Проверяем localStorage
    const wasInstalled = localStorage.getItem('pwa-installed');
    if (wasInstalled === 'true') {
      return;
    }

    // Проверяем, отклонял ли пользователь недавно
    const dismissedTime = localStorage.getItem('pwa-dismissed');
    if (dismissedTime) {
      const hoursDiff = (Date.now() - new Date(dismissedTime).getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 2) {
        return;
      }
    }

    // Обработчик события beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Обработчик успешной установки
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Показываем промпт через 3 секунды, если событие не пришло
    const timer = setTimeout(() => {
      if (!deferredPrompt) {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        if (!isStandalone && 'serviceWorker' in navigator) {
          setShowPrompt(true);
        }
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          localStorage.setItem('pwa-installed', 'true');
        }
      } catch (error) {
        console.error('Install error:', error);
      }
    }
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-dismissed', new Date().toISOString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt__overlay" onClick={handleDismiss}></div>
      <div className="install-prompt__content">
        <button 
          className="install-prompt__close" 
          onClick={handleDismiss}
          aria-label="Закрыть"
        >
          ×
        </button>
        
        <div className="install-prompt__icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="12" fill="#667eea" opacity="0.1"/>
            <path d="M32 20L42 30H36V44H28V30H22L32 20Z" fill="#667eea"/>
            <path d="M20 48H44V52H20V48Z" fill="#667eea"/>
          </svg>
        </div>

        <h3 className="install-prompt__title">Установить Wayces</h3>
        <p className="install-prompt__description">
          Установите приложение для быстрого доступа и работы офлайн
        </p>

        <div className="install-prompt__actions">
          <button 
            className="install-prompt__button install-prompt__button--primary install-prompt__button--gradient"
            onClick={handleInstall}
          >
            Установить
          </button>
          <button 
            className="install-prompt__button install-prompt__button--secondary"
            onClick={handleDismiss}
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
