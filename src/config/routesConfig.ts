import { lazy } from 'react';
import { ROUTES } from '../utils/constants';

// Lazy loading для страниц
const Home = lazy(() => import('../pages/Home/Home'));
const Products = lazy(() => import('../pages/Products/Products'));
const ProductDetail = lazy(() => import('../pages/ProductDetail/ProductDetail'));
const Cart = lazy(() => import('../pages/Cart/Cart'));
const Checkout = lazy(() => import('../pages/Checkout/Checkout'));
const WriteReview = lazy(() => import('../pages/WriteReview/WriteReview'));
const Account = lazy(() => import('../pages/Account/Account'));
const AdminLogin = lazy(() => import('../pages/Admin/Login/Login'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard/Dashboard'));
const AdminOrders = lazy(() => import('../pages/Admin/Orders/Orders'));
const AdminOrderDetail = lazy(() => import('../pages/Admin/OrderDetail/OrderDetail'));
const AdminProducts = lazy(() => import('../pages/Admin/Products/Products'));
const AdminProductForm = lazy(() => import('../pages/Admin/ProductForm/ProductForm'));
const AdminReviews = lazy(() => import('../pages/Admin/Reviews/Reviews'));
const AdminCategories = lazy(() => import('../pages/Admin/Categories/Categories'));
const AdminCategoryConfig = lazy(() => import('../pages/Admin/CategoryConfig/CategoryConfig'));

/**
 * Конфигурация роутов приложения
 * @param {string} path - путь роута
 * @param {React.Component} element - компонент страницы
 * @param {string|null} protected - тип защиты: 'user' | 'admin' | null (публичный)
 */
export const routesConfig = [
  // Публичные роуты
  {
    path: ROUTES.HOME,
    element: Home,
    protected: null,
  },
  {
    path: ROUTES.PRODUCTS,
    element: Products,
    protected: null,
  },
  {
    path: ROUTES.PRODUCT_DETAIL,
    element: ProductDetail,
    protected: null,
  },
  {
    path: ROUTES.CART,
    element: Cart,
    protected: null,
  },
  {
    path: ROUTES.CHECKOUT,
    element: Checkout,
    protected: null,
  },
  {
    path: '/review/:productId',
    element: WriteReview,
    protected: null,
  },
  
  // Защищенные роуты для пользователей
  {
    path: '/account',
    element: Account,
    protected: 'user',
  },
  
  // Админские роуты
  {
    path: ROUTES.ADMIN_LOGIN,
    element: AdminLogin,
    protected: null,
  },
  {
    path: ROUTES.ADMIN_DASHBOARD,
    element: AdminDashboard,
    protected: 'admin',
  },
  {
    path: ROUTES.ADMIN_ORDERS,
    element: AdminOrders,
    protected: 'admin',
  },
  {
    path: ROUTES.ADMIN_ORDER_DETAIL,
    element: AdminOrderDetail,
    protected: 'admin',
  },
  {
    path: ROUTES.ADMIN_PRODUCTS,
    element: AdminProducts,
    protected: 'admin',
  },
  {
    path: ROUTES.ADMIN_PRODUCT_NEW,
    element: AdminProductForm,
    protected: 'admin',
  },
  {
    path: ROUTES.ADMIN_PRODUCT_EDIT,
    element: AdminProductForm,
    protected: 'admin',
  },
  {
    path: '/admin/reviews',
    element: AdminReviews,
    protected: 'admin',
  },
  {
    path: ROUTES.ADMIN_CATEGORIES,
    element: AdminCategories,
    protected: 'admin',
  },
  {
    path: ROUTES.ADMIN_CATEGORY_CONFIG,
    element: AdminCategoryConfig,
    protected: 'admin',
  },
];

