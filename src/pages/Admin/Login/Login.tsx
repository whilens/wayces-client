import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { login, clearError } from '../../../store/slices/authSlice';
import { ROUTES } from '../../../utils/constants';
import { notification } from 'antd';
import './Login.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});

  // Редирект если уже авторизован
  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.ADMIN_DASHBOARD);
    }
  }, [isAuthenticated, navigate]);

  // Показываем ошибку через уведомление
  useEffect(() => {
    if (error) {
      const typedError =
        typeof error === 'object' && error !== null
          ? (error as { error?: string; message?: string })
          : null;
      const errorMessage = typedError?.error || typedError?.message || String(error) || 'Ошибка авторизации';
      notification.error({
        message: 'Ошибка авторизации',
        description: errorMessage,
        placement: 'topRight',
      });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as keyof typeof formData;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { login?: string; password?: string } = {};

    if (!formData.login.trim()) {
      newErrors.login = 'Логин обязателен для заполнения';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Пароль обязателен для заполнения';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const loginThunk = login as unknown as (payload: { login: string; password: string }) => unknown;
    await dispatch(loginThunk(formData) as never);
  };

  return (
    <div className="admin-login">
      <div className="admin-login__container">
        <div className="admin-login__card">
          <h1 className="admin-login__title">Вход в админ-панель</h1>
          <form className="admin-login__form" onSubmit={handleSubmit}>
            <div className="admin-login__form-group">
              <label htmlFor="login" className="admin-login__label">
                Логин
              </label>
              <input
                type="text"
                id="login"
                name="login"
                value={formData.login}
                onChange={handleChange}
                className={`admin-login__input ${errors.login ? 'admin-login__input--error' : ''}`}
                placeholder="Введите логин"
                disabled={isLoading}
              />
              {errors.login && (
                <span className="admin-login__error">{errors.login}</span>
              )}
            </div>

            <div className="admin-login__form-group">
              <label htmlFor="password" className="admin-login__label">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`admin-login__input ${errors.password ? 'admin-login__input--error' : ''}`}
                placeholder="Введите пароль"
                disabled={isLoading}
              />
              {errors.password && (
                <span className="admin-login__error">{errors.password}</span>
              )}
            </div>

            <button
              type="submit"
              className="admin-login__submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

