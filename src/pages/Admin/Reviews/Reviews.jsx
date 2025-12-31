import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminReviewsAPI } from '../../../services/api';
import { ROUTES } from '../../../utils/constants';
import { getImageUrl } from '../../../utils/imageUtils';
import './Reviews.css';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  // Модальное окно отклонения
  const [rejectModal, setRejectModal] = useState({ isOpen: false, reviewId: null });
  const [rejectReason, setRejectReason] = useState('');
  
  // Просмотр фото
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Загрузка отзывов
  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const response = await adminReviewsAPI.getAll(params);
      setReviews(response.data.reviews);
      setTotalPages(response.data.totalPages);
      setStatusCounts(response.data.statusCounts);
    } catch (err) {
      console.error('Ошибка загрузки отзывов:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Поиск
  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  // Одобрить отзыв
  const handleApprove = async (id) => {
    try {
      await adminReviewsAPI.approve(id);
      loadReviews();
    } catch (err) {
      console.error('Ошибка одобрения отзыва:', err);
    }
  };

  // Открыть модалку отклонения
  const openRejectModal = (id) => {
    setRejectModal({ isOpen: true, reviewId: id });
    setRejectReason('');
  };

  // Отклонить отзыв
  const handleReject = async () => {
    if (!rejectModal.reviewId) return;
    try {
      await adminReviewsAPI.reject(rejectModal.reviewId, rejectReason);
      setRejectModal({ isOpen: false, reviewId: null });
      loadReviews();
    } catch (err) {
      console.error('Ошибка отклонения отзыва:', err);
    }
  };

  // Закрепить/открепить
  const handleTogglePin = async (id) => {
    try {
      await adminReviewsAPI.pin(id);
      loadReviews();
    } catch (err) {
      console.error('Ошибка закрепления отзыва:', err);
    }
  };

  // Удалить отзыв
  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить отзыв?')) return;
    try {
      await adminReviewsAPI.delete(id);
      loadReviews();
    } catch (err) {
      console.error('Ошибка удаления отзыва:', err);
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Статус бейдж
  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'На модерации', className: 'admin-reviews__status--pending' },
      approved: { label: 'Одобрен', className: 'admin-reviews__status--approved' },
      rejected: { label: 'Отклонён', className: 'admin-reviews__status--rejected' },
    };
    const { label, className } = statusMap[status] || statusMap.pending;
    return <span className={`admin-reviews__status ${className}`}>{label}</span>;
  };

  // Звёзды
  const renderStars = (rating) => {
    return (
      <span className="admin-reviews__stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'filled' : ''}>★</span>
        ))}
      </span>
    );
  };

  return (
    <div className="admin-reviews">
      <div className="admin-reviews__container">
        <div className="admin-reviews__header">
          <Link to={ROUTES.ADMIN_DASHBOARD} className="admin-reviews__back">
            ← Назад в админ-панель
          </Link>
          <h1 className="admin-reviews__title">Модерация отзывов</h1>
        </div>

        {/* Табы статусов */}
        <div className="admin-reviews__tabs">
          <button
            className={`admin-reviews__tab ${statusFilter === 'pending' ? 'admin-reviews__tab--active' : ''}`}
            onClick={() => { setStatusFilter('pending'); setPage(1); }}
          >
            На модерации ({statusCounts.pending})
          </button>
          <button
            className={`admin-reviews__tab ${statusFilter === 'approved' ? 'admin-reviews__tab--active' : ''}`}
            onClick={() => { setStatusFilter('approved'); setPage(1); }}
          >
            Одобренные ({statusCounts.approved})
          </button>
          <button
            className={`admin-reviews__tab ${statusFilter === 'rejected' ? 'admin-reviews__tab--active' : ''}`}
            onClick={() => { setStatusFilter('rejected'); setPage(1); }}
          >
            Отклонённые ({statusCounts.rejected})
          </button>
          <button
            className={`admin-reviews__tab ${statusFilter === '' ? 'admin-reviews__tab--active' : ''}`}
            onClick={() => { setStatusFilter(''); setPage(1); }}
          >
            Все
          </button>
        </div>

        {/* Поиск */}
        <form onSubmit={handleSearch} className="admin-reviews__search">
          <input
            type="text"
            placeholder="Поиск по тексту, автору или товару..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="admin-reviews__search-input"
          />
          <button type="submit" className="admin-reviews__search-btn">
            Найти
          </button>
        </form>

        {/* Список отзывов */}
        {isLoading ? (
          <div className="admin-reviews__loading">Загрузка...</div>
        ) : reviews.length === 0 ? (
          <div className="admin-reviews__empty">Отзывы не найдены</div>
        ) : (
          <div className="admin-reviews__list">
            {reviews.map((review) => (
              <div key={review.id} className={`admin-reviews__item ${review.isPinned ? 'admin-reviews__item--pinned' : ''}`}>
                <div className="admin-reviews__item-header">
                  <div className="admin-reviews__item-info">
                    {getStatusBadge(review.status)}
                    {review.isPinned && <span className="admin-reviews__pinned-badge">📌 Закреплён</span>}
                    <span className="admin-reviews__item-date">{formatDate(review.createdAt)}</span>
                  </div>
                  {renderStars(review.rating)}
                </div>

                {/* Товар */}
                {review.product && (
                  <div className="admin-reviews__product">
                    <img
                      src={review.product.image || '/placeholder.png'}
                      alt={review.product.name}
                      className="admin-reviews__product-image"
                    />
                    <span className="admin-reviews__product-name">{review.product.name}</span>
                  </div>
                )}

                {/* Автор */}
                {review.user && (
                  <div className="admin-reviews__author">
                    <strong>{review.user.firstName} {review.user.lastName}</strong>
                    <span className="admin-reviews__author-phone">{review.user.phone}</span>
                  </div>
                )}

                {/* Текст */}
                <p className="admin-reviews__text">{review.text}</p>

                {review.pros && (
                  <div className="admin-reviews__pros">
                    <strong>Достоинства:</strong> {review.pros}
                  </div>
                )}

                {review.cons && (
                  <div className="admin-reviews__cons">
                    <strong>Недостатки:</strong> {review.cons}
                  </div>
                )}

                {/* Фото */}
                {review.photos && review.photos.length > 0 && (
                  <div className="admin-reviews__photos">
                    {review.photos.map((photo, index) => {
                      const photoUrl = getImageUrl(photo);
                      return (
                        <img
                          key={index}
                          src={photoUrl}
                          alt={`Фото ${index + 1}`}
                          className="admin-reviews__photo"
                          onClick={() => setLightboxPhoto(photoUrl)}
                          onError={(e) => {
                            e.target.src = '/placeholder.png';
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Причина отклонения */}
                {review.status === 'rejected' && review.rejectReason && (
                  <div className="admin-reviews__reject-reason">
                    <strong>Причина отклонения:</strong> {review.rejectReason}
                  </div>
                )}

                {/* Действия */}
                <div className="admin-reviews__actions">
                  {review.status === 'pending' && (
                    <>
                      <button
                        className="admin-reviews__btn admin-reviews__btn--approve"
                        onClick={() => handleApprove(review.id)}
                      >
                        ✓ Одобрить
                      </button>
                      <button
                        className="admin-reviews__btn admin-reviews__btn--reject"
                        onClick={() => openRejectModal(review.id)}
                      >
                        ✕ Отклонить
                      </button>
                    </>
                  )}
                  {review.status === 'approved' && (
                    <button
                      className={`admin-reviews__btn ${review.isPinned ? 'admin-reviews__btn--unpin' : 'admin-reviews__btn--pin'}`}
                      onClick={() => handleTogglePin(review.id)}
                    >
                      {review.isPinned ? '📌 Открепить' : '📌 Закрепить'}
                    </button>
                  )}
                  <button
                    className="admin-reviews__btn admin-reviews__btn--delete"
                    onClick={() => handleDelete(review.id)}
                  >
                    🗑 Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="admin-reviews__pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              ← Назад
            </button>
            <span>Страница {page} из {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Вперёд →
            </button>
          </div>
        )}

        {/* Модалка отклонения */}
        {rejectModal.isOpen && (
          <div className="admin-reviews__modal-overlay" onClick={() => setRejectModal({ isOpen: false, reviewId: null })}>
            <div className="admin-reviews__modal" onClick={(e) => e.stopPropagation()}>
              <h3>Отклонить отзыв</h3>
              <textarea
                placeholder="Причина отклонения (необязательно)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
              <div className="admin-reviews__modal-actions">
                <button onClick={() => setRejectModal({ isOpen: false, reviewId: null })}>
                  Отмена
                </button>
                <button className="admin-reviews__btn--reject" onClick={handleReject}>
                  Отклонить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Лайтбокс */}
        {lightboxPhoto && (
          <div className="admin-reviews__lightbox" onClick={() => setLightboxPhoto(null)}>
            <img src={lightboxPhoto} alt="Фото отзыва" />
            <button 
              className="admin-reviews__lightbox-close"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxPhoto(null);
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;

