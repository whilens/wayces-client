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

  const [errors, setErrors] = useState({});

  // Редирект если уже авторизован
  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.ADMIN_DASHBOARD);
    }
  }, [isAuthenticated, navigate]);

  // Показываем ошибку через уведомление
  useEffect(() => {
    if (error) {
      const errorMessage = typeof error === 'object' ? error.error || error.message || 'Ошибка авторизации' : error;
      notification.error({
        message: 'Ошибка авторизации',
        description: errorMessage,
        placement: 'topRight',
      });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.login.trim()) {
      newErrors.login = 'Логин обязателен для заполнения';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Пароль обязателен для заполнения';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    dispatch(login(formData));
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

