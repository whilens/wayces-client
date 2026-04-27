import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { store } from '../store/store';
import { setAccessToken, setAdmin } from '../store/slices/authSlice';
import { setUserAccessToken } from '../store/slices/userSlice';

// Базовый URL API: в dev через Vite proxy задаётся VITE_API_URL=/api; в проде — относительный путь на тот же домен (не хардкодить localhost)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Создаем экземпляр axios с базовой конфигурацией
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Отправляем cookies для всех запросов
  headers: {
    'Content-Type': 'application/json',
  },
});

type Id = number | string | null | undefined;
type QueryParams = Record<string, string | number | boolean | null | undefined>;
type AuthCredentials = { login: string; password: string };
type UserCodePayload = { phone?: string } | string;
type ReviewRejectReason = string;
type ChatConsultBody = Record<string, unknown>;
type PushSubscriptionPayload = Record<string, unknown>;

// Interceptor для запросов - добавляем access token авторизации
api.interceptors.request.use(
  (config) => {
    // Не перезаписываем Content-Type для FormData - axios установит его автоматически с boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    // Версия фронта (из билда) — для проверки на сервере и автообновления
    const frontVersion = import.meta.env.VITE_FRONTEND_VERSION;
    if (frontVersion) config.headers['X-Client-Version'] = frontVersion;

    // Для админских запросов используем accessToken
    if (config.url?.startsWith('/admin/') || config.url?.startsWith('/auth/')) {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } else {
      // Для пользовательских запросов (отзывы, user-auth) используем userAccessToken
      const userAccessToken = localStorage.getItem('userAccessToken');
      if (userAccessToken) {
        config.headers.Authorization = `Bearer ${userAccessToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для ответов - обработка ошибок и автообновление токенов
api.interceptors.response.use(
  (response) => {
    // Проверяем, есть ли новый access token в заголовке ответа
    // Axios может вернуть заголовки в разных регистрах
    const newAccessToken = response.headers['x-new-access-token'] || 
                          response.headers['X-New-Access-Token'] ||
                          response.headers['X-NEW-ACCESS-TOKEN'];
    if (newAccessToken) {
      localStorage.setItem('accessToken', newAccessToken);
      store.dispatch(setAccessToken(newAccessToken));
      console.log('✅ Access token обновлен автоматически');
    }
    return response;
  },
  async (error: AxiosError & { config: AxiosRequestConfig & { _retry?: boolean } }) => {
    const originalRequest = error.config;

    // Устаревшая версия приложения — перезагружаем страницу
    if (error.response?.status === 426) {
      const newVersion = error.response?.headers?.['x-new-version'];
      if (newVersion) localStorage.setItem('appVersion', newVersion);
      setTimeout(() => window.location.reload(), 800);
      return Promise.reject(error);
    }

    // Исключаем запросы на логин и refresh из обработки 401
    const isAuthRequest = originalRequest?.url?.includes('/auth/login') || 
                          originalRequest?.url?.includes('/auth/refresh') ||
                          originalRequest?.url?.includes('/user-auth/');

    // Если ошибка 401 и это не повторный запрос и не запрос на авторизацию
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      // Определяем, какой тип токена нужен (admin или user)
      const isAdminRequest = originalRequest?.url?.startsWith('/admin/') || 
                             originalRequest?.url?.startsWith('/auth/');

      // Проверяем, есть ли токен в localStorage перед попыткой обновления
      const hasToken = isAdminRequest 
        ? localStorage.getItem('accessToken')
        : localStorage.getItem('userAccessToken');

      // Если токена нет, значит пользователь вышел - не пытаемся обновлять
      if (!hasToken) {
        return Promise.reject(error);
      }

      try {
        if (isAdminRequest) {
          // Обновляем токен админа
          const refreshResponse = await api.post('/auth/refresh', {});

          const { accessToken, admin } = refreshResponse.data;
          localStorage.setItem('accessToken', accessToken);
          store.dispatch(setAccessToken(accessToken));
          if (admin) {
            store.dispatch(setAdmin(admin));
          }

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        } else {
          // Обновляем токен пользователя
          const refreshResponse = await api.post('/user-auth/refresh', {});

          const { accessToken } = refreshResponse.data;
          localStorage.setItem('userAccessToken', accessToken);
          store.dispatch(setUserAccessToken(accessToken));

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Повторяем оригинальный запрос с новым токеном
        return api(originalRequest);
      } catch (refreshError: unknown) {
        // Если не удалось обновить токен, очищаем состояние
        if (isAdminRequest) {
          localStorage.removeItem('accessToken');
          store.dispatch(setAccessToken(null));
          store.dispatch(setAdmin(null));
          if (window.location.pathname.startsWith('/admin')) {
            window.location.href = '/admin/login';
          }
        } else {
          localStorage.removeItem('userAccessToken');
          store.dispatch(setUserAccessToken(null));
        }
        // Не логируем ошибку refresh если токена уже нет (пользователь вышел)
        const refreshAxiosError = refreshError as AxiosError;
        if (refreshAxiosError?.response?.status === 401) {
          return Promise.reject(error);
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API методы для товаров
export const productsAPI = {
  getAll: (params?: QueryParams) => api.get('/products', { params }),
  getById: (id: Id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  create: (data: unknown) => api.post('/products', data),
  update: (id: Id, data: unknown) => api.put(`/products/${id}`, data),
  delete: (id: Id) => api.delete(`/products/${id}`),
};

// API методы для корзины
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (productId: Id, quantity = 1) => api.post('/cart', { productId, quantity }),
  updateCartItem: (itemId: Id, quantity: number) => api.put(`/cart/${itemId}`, { quantity }),
  removeFromCart: (itemId: Id) => api.delete(`/cart/${itemId}`),
  clearCart: () => api.delete('/cart'),
};

// API методы для авторизации
export const authAPI = {
  login: (credentials: AuthCredentials) => api.post('/auth/login', credentials),
  refresh: () => api.post('/auth/refresh', {}),
  logout: () => api.post('/auth/logout', {}),
};

// API методы для заказов
export const ordersAPI = {
  getAll: (params?: QueryParams) => api.get('/orders', { params }),
  getById: (id: Id) => api.get(`/orders/${id}`),
  create: (orderData: unknown) => api.post('/orders', orderData),
  updateStatus: (id: Id, status: string) => api.patch(`/orders/${id}/status`, { status }),
};

// API методы для админки - товары
export const adminProductsAPI = {
  getAll: (params?: QueryParams) => api.get('/admin/products', { params }),
  getById: (id: Id) => api.get(`/admin/products/${id}`),
  create: (formData: FormData) => api.post('/admin/products', formData),
  update: (id: Id, formData: FormData) => api.put(`/admin/products/${id}`, formData),
  delete: (id: Id) => api.delete(`/admin/products/${id}`),
  downloadImportTemplate: () =>
    api.get('/admin/products/import/csv-template', {
      responseType: 'blob',
    }),
  importCsv: (formData: FormData) => api.post('/admin/products/import/csv', formData),
};

// API методы для админки - категории
export const adminCategoriesAPI = {
  getAll: () => api.get('/admin/categories'),
  getById: (id: Id) => api.get(`/admin/categories/${id}`),
  create: (data: unknown) => api.post('/admin/categories', data),
  update: (id: Id, data: unknown) => api.put(`/admin/categories/${id}`, data),
  delete: (id: Id) => api.delete(`/admin/categories/${id}`),
  getConfig: (categoryId: Id) => api.get(`/admin/category-config/${categoryId}`),
  getFullConfig: (categoryId: Id) => api.get(`/admin/category-config/${categoryId}/full`),
  // Характеристики
  addSpecification: (categoryId: Id, data: unknown) => api.post(`/admin/category-config/${categoryId}/specifications`, data),
  updateSpecification: (categoryId: Id, id: Id, data: unknown) => api.put(`/admin/category-config/${categoryId}/specifications/${id}`, data),
  deleteSpecification: (categoryId: Id, id: Id) => api.delete(`/admin/category-config/${categoryId}/specifications/${id}`),
  // Варианты
  addVariant: (categoryId: Id, data: unknown) => api.post(`/admin/category-config/${categoryId}/variants`, data),
  updateVariant: (categoryId: Id, id: Id, data: unknown) => api.put(`/admin/category-config/${categoryId}/variants/${id}`, data),
  deleteVariant: (categoryId: Id, id: Id) => api.delete(`/admin/category-config/${categoryId}/variants/${id}`),
};

// Публичный API для получения конфигурации категории (без аутентификации)
export const categoryConfigAPI = {
  getConfig: (categoryId: Id) => api.get(`/admin/category-config/public/${categoryId}`),
};

// API методы для авторизации пользователей
export const userAuthAPI = {
  sendCode: (phone: UserCodePayload) => {
    // Убеждаемся, что phone всегда строка
    const phoneStr = typeof phone === 'object' && phone?.phone 
      ? String(phone.phone) 
      : String(phone || '');
    return api.post('/user-auth/send-code', { phone: phoneStr });
  },
  verifyCode: (phone: string, code: string | number) => {
    // Убеждаемся, что phone всегда строка
    const phoneStr = String(phone || '');
    return api.post('/user-auth/verify-code', { phone: phoneStr, code: String(code || '') });
  },
  register: (data: unknown) => api.post('/user-auth/register', data),
  autoRegister: (data: unknown) => api.post('/user-auth/auto-register', data),
  refresh: () => api.post('/user-auth/refresh', {}),
  logout: () => api.post('/user-auth/logout', {}),
  me: () => api.get('/user-auth/me'),
};

// API методы для отзывов
export const reviewsAPI = {
  getByProduct: (productId: Id, params?: QueryParams) => api.get(`/reviews/product/${productId}`, { params }),
  getMy: () => api.get('/reviews/my'),
  checkReview: (productId: Id) => api.get(`/reviews/check/${productId}`),
  create: (formData: FormData) => {
    // Для FormData не устанавливаем Content-Type - axios установит его автоматически с boundary
    // Токен добавится через interceptor
    return api.post('/reviews', formData);
  },
};

// API методы для админки - отзывы
export const adminReviewsAPI = {
  getAll: (params?: QueryParams) => api.get('/admin/reviews', { params }),
  getById: (id: Id) => api.get(`/admin/reviews/${id}`),
  approve: (id: Id) => api.put(`/admin/reviews/${id}/approve`),
  reject: (id: Id, reason: ReviewRejectReason) => api.put(`/admin/reviews/${id}/reject`, { reason }),
  pin: (id: Id) => api.put(`/admin/reviews/${id}/pin`),
  delete: (id: Id) => api.delete(`/admin/reviews/${id}`),
};

// API методы для избранного
export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (productId: Id) => api.post('/favorites', { productId }),
  remove: (productId: Id) => api.delete(`/favorites/${productId}`),
  check: (productId: Id) => api.get(`/favorites/check/${productId}`),
};

// API методы для личного кабинета
export const accountAPI = {
  getProfile: () => api.get('/account/profile'),
  updateProfile: (formData: FormData) => api.put('/account/profile', formData),
  getOrders: () => api.get('/account/orders'),
  getOrder: (id: Id) => api.get(`/account/orders/${id}`),
  getReviews: () => api.get('/account/reviews'),
  getStatistics: () => api.get('/account/statistics'),
  cancelOrder: (orderId: Id, reason: string) => api.post(`/account/orders/${orderId}/cancel`, { reason }),
};

// API методы для поиска
export const searchAPI = {
  getSuggestions: (query: string, limit = 5) => api.get('/search/suggestions', { params: { q: query, limit } }),
  getSimilar: (productId: Id, limit = 6) => api.get(`/search/similar/${productId}`, { params: { limit } }),
};

/** ИИ-консультант магазина (без прав админа; ключ LLM только на сервере) */
export const chatConsultAPI = {
  history: (clientSessionId: string) =>
    api.get('/chat/history', {
      params: { clientSessionId },
    }),
  consult: (body: ChatConsultBody) =>
    api.post('/chat/consult', body, {
      timeout: 120000,
    }),
};

// API методы для push-подписок
export const pushSubscriptionsAPI = {
  subscribe: (subscription: PushSubscriptionPayload) => api.post('/push-subscriptions', subscription),
  getSubscriptions: () => api.get('/push-subscriptions'),
  getSubscriptionStatus: () => api.get('/push-subscriptions/status'),
  unsubscribe: (id: Id) => api.delete(`/push-subscriptions/${id}`),
  getVapidPublicKey: () => api.get('/push-subscriptions/vapid-public-key'),
  linkSubscription: () => api.post('/push-subscriptions/link'),
};

export default api;

