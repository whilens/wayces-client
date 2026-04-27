import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { logoutUser } from '../../store/slices/userSlice';
import { fetchFavorites } from '../../store/slices/favoritesSlice';
import { accountAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';
import { useAsyncDataLoader } from '../../hooks/useAsyncDataLoader';
import { buildFormData } from '../../utils/formDataBuilder';
import { getImageUrl } from '../../utils/imageUtils';
import { notification, Checkbox } from 'antd';
import { pushSubscriptionsAPI } from '../../services/api';
import './Account.css';

type ProfileState = { firstName: string; lastName: string; email: string; avatar: string | null };
type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type ReviewStatus = 'pending' | 'approved' | 'rejected';
type AccountOrderItem = {
  id: number;
  productImage?: string;
  productName: string;
  variantString?: string;
  quantity: number;
  productPrice: number;
};
type AccountOrder = {
  id: number;
  createdAt: string;
  status: OrderStatus;
  totalPrice: number;
  items: AccountOrderItem[];
};
type AccountReview = {
  id: number;
  rating: number;
  status: ReviewStatus;
  createdAt: string;
  text: string;
  rejectReason?: string;
  product?: { image?: string; name: string };
};
type FavoriteItem = { id: number; productId: number; product?: { defaultImage?: string; name?: string; basePrice?: number } };
type StatisticsData = { totalSpent: number; totalOrders: number; averageOrder: number; totalReviews: number; totalFavorites: number };
type UserState = { isAuthenticated: boolean; user?: { phone?: string } | null };
type FavState = { items: FavoriteItem[] };

const getErr = (err: unknown, fallback: string): string => {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { error?: string } } };
    return e.response?.data?.error || fallback;
  }
  return fallback;
};

const Account = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.user as UserState);
  const { items: favoriteItems } = useAppSelector((state) => state.favorites as FavState);

  const [activeSection, setActiveSection] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);

  // Профиль
  const [profile, setProfile] = useState<ProfileState>({
    firstName: '',
    lastName: '',
    email: '',
    avatar: null,
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Заказы
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    load: loadOrders,
  } = useAsyncDataLoader(() => accountAPI.getOrders(), [isAuthenticated]);

  const orders: AccountOrder[] = (ordersData as { orders?: AccountOrder[] } | null)?.orders || [];

  // Отзывы
  const {
    data: reviewsData,
    isLoading: isLoadingReviews,
    load: loadReviews,
  } = useAsyncDataLoader(() => accountAPI.getReviews(), [isAuthenticated]);

  const reviews: AccountReview[] = (reviewsData as { reviews?: AccountReview[] } | null)?.reviews || [];

  // Статистика
  const {
    data: statisticsData,
    isLoading: isLoadingStats,
    load: loadStatistics,
  } = useAsyncDataLoader(() => accountAPI.getStatistics(), [isAuthenticated]);

  const statistics: StatisticsData = (statisticsData as StatisticsData | null) || {
    totalSpent: 0,
    totalOrders: 0,
    averageOrder: 0,
    totalReviews: 0,
    totalFavorites: 0,
  };

  // Избранное
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

  // Заявка на отмену
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; orderId: number | null }>({ isOpen: false, orderId: null });
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Push-уведомления
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isLoadingPushStatus, setIsLoadingPushStatus] = useState(false);
  const [isTogglingPush, setIsTogglingPush] = useState(false);

  // Загрузка данных профиля
  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadFavorites();
      loadPushSubscriptionStatus();
      // loadStatistics, loadOrders, loadReviews вызываются автоматически через useAsyncDataLoader
    }
  }, [isAuthenticated]);

  const loadProfile = async () => {
    try {
      const response = await accountAPI.getProfile();
      const userData = response.data.user;
      setProfile({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        avatar: userData.avatar || null,
      });
      setAvatarPreview(userData.avatar || null);
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
    } finally {
      setIsLoading(false);
    }
  };


  const loadFavorites = async () => {
    setIsLoadingFavorites(true);
    try {
      await dispatch(fetchFavorites()).unwrap();
    } catch (err) {
      console.error('Ошибка загрузки избранного:', err);
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  // Загрузка статуса push-подписки
  const loadPushSubscriptionStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushEnabled(false);
      return;
    }

    setIsLoadingPushStatus(true);
    try {
      // Сначала проверяем локально, есть ли активная подписка
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        setPushEnabled(false);
        return;
      }

      // Если есть локальная подписка, проверяем статус на сервере
      const response = await pushSubscriptionsAPI.getSubscriptionStatus();
      setPushEnabled(response.data.isSubscribed || false);
    } catch (err) {
      console.error('Ошибка загрузки статуса push-подписки:', err);
      // Проверяем локально, есть ли подписка
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setPushEnabled(!!subscription);
      } catch (error) {
        setPushEnabled(false);
      }
    } finally {
      setIsLoadingPushStatus(false);
    }
  };

  // Переключение push-уведомлений
  const handlePushToggle = async (checked: boolean) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      notification.warning({
        message: 'Не поддерживается',
        description: 'Ваш браузер не поддерживает push-уведомления',
        placement: 'topRight',
      });
      return;
    }

    setIsTogglingPush(true);
    try {
      if (checked) {
        // Включаем push-уведомления
        await enablePushNotifications();
      } else {
        // Выключаем push-уведомления
        await disablePushNotifications();
      }
      setPushEnabled(checked);
    } catch (error) {
      console.error('Ошибка переключения push-уведомлений:', error);
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось изменить настройки уведомлений',
        placement: 'topRight',
      });
      // Возвращаем предыдущее состояние
      setPushEnabled(!checked);
    } finally {
      setIsTogglingPush(false);
    }
  };

  // Включение push-уведомлений
  const enablePushNotifications = async () => {
    // Загружаем VAPID ключ
    const response = await pushSubscriptionsAPI.getVapidPublicKey();
    const vapidPublicKey = response.data.publicKey;

    if (!vapidPublicKey) {
      throw new Error('VAPID ключ не настроен');
    }

    // Запрашиваем разрешение
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Разрешение на уведомления не получено');
    }

    // Создаем подписку
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Сохраняем подписку на сервере
    await pushSubscriptionsAPI.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth')),
      },
      userAgent: navigator.userAgent,
    });

    notification.success({
      message: 'Уведомления включены',
      description: 'Вы будете получать уведомления о новых товарах и скидках',
      placement: 'topRight',
    });
  };

  // Выключение push-уведомлений
  const disablePushNotifications = async () => {
    try {
      // Получаем текущую подписку
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Получаем ID подписки с сервера
        const response = await pushSubscriptionsAPI.getSubscriptions();
        const subscriptions = response.data.subscriptions || [];

        // Отписываемся от push
        await subscription.unsubscribe();

        // Удаляем подписку с сервера
        if (subscriptions.length > 0) {
          for (const sub of subscriptions) {
            if (sub.endpoint === subscription.endpoint) {
              await pushSubscriptionsAPI.unsubscribe(sub.id);
              break;
            }
          }
        }
      }

      notification.success({
        message: 'Уведомления выключены',
        placement: 'topRight',
      });
    } catch (error) {
      console.error('Ошибка отписки:', error);
      throw error;
    }
  };

  // Вспомогательные функции для конвертации ключей
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer | null) {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Сохранение профиля
  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const avatarInput = document.getElementById('avatar-input') as HTMLInputElement | null;
      const avatarFile = avatarInput?.files?.[0];
      
      const formData = buildFormData(
        {
          firstName: profile.firstName,
          lastName: profile.lastName,
          ...(profile.email && { email: profile.email }),
        },
        avatarFile ? { avatar: avatarFile } : {}
      );

      const response = await accountAPI.updateProfile(formData);
      setProfile(response.data.user);
      setAvatarPreview(response.data.user.avatar);
      
      notification.success({
        message: 'Профиль обновлен',
        placement: 'topRight',
      });
    } catch (err: unknown) {
      notification.error({
        message: 'Ошибка',
        description: getErr(err, 'Не удалось обновить профиль'),
        placement: 'topRight',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Обработка аватара
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const result = event.target?.result;
        setAvatarPreview(typeof result === 'string' ? result : null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Заявка на отмену заказа
  const handleCancelOrder = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 10) {
      notification.error({
        message: 'Ошибка',
        description: 'Причина отмены должна содержать минимум 10 символов',
        placement: 'topRight',
      });
      return;
    }

    setIsSubmittingCancel(true);
    try {
      await accountAPI.cancelOrder(cancelModal.orderId, cancelReason);
      notification.success({
        message: 'Заявка подана',
        description: 'Ваша заявка на отмену заказа отправлена на рассмотрение',
        placement: 'topRight',
      });
      setCancelModal({ isOpen: false, orderId: null });
      setCancelReason('');
      loadOrders();
    } catch (err: unknown) {
      notification.error({
        message: 'Ошибка',
        description: getErr(err, 'Не удалось подать заявку'),
        placement: 'topRight',
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Выход
  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Статус заказа
  const getStatusLabel = (status: OrderStatus) => {
    const statusMap = {
      pending: 'Новый',
      paid: 'Оплачен',
      processing: 'В обработке',
      shipped: 'Отправлен',
      delivered: 'Доставлен',
      cancelled: 'Отменен',
    };
    return statusMap[status] || status;
  };

  // Статус отзыва
  const getReviewStatusLabel = (status: ReviewStatus) => {
    const statusMap = {
      pending: 'На модерации',
      approved: 'Одобрен',
      rejected: 'Отклонен',
    };
    return statusMap[status] || status;
  };

  if (isLoading) {
    return (
      <div className="account">
        <div className="account__container">
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account">
      <div className="account__container">
        <h1 className="account__title">Личный кабинет</h1>

        <div className="account__content">
          {/* Боковое меню */}
          <div className="account__sidebar">
            <button
              className={`account__menu-item ${activeSection === 'profile' ? 'account__menu-item--active' : ''}`}
              onClick={() => setActiveSection('profile')}
            >
              Профиль
            </button>
            <button
              className={`account__menu-item ${activeSection === 'orders' ? 'account__menu-item--active' : ''}`}
              onClick={() => setActiveSection('orders')}
            >
              Заказы ({orders.length})
            </button>
            <button
              className={`account__menu-item ${activeSection === 'reviews' ? 'account__menu-item--active' : ''}`}
              onClick={() => setActiveSection('reviews')}
            >
              Отзывы ({reviews.length})
            </button>
            <button
              className={`account__menu-item ${activeSection === 'favorites' ? 'account__menu-item--active' : ''}`}
              onClick={() => setActiveSection('favorites')}
            >
              Избранное ({favoriteItems.length})
            </button>
            <button
              className={`account__menu-item ${activeSection === 'statistics' ? 'account__menu-item--active' : ''}`}
              onClick={() => setActiveSection('statistics')}
            >
              Статистика
            </button>
            <button
              className="account__menu-item account__menu-item--logout"
              onClick={handleLogout}
            >
              Выйти
            </button>
          </div>

          {/* Основной контент */}
          <div className="account__main">
            {/* Секция: Профиль */}
            {activeSection === 'profile' && (
              <div className="account__section">
                <h2 className="account__section-title">Профиль</h2>
                <form onSubmit={handleSaveProfile} className="account__profile-form">
                  <div className="account__avatar-section">
                    <div className="account__avatar-wrapper">
                      <img
                        src={avatarPreview || '/placeholder-avatar.png'}
                        alt="Аватар"
                        className="account__avatar"
                      />
                      <label htmlFor="avatar-input" className="account__avatar-upload">
                        Изменить фото
                      </label>
                      <input
                        id="avatar-input"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleAvatarChange}
                        hidden
                      />
                    </div>
                  </div>

                  <div className="account__form-row">
                    <div className="account__form-group">
                      <label className="account__label">Имя</label>
                      <input
                        type="text"
                        className="account__input"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </div>
                    <div className="account__form-group">
                      <label className="account__label">Фамилия</label>
                      <input
                        type="text"
                        className="account__input"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="account__form-group">
                    <label className="account__label">Email</label>
                    <input
                      type="email"
                      className="account__input"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>

                  <div className="account__form-group">
                    <label className="account__label">Телефон</label>
                    <input
                      type="text"
                      className="account__input"
                      value={user?.phone || ''}
                      disabled
                    />
                    <p className="account__hint">Телефон нельзя изменить</p>
                  </div>

                  <div className="account__form-group">
                    <Checkbox
                      checked={pushEnabled}
                      onChange={(e) => handlePushToggle(e.target.checked)}
                      disabled={isTogglingPush || isLoadingPushStatus || !('serviceWorker' in navigator) || !('PushManager' in window)}
                    >
                      Получать push-уведомления о новых товарах и скидках
                    </Checkbox>
                    {isTogglingPush && (
                      <p className="account__hint" style={{ marginTop: '0.5rem' }}>
                        Обновление настроек...
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="account__save-button"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </form>
              </div>
            )}

            {/* Секция: Статистика */}
            {activeSection === 'statistics' && (
              <div className="account__section">
                <h2 className="account__section-title">Статистика</h2>
                {isLoadingStats ? (
                  <p>Загрузка...</p>
                ) : (
                  <div className="account__stats-grid">
                    <div className="account__stat-card">
                      <div className="account__stat-value">{formatPrice(statistics.totalSpent)}</div>
                      <div className="account__stat-label">Общая сумма покупок</div>
                    </div>
                    <div className="account__stat-card">
                      <div className="account__stat-value">{statistics.totalOrders}</div>
                      <div className="account__stat-label">Количество заказов</div>
                    </div>
                    <div className="account__stat-card">
                      <div className="account__stat-value">{formatPrice(statistics.averageOrder)}</div>
                      <div className="account__stat-label">Средний чек</div>
                    </div>
                    <div className="account__stat-card">
                      <div className="account__stat-value">{statistics.totalReviews}</div>
                      <div className="account__stat-label">Одобренных отзывов</div>
                    </div>
                    <div className="account__stat-card">
                      <div className="account__stat-value">{statistics.totalFavorites}</div>
                      <div className="account__stat-label">Товаров в избранном</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Секция: Заказы */}
            {activeSection === 'orders' && (
              <div className="account__section">
                <h2 className="account__section-title">Мои заказы</h2>
                {isLoadingOrders ? (
                  <p>Загрузка заказов...</p>
                ) : orders.length === 0 ? (
                  <p className="account__empty">У вас пока нет заказов</p>
                ) : (
                  <div className="account__orders-list">
                    {orders.map((order) => (
                      <div key={order.id} className="account__order-item">
                        <div className="account__order-header">
                          <div>
                            <span className="account__order-number">Заказ #{order.id}</span>
                            <span className="account__order-date">{formatDate(order.createdAt)}</span>
                          </div>
                          <div>
                            <span className={`account__order-status account__order-status--${order.status}`}>
                              {getStatusLabel(order.status)}
                            </span>
                            <span className="account__order-total">{formatPrice(order.totalPrice)}</span>
                          </div>
                        </div>
                        <div className="account__order-items">
                          {order.items.map((item) => (
                            <div key={item.id} className="account__order-item-product">
                              <img
                                src={item.productImage ? getImageUrl(item.productImage) : '/placeholder.png'}
                                alt={item.productName}
                                className="account__order-item-image"
                              />
                              <div className="account__order-item-info">
                                <span className="account__order-item-name">{item.productName}</span>
                                {item.variantString && (
                                  <span className="account__order-item-variant">{item.variantString}</span>
                                )}
                                <span className="account__order-item-quantity">× {item.quantity}</span>
                              </div>
                              <span className="account__order-item-price">
                                {formatPrice(item.productPrice * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {order.status === 'pending' && (
                          <button
                            className="account__order-cancel-button"
                            onClick={() => setCancelModal({ isOpen: true, orderId: order.id })}
                          >
                            Подать заявку на отмену
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Секция: Отзывы */}
            {activeSection === 'reviews' && (
              <div className="account__section">
                <h2 className="account__section-title">Мои отзывы</h2>
                {isLoadingReviews ? (
                  <p>Загрузка отзывов...</p>
                ) : reviews.length === 0 ? (
                  <p className="account__empty">У вас пока нет отзывов</p>
                ) : (
                  <div className="account__reviews-list">
                    {reviews.map((review) => (
                      <div key={review.id} className="account__review-item">
                        <div className="account__review-header">
                          {review.product && (
                            <div className="account__review-product">
                              <img
                                src={review.product.image || '/placeholder.png'}
                                alt={review.product.name}
                                className="account__review-product-image"
                              />
                              <span className="account__review-product-name">{review.product.name}</span>
                            </div>
                          )}
                          <div className="account__review-meta">
                            <span className="account__review-rating">
                              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                            </span>
                            <span className={`account__review-status account__review-status--${review.status}`}>
                              {getReviewStatusLabel(review.status)}
                            </span>
                            <span className="account__review-date">{formatDate(review.createdAt)}</span>
                          </div>
                        </div>
                        <p className="account__review-text">{review.text}</p>
                        {review.rejectReason && (
                          <p className="account__review-reject-reason">
                            <strong>Причина отклонения:</strong> {review.rejectReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Секция: Избранное */}
            {activeSection === 'favorites' && (
              <div className="account__section">
                <h2 className="account__section-title">Избранное</h2>
                {isLoadingFavorites ? (
                  <p>Загрузка избранного...</p>
                ) : favoriteItems.length === 0 ? (
                  <p className="account__empty">В избранном пока ничего нет</p>
                ) : (
                  <div className="account__favorites-list">
                    {favoriteItems.map((fav) => (
                      <div key={fav.id} className="account__favorite-item">
                        <img
                          src={
                            fav.product?.defaultImage
                              ? getImageUrl(fav.product.defaultImage)
                              : '/placeholder.png'
                          }
                          alt={fav.product?.name}
                          className="account__favorite-image"
                        />
                        <div className="account__favorite-info">
                          <h3 className="account__favorite-name">{fav.product?.name}</h3>
                          <p className="account__favorite-price">
                            {fav.product ? formatPrice(fav.product.basePrice || 0) : ''}
                          </p>
                        </div>
                        <div className="account__favorite-actions">
                          <button
                            className="account__favorite-button"
                            onClick={() => navigate(`/products/${fav.productId}`)}
                          >
                            Открыть
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Модальное окно отмены заказа */}
        {cancelModal.isOpen && (
          <div className="account__modal-overlay" onClick={() => setCancelModal({ isOpen: false, orderId: null })}>
            <div className="account__modal" onClick={(e) => e.stopPropagation()}>
              <h3>Заявка на отмену заказа</h3>
              <p>Укажите причину отмены заказа #{cancelModal.orderId}</p>
              <textarea
                className="account__modal-textarea"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Причина отмены (минимум 10 символов)"
                rows={4}
              />
              <div className="account__modal-actions">
                <button
                  onClick={() => setCancelModal({ isOpen: false, orderId: null })}
                  className="account__modal-button account__modal-button--cancel"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={isSubmittingCancel || cancelReason.trim().length < 10}
                  className="account__modal-button account__modal-button--submit"
                >
                  {isSubmittingCancel ? 'Отправка...' : 'Подать заявку'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;

