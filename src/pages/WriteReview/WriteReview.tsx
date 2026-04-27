import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { openAuthModal } from '../../store/slices/userSlice';
import { productsAPI, reviewsAPI } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import './WriteReview.css';

type ReviewProduct = { id: number; name: string; basePrice?: number; defaultImage?: string };
type UserState = { isAuthenticated: boolean; user?: unknown; accessToken?: string | null };
type ApiErr = { response?: { data?: { error?: string }; status?: number }; message?: string };

const WriteReview = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, accessToken } = useAppSelector((state) => state.user as UserState);

  const [product, setProduct] = useState<ReviewProduct | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  
  // Форма
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Загрузка товара
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await productsAPI.getById(productId);
        setProduct(response.data);
      } catch (err) {
        setError('Товар не найден');
      } finally {
        setIsLoadingProduct(false);
      }
    };

    loadProduct();
  }, [productId]);

  // Проверка существующего отзыва (только для авторизованных пользователей)
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const checkExistingReview = async () => {
      try {
        const response = await reviewsAPI.checkReview(productId);
        if (response.data.hasReview) {
          setHasExistingReview(true);
        }
      } catch (err) {
        console.error('Ошибка проверки отзыва:', err);
      }
    };

    checkExistingReview();
  }, [isAuthenticated, productId, accessToken]);

  // Обработка выбора фото
  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      setError('Максимум 5 фотографий');
      return;
    }

    const validFiles = files.filter((f: File) => {
      if (!f.type.match(/image\/(jpeg|jpg|png|webp)/)) {
        setError('Разрешены только изображения (jpeg, jpg, png, webp)');
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        setError('Максимальный размер файла 5MB');
        return false;
      }
      return true;
    });

    setPhotos((prev) => [...prev, ...validFiles]);
    
    // Создаем превью
    validFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        const result = ev.target?.result;
        if (typeof result === 'string') {
          setPhotosPreviews((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Удаление фото
  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotosPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Отправка отзыва
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Поставьте оценку');
      return;
    }

    if (text.length < 10) {
      setError('Текст отзыва должен содержать минимум 10 символов');
      return;
    }

    if (text.length > 2000) {
      setError('Текст отзыва не должен превышать 2000 символов');
      return;
    }

    // Проверяем наличие токена
    const userAccessToken = localStorage.getItem('userAccessToken');
    if (!userAccessToken) {
      setError('Необходима авторизация. Пожалуйста, войдите снова.');
      dispatch(openAuthModal({ redirectTo: `/review/${productId}` }) as never);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('productId', String(productId || ''));
      formData.append('rating', rating.toString());
      formData.append('text', text);
      if (pros.trim()) formData.append('pros', pros.trim());
      if (cons.trim()) formData.append('cons', cons.trim());
      
      photos.forEach((photo: File) => {
        formData.append('photos', photo);
      });

      await reviewsAPI.create(formData);
      setSuccess(true);
    } catch (err: unknown) {
      const typed = err as ApiErr;
      const errorMessage = typed.response?.data?.error || typed.message || 'Ошибка отправки отзыва';
      setError(errorMessage);
      
      // Если ошибка авторизации, открываем модалку
      if (typed.response?.status === 401) {
        dispatch(openAuthModal({ redirectTo: `/review/${productId}` }) as never);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="write-review">
        <div className="write-review__container">
          <div className="write-review__loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="write-review">
        <div className="write-review__container">
          <div className="write-review__error-page">
            <h2>Товар не найден</h2>
            <Link to="/products" className="write-review__back-link">
              Вернуться в каталог
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="write-review">
        <div className="write-review__container">
          <div className="write-review__auth-required">
            <h2>Для написания отзыва необходимо авторизоваться</h2>
            <div className="write-review__auth-actions">
              <Link to={`/products/${productId}`} className="write-review__back-link">
                Назад к товару
              </Link>
              <button 
                className="write-review__auth-button"
                onClick={() =>
                  dispatch(openAuthModal({ redirectTo: `/review/${productId}` }) as never)
                }
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasExistingReview) {
    return (
      <div className="write-review">
        <div className="write-review__container">
          <div className="write-review__exists">
            <h2>Вы уже оставили отзыв на этот товар</h2>
            <p>Один пользователь может оставить только один отзыв на товар.</p>
            <Link to={`/products/${productId}`} className="write-review__back-link">
              Вернуться к товару
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="write-review">
        <div className="write-review__container">
          <div className="write-review__success">
            <div className="write-review__success-icon">✓</div>
            <h2>Спасибо за отзыв!</h2>
            <p>Ваш отзыв отправлен на модерацию и будет опубликован после проверки.</p>
            <Link to={`/products/${productId}`} className="write-review__back-link">
              Вернуться к товару
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="write-review">
      <div className="write-review__container">
        <h1 className="write-review__title">Написать отзыв</h1>
        
        {/* Информация о товаре */}
        <div className="write-review__product">
          <img
            src={getImageUrl(product.defaultImage || '') || '/placeholder.png'}
            alt={product.name}
            className="write-review__product-image"
          />
          <div className="write-review__product-info">
            <h3 className="write-review__product-name">{product.name}</h3>
            <p className="write-review__product-price">{product.basePrice?.toLocaleString()} ₽</p>
          </div>
        </div>

        {/* Форма отзыва */}
        <form onSubmit={handleSubmit} className="write-review__form">
          {/* Рейтинг */}
          <div className="write-review__field">
            <label className="write-review__label">Оценка *</label>
            <div className="write-review__stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`write-review__star ${
                    star <= (hoverRating || rating) ? 'write-review__star--active' : ''
                  }`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  ★
                </button>
              ))}
              {rating > 0 && (
                <span className="write-review__rating-text">
                  {['', 'Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично'][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Текст отзыва */}
          <div className="write-review__field">
            <label className="write-review__label">
              Отзыв * <span className="write-review__counter">{text.length}/2000</span>
            </label>
            <textarea
              className="write-review__textarea"
              placeholder="Расскажите о своем опыте использования товара (минимум 10 символов)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={2000}
            />
          </div>

          {/* Достоинства */}
          <div className="write-review__field">
            <label className="write-review__label">Достоинства</label>
            <textarea
              className="write-review__textarea write-review__textarea--small"
              placeholder="Что вам понравилось?"
              value={pros}
              onChange={(e) => setPros(e.target.value)}
              rows={2}
            />
          </div>

          {/* Недостатки */}
          <div className="write-review__field">
            <label className="write-review__label">Недостатки</label>
            <textarea
              className="write-review__textarea write-review__textarea--small"
              placeholder="Что можно улучшить?"
              value={cons}
              onChange={(e) => setCons(e.target.value)}
              rows={2}
            />
          </div>

          {/* Фото */}
          <div className="write-review__field">
            <label className="write-review__label">Фото (до 5 штук)</label>
            <div className="write-review__photos">
              {photosPreviews.map((preview, index) => (
                <div key={index} className="write-review__photo-item">
                  <img src={preview} alt={`Фото ${index + 1}`} />
                  <button
                    type="button"
                    className="write-review__photo-remove"
                    onClick={() => handleRemovePhoto(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="write-review__photo-add">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handlePhotosChange}
                    hidden
                  />
                  <span className="write-review__photo-add-icon">+</span>
                  <span className="write-review__photo-add-text">Добавить фото</span>
                </label>
              )}
            </div>
          </div>

          {error && <div className="write-review__error">{error}</div>}

          <div className="write-review__actions">
            <Link to={`/products/${productId}`} className="write-review__cancel">
              Отмена
            </Link>
            <button
              type="submit"
              className="write-review__submit"
              disabled={isSubmitting || rating === 0 || text.length < 10}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить отзыв'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WriteReview;

