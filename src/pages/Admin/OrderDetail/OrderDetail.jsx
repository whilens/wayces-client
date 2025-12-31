import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../../services/api';
import { ROUTES, ORDER_STATUS, ORDER_STATUS_LABELS } from '../../../utils/constants';
import { formatPrice, formatDate } from '../../../utils/helpers';
import { getImageUrl } from '../../../utils/imageUtils';
import { notification } from 'antd';
import './OrderDetail.css';

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ordersAPI.getById(id);
      setOrder(response.data);
    } catch (err) {
      console.error('Ошибка загрузки заказа:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки заказа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setIsUpdating(true);
      await ordersAPI.updateStatus(id, newStatus);
      setOrder((prev) => ({ ...prev, status: newStatus }));
      notification.success({
        message: 'Статус обновлен',
        description: `Статус заказа изменен на "${ORDER_STATUS_LABELS[newStatus]}"`,
        placement: 'topRight',
      });
    } catch (err) {
      console.error('Ошибка обновления статуса:', err);
      notification.error({
        message: 'Ошибка',
        description: err.response?.data?.error || 'Не удалось обновить статус',
        placement: 'topRight',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      pending: 'admin-order-detail__status--pending',
      paid: 'admin-order-detail__status--paid',
      processing: 'admin-order-detail__status--processing',
      shipped: 'admin-order-detail__status--shipped',
      delivered: 'admin-order-detail__status--delivered',
      cancelled: 'admin-order-detail__status--cancelled',
    };
    return statusClasses[status] || '';
  };

  if (isLoading) {
    return (
      <div className="admin-order-detail">
        <div className="admin-order-detail__container">
          <p>Загрузка заказа...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="admin-order-detail">
        <div className="admin-order-detail__container">
          <p className="admin-order-detail__error">Ошибка: {error || 'Заказ не найден'}</p>
          <button onClick={() => navigate(ROUTES.ADMIN_ORDERS)}>Вернуться к списку</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-order-detail">
      <div className="admin-order-detail__container">
        <div className="admin-order-detail__header">
          <button
            className="admin-order-detail__back-button"
            onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
          >
            ← Назад к заказам
          </button>
          <h1 className="admin-order-detail__title">Заказ #{order.id}</h1>
        </div>

        <div className="admin-order-detail__content">
          <div className="admin-order-detail__section">
            <h2 className="admin-order-detail__section-title">Информация о заказе</h2>
            <div className="admin-order-detail__info-grid">
              <div className="admin-order-detail__info-item">
                <span className="admin-order-detail__info-label">Дата создания:</span>
                <span className="admin-order-detail__info-value">{formatDate(order.createdAt)}</span>
              </div>
              <div className="admin-order-detail__info-item">
                <span className="admin-order-detail__info-label">Статус:</span>
                <span className={`admin-order-detail__status ${getStatusClass(order.status)}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="admin-order-detail__info-item">
                <span className="admin-order-detail__info-label">Сумма:</span>
                <span className="admin-order-detail__info-value admin-order-detail__info-value--price">
                  {formatPrice(order.totalPrice)}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-order-detail__section">
            <h2 className="admin-order-detail__section-title">Контактная информация</h2>
            <div className="admin-order-detail__info-grid">
              <div className="admin-order-detail__info-item">
                <span className="admin-order-detail__info-label">Имя:</span>
                <span className="admin-order-detail__info-value">
                  {order.firstName} {order.lastName}
                </span>
              </div>
              <div className="admin-order-detail__info-item">
                <span className="admin-order-detail__info-label">Телефон:</span>
                <span className="admin-order-detail__info-value">{order.phone}</span>
              </div>
              <div className="admin-order-detail__info-item">
                <span className="admin-order-detail__info-label">Email:</span>
                <span className="admin-order-detail__info-value">{order.email}</span>
              </div>
            </div>
          </div>

          <div className="admin-order-detail__section">
            <h2 className="admin-order-detail__section-title">Адрес доставки</h2>
            <div className="admin-order-detail__info-item">
              <span className="admin-order-detail__info-value">
                {order.city}, {order.street}, д. {order.house}, кв. {order.apartment}
              </span>
            </div>
          </div>

          {order.comment && (
            <div className="admin-order-detail__section">
              <h2 className="admin-order-detail__section-title">Комментарий</h2>
              <p className="admin-order-detail__comment">{order.comment}</p>
            </div>
          )}

          <div className="admin-order-detail__section">
            <h2 className="admin-order-detail__section-title">Товары</h2>
            <div className="admin-order-detail__items">
              {order.items && order.items.length > 0 ? (
                order.items.map((item) => (
                  <div key={item.id} className="admin-order-detail__item">
                    <div className="admin-order-detail__item-image">
                      {item.productImage && (
                        <img src={getImageUrl(item.productImage)} alt={item.productName} />
                      )}
                    </div>
                    <div className="admin-order-detail__item-info">
                      <h3 className="admin-order-detail__item-name">
                        {item.productName}
                        {item.variantString && (
                          <span className="admin-order-detail__item-variant">
                            {' '}
                            {item.variantString}
                          </span>
                        )}
                      </h3>
                      <p className="admin-order-detail__item-quantity">
                        Количество: {item.quantity}
                      </p>
                    </div>
                    <div className="admin-order-detail__item-price">
                      {formatPrice(item.productPrice * item.quantity)}
                    </div>
                  </div>
                ))
              ) : (
                <p>Товары не найдены</p>
              )}
            </div>
          </div>

          <div className="admin-order-detail__section">
            <h2 className="admin-order-detail__section-title">Изменение статуса</h2>
            <div className="admin-order-detail__status-buttons">
              {Object.entries(ORDER_STATUS).map(([key, value]) => (
                <button
                  key={key}
                  className={`admin-order-detail__status-button ${
                    order.status === value ? 'admin-order-detail__status-button--active' : ''
                  }`}
                  onClick={() => handleStatusChange(value)}
                  disabled={isUpdating || order.status === value}
                >
                  {ORDER_STATUS_LABELS[value]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;

