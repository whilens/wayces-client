import React from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { logout } from '../../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../utils/constants';
import './Dashboard.css';

const AdminDashboard = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { admin } = useAppSelector((state) => state.auth as { admin?: { login?: string } | null });

  const handleLogout = async () => {
    await dispatch(logout());
    navigate(ROUTES.ADMIN_LOGIN);
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__container">
        <div className="admin-dashboard__header">
          <h1 className="admin-dashboard__title">Админ-панель</h1>
          <div className="admin-dashboard__user-info">
            <span className="admin-dashboard__user-name">Админ: {admin?.login}</span>
            <button className="admin-dashboard__logout-button" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </div>

        <div className="admin-dashboard__content">
          <div className="admin-dashboard__welcome">
            <h2>Добро пожаловать в админ-панель!</h2>
            <p>Здесь будет управление товарами, заказами и другими функциями.</p>
            <div className="admin-dashboard__links">
              <Link to={ROUTES.ADMIN_ORDERS} className="admin-dashboard__link">
                Заказы →
              </Link>
              <Link to={ROUTES.ADMIN_PRODUCTS} className="admin-dashboard__link">
                Товары →
              </Link>
              <Link to="/admin/reviews" className="admin-dashboard__link">
                Отзывы →
              </Link>
              <Link to={ROUTES.ADMIN_CATEGORIES} className="admin-dashboard__link">
                Категории →
              </Link>
            </div>
          </div>

          <div className="admin-dashboard__stats">
            <div className="admin-dashboard__stat-card">
              <h3 className="admin-dashboard__stat-title">Товары</h3>
              <p className="admin-dashboard__stat-value">-</p>
            </div>
            <div className="admin-dashboard__stat-card">
              <h3 className="admin-dashboard__stat-title">Заказы</h3>
              <p className="admin-dashboard__stat-value">-</p>
            </div>
            <div className="admin-dashboard__stat-card">
              <h3 className="admin-dashboard__stat-title">Пользователи</h3>
              <p className="admin-dashboard__stat-value">-</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

