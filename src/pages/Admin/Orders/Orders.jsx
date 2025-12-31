import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { ordersAPI } from '../../../services/api';
import { ROUTES, ORDER_STATUS_LABELS } from '../../../utils/constants';
import { formatPrice, formatDate } from '../../../utils/helpers';
import './Orders.css';

const AdminOrders = () => {
  const dispatch = useAppDispatch();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [page, sortBy, sortOrder, statusFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ordersAPI.getAll({
        page,
        limit: 20,
        sortBy,
        sortOrder,
        status: statusFilter || undefined,
      });
      setOrders(response.data.orders);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки заказов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      pending: 'admin-orders__status--pending',
      paid: 'admin-orders__status--paid',
      processing: 'admin-orders__status--processing',
      shipped: 'admin-orders__status--shipped',
      delivered: 'admin-orders__status--delivered',
      cancelled: 'admin-orders__status--cancelled',
    };
    return statusClasses[status] || '';
  };

  if (isLoading) {
    return (
      <div className="admin-orders">
        <div className="admin-orders__container">
          <p>Загрузка заказов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-orders">
        <div className="admin-orders__container">
          <p className="admin-orders__error">Ошибка: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-orders">
      <div className="admin-orders__container">
        <div className="admin-orders__header">
          <h1 className="admin-orders__title">Заказы</h1>
        </div>

        <div className="admin-orders__filters">
          <select
            className="admin-orders__filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Все статусы</option>
            <option value="pending">Новый</option>
            <option value="paid">Оплачен</option>
            <option value="processing">В обработке</option>
            <option value="shipped">Отправлен</option>
            <option value="delivered">Доставлен</option>
            <option value="cancelled">Отменён</option>
          </select>
        </div>

        <div className="admin-orders__table-wrapper">
          <table className="admin-orders__table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} className="admin-orders__sortable">
                  ID {sortBy === 'id' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('createdAt')} className="admin-orders__sortable">
                  Дата {sortBy === 'createdAt' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </th>
                <th>Клиент</th>
                <th>Телефон</th>
                <th onClick={() => handleSort('totalPrice')} className="admin-orders__sortable">
                  Сумма {sortBy === 'totalPrice' && (sortOrder === 'ASC' ? '↑' : '↓')}
                </th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="admin-orders__empty">
                    Заказы не найдены
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      {order.firstName} {order.lastName}
                    </td>
                    <td>{order.phone}</td>
                    <td>{formatPrice(order.totalPrice)}</td>
                    <td>
                      <span className={`admin-orders__status ${getStatusClass(order.status)}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="admin-orders__view-button"
                      >
                        Просмотр
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="admin-orders__pagination">
            <button
              className="admin-orders__pagination-button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Назад
            </button>
            <span className="admin-orders__pagination-info">
              Страница {page} из {totalPages}
            </span>
            <button
              className="admin-orders__pagination-button"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;

