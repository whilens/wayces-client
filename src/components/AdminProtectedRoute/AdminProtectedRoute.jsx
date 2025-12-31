import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { checkAuth } from '../../store/slices/authSlice';
import { ROUTES } from '../../utils/constants';

const AdminProtectedRoute = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, admin, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Проверяем авторизацию при монтировании компонента
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && (!isAuthenticated || !admin)) {
      dispatch(checkAuth());
    }
  }, [dispatch, isAuthenticated, admin]);

  // Показываем загрузку во время проверки авторизации
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        fontSize: '1.25rem',
        color: '#718096'
      }}>
        Проверка авторизации...
      </div>
    );
  }

  // Проверяем авторизацию и роль админа
  if (!isAuthenticated || !admin || admin.role !== 'admin') {
    return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
  }

  return children;
};

export default AdminProtectedRoute;

