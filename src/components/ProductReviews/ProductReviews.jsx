import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { openAuthModal } from '../../store/slices/userSlice';
import { reviewsAPI } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import './ProductReviews.css';

const ProductReviews = ({ productId, onStatsChange }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.user);

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Фильтры
  const [ratingFilter, setRatingFilter] = useState(null);
  const [withPhoto, setWithPhoto] = useState(false);
  const [sort, setSort] = useState('newest');

  // Просмотр фото
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Загрузка отзывов
  const loadReviews = useCallback(async (pageNum = 1, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = {
        page: pageNum,
        limit: 5,
        sort,
      };
      if (ratingFilter) params.rating = ratingFilter;
      if (withPhoto) params.withPhoto = 'true';

      const response = await reviewsAPI.getByProduct(productId, params);
      const data = response.data;

      if (append) {
        setReviews(prev => [...prev, ...data.reviews]);
      } else {
        setReviews(data.reviews);
        setStats(data.stats);
        // Передаем статистику в родительский компонент
        if (onStatsChange) {
          onStatsChange(data.stats);
        }
      }
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Ошибка загрузки отзывов:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [productId, ratingFilter, withPhoto, sort]);

  // Первоначальная загрузка
  useEffect(() => {
    setPage(1);
    loadReviews(1, false);
  }, [loadReviews]);

  // Загрузить ещё
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadReviews(nextPage, true);
  };

  // Обработка клика "Написать отзыв"
  const handleWriteReview = () => {
    if (!isAuthenticated) {
      dispatch(openAuthModal({ redirectTo: `/review/${productId}` }));
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Отрисовка звёзд
  const renderStars = (rating) => {
    return (
      <span className="product-reviews__stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`product-reviews__star ${star <= rating ? 'product-reviews__star--filled' : ''}`}
          >
            ★
          </span>
        ))}
      </span>
    );
  };

  // Процент от максимума
  const getPercentage = (count) => {
    if (stats.totalReviews === 0) return 0;
    return (count / stats.totalReviews) * 100;
  };

  return (
    <div className="product-reviews">
      <div className="product-reviews__header">
        <h2 className="product-reviews__title">
          Отзывы
          {stats.totalReviews > 0 && (
            <span className="product-reviews__count">({stats.totalReviews})</span>
          )}
        </h2>
        {isAuthenticated ? (
          <Link to={`/review/${productId}`} className="product-reviews__write-btn">
            Написать отзыв
          </Link>
        ) : (
          <button onClick={handleWriteReview} className="product-reviews__write-btn">
            Написать отзыв
          </button>
        )}
      </div>

      {/* Статистика рейтинга */}
      {stats.totalReviews > 0 && (
        <div className="product-reviews__stats">
          <div className="product-reviews__average">
            <span className="product-reviews__average-value">{stats.averageRating.toFixed(1)}</span>
            {renderStars(Math.round(stats.averageRating))}
            <span className="product-reviews__average-count">
              {stats.totalReviews} {getReviewWord(stats.totalReviews)}
            </span>
          </div>
          <div className="product-reviews__breakdown">
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                className={`product-reviews__breakdown-row ${ratingFilter === rating ? 'product-reviews__breakdown-row--active' : ''}`}
                onClick={() => setRatingFilter(ratingFilter === rating ? null : rating)}
              >
                <span className="product-reviews__breakdown-stars">{rating}★</span>
                <div className="product-reviews__breakdown-bar">
                  <div
                    className="product-reviews__breakdown-fill"
                    style={{ width: `${getPercentage(stats.ratingBreakdown[rating])}%` }}
                  />
                </div>
                <span className="product-reviews__breakdown-count">
                  {stats.ratingBreakdown[rating]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Фильтры */}
      {stats.totalReviews > 0 && (
        <div className="product-reviews__filters">
          <label className="product-reviews__filter-checkbox">
            <input
              type="checkbox"
              checked={withPhoto}
              onChange={(e) => setWithPhoto(e.target.checked)}
            />
            <span>С фото</span>
          </label>
          <select
            className="product-reviews__filter-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
            <option value="highest">Сначала положительные</option>
            <option value="lowest">Сначала отрицательные</option>
          </select>
        </div>
      )}

      {/* Список отзывов */}
      {isLoading ? (
        <div className="product-reviews__loading">Загрузка отзывов...</div>
      ) : reviews.length === 0 ? (
        <div className="product-reviews__empty">
          <p>Отзывов пока нет</p>
          <p>Будьте первым, кто оставит отзыв на этот товар!</p>
        </div>
      ) : (
        <div className="product-reviews__list">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`product-reviews__item ${review.isPinned ? 'product-reviews__item--pinned' : ''}`}
            >
              {review.isPinned && (
                <span className="product-reviews__pinned-badge">Закреплённый отзыв</span>
              )}
              <div className="product-reviews__item-header">
                <div className="product-reviews__item-author">
                  <div className="product-reviews__item-author-info">
                    {review.user.avatar ? (
                      <img
                        src={getImageUrl(review.user.avatar)}
                        alt={`${review.user.firstName} ${review.user.lastName}`}
                        className="product-reviews__item-avatar"
                        onError={(e) => {
                          e.target.src = '/placeholder-avatar.png';
                        }}
                      />
                    ) : (
                      <div className="product-reviews__item-avatar product-reviews__item-avatar--placeholder">
                        {review.user.firstName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="product-reviews__item-author-text">
                      <span className="product-reviews__item-name">
                        {review.user.firstName} {review.user.lastName}
                      </span>
                      <span className="product-reviews__item-date">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                {renderStars(review.rating)}
              </div>

              <p className="product-reviews__item-text">{review.text}</p>

              {review.pros && (
                <div className="product-reviews__item-pros">
                  <span className="product-reviews__item-pros-label">Достоинства:</span>
                  {review.pros}
                </div>
              )}

              {review.cons && (
                <div className="product-reviews__item-cons">
                  <span className="product-reviews__item-cons-label">Недостатки:</span>
                  {review.cons}
                </div>
              )}

              {review.photos && review.photos.length > 0 && (
                <div className="product-reviews__item-photos">
                  {review.photos.map((photo, index) => {
                    const photoUrl = getImageUrl(photo);
                    return (
                      <img
                        key={index}
                        src={photoUrl}
                        alt={`Фото ${index + 1}`}
                        className="product-reviews__item-photo"
                        onClick={() => setLightboxPhoto(photoUrl)}
                        onError={(e) => {
                          e.target.src = '/placeholder.png';
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Загрузить ещё */}
      {hasMore && !isLoading && (
        <button
          className="product-reviews__load-more"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? 'Загрузка...' : 'Показать ещё'}
        </button>
      )}

      {/* Лайтбокс для фото */}
      {lightboxPhoto && (
        <div className="product-reviews__lightbox" onClick={() => setLightboxPhoto(null)}>
          <img src={lightboxPhoto} alt="Фото отзыва" />
          <button 
            className="product-reviews__lightbox-close"
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
  );
};

// Склонение слова "отзыв"
function getReviewWord(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'отзывов';
  }
  if (lastDigit === 1) {
    return 'отзыв';
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'отзыва';
  }
  return 'отзывов';
}

export default ProductReviews;

