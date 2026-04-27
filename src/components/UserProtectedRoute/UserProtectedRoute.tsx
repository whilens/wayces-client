import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { ROUTES } from '../../utils/constants';

type UserProtectedRouteProps = {
  children: React.ReactNode;
};

const UserProtectedRoute = ({ children }: UserProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.user);
  const userAccessToken = localStorage.getItem('userAccessToken');

  // Если идет загрузка (проверка авторизации) - показываем загрузку, не редиректим
  if (isLoading && userAccessToken) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
        Загрузка...
      </div>
    );
  }

  // Если нет токена или пользователь не авторизован (после завершения проверки) - редирект на главную
  if (!userAccessToken || !isAuthenticated) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return children;
};

export default UserProtectedRoute;

