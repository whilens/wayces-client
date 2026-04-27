// Константы приложения

export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: '/products/:id',
  CART: '/cart',
  CHECKOUT: '/checkout',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:id',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_ORDER_DETAIL: '/admin/orders/:id',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_PRODUCT_NEW: '/admin/products/new',
  ADMIN_PRODUCT_EDIT: '/admin/products/:id/edit',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_CATEGORY_CONFIG: '/admin/category-config/:categoryId',
};

export const API_ENDPOINTS = {
  PRODUCTS: '/products',
  CART: '/cart',
  AUTH: '/auth',
  ORDERS: '/orders',
};

export const STORAGE_KEYS = {
  TOKEN: 'token',
  CART: 'cart',
  USER: 'user',
};

export const CART_ACTIONS = {
  ADD: 'ADD',
  REMOVE: 'REMOVE',
  UPDATE: 'UPDATE',
  CLEAR: 'CLEAR',
};

export const PRODUCT_CATEGORIES = [
  { id: 1, name: 'Электроника', slug: 'electronics' },
  { id: 2, name: 'Одежда', slug: 'clothing' },
  { id: 3, name: 'Дом и сад', slug: 'home-garden' },
  { id: 4, name: 'Спорт', slug: 'sports' },
  { id: 5, name: 'Книги', slug: 'books' },
];

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const ORDER_STATUS_LABELS = {
  pending: 'Новый',
  paid: 'Оплачен',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

