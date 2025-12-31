import React, { Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor } from './store/store';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { checkAuth } from './store/slices/authSlice';
import { refreshUserToken } from './store/slices/userSlice';
import { setTheme } from './store/slices/uiSlice';
import Header from './components/Header/Header';
import AuthModal from './components/AuthModal/AuthModal';
import AdminProtectedRoute from './components/AdminProtectedRoute/AdminProtectedRoute';
import UserProtectedRoute from './components/UserProtectedRoute/UserProtectedRoute';
import { routesConfig } from './config/routesConfig';
import './App.css';

// Компонент загрузки
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '50vh',
    fontSize: '1.25rem',
    color: '#718096'
  }}>
    Загрузка...
  </div>
);

function App() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);

  useEffect(() => {
    // Применяем тему при загрузке
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      dispatch(setTheme(savedTheme));
    } else {
      // Проверяем системную тему
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        dispatch(setTheme('dark'));
      } else {
        dispatch(setTheme('light'));
      }
    }

    // Проверяем авторизацию админа при загрузке приложения
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      dispatch(checkAuth());
    }
    
    // Проверяем авторизацию пользователя
    const userAccessToken = localStorage.getItem('userAccessToken');
    if (userAccessToken) {
      dispatch(refreshUserToken());
    }
  }, [dispatch]);

  // Применяем тему к document при изменении
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <PersistGate loading={<LoadingFallback />} persistor={persistor}>
      <div className="App">
        <Header />
        <AuthModal />
        <main className="App__main">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {routesConfig.map((route) => {
                const { path, element: Element, protected: protectedType } = route;
                
                // Определяем элемент с учетом защиты
                let routeElement = <Element />;
                
                if (protectedType === 'user') {
                  routeElement = (
                    <UserProtectedRoute>
                      <Element />
                    </UserProtectedRoute>
                  );
                } else if (protectedType === 'admin') {
                  routeElement = (
                    <AdminProtectedRoute>
                      <Element />
                    </AdminProtectedRoute>
                  );
                }
                
                return (
                  <Route key={path} path={path} element={routeElement} />
                );
              })}
            </Routes>
          </Suspense>
        </main>
      </div>
    </PersistGate>
  );
}

export default App;
