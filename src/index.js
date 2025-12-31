import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { store } from './store/store';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './index.css';
import './styles/antd-custom.css';

// Применяем тему при загрузке
const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    return savedTheme;
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

document.documentElement.setAttribute('data-theme', getInitialTheme());

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider locale={ruRU}>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ConfigProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Регистрация Service Worker для PWA с автоматическим обновлением
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        updateViaCache: 'none' // Всегда проверяем обновления
      });
      
      console.log('Service Worker registered successfully:', registration.scope);

      // Инициализируем систему обновлений
      const { initServiceWorkerUpdate, checkPendingUpdate } = await import('./utils/serviceWorkerUpdate');
      await initServiceWorkerUpdate();
      checkPendingUpdate();

      // Обработка обновления Service Worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Новый SW установлен, но старый еще активен
            console.log('New Service Worker installed, update available');
            // Автоматически применяем обновление
            if (window.confirm('Доступна новая версия приложения. Обновить сейчас?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      });

      // Проверяем обновления каждые 60 секунд
      setInterval(() => {
        registration.update();
      }, 60 * 1000);

    } catch (error) {
      console.log('Service Worker registration failed:', error);
    }
  });
}
