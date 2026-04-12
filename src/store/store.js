import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import cartReducer from './slices/cartSlice';
import productsReducer from './slices/productsSlice';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import userReducer from './slices/userSlice';
import favoritesReducer from './slices/favoritesSlice';

// Конфигурация для сохранения корзины
const cartPersistConfig = {
  key: 'cart',
  storage,
  // Сохраняем всё состояние корзины
  whitelist: ['items', 'totalQuantity', 'totalPrice'],
};

// Обёртка для cartReducer с persist
const persistedCartReducer = persistReducer(cartPersistConfig, cartReducer);

export const store = configureStore({
  reducer: {
    cart: persistedCartReducer,
    products: productsReducer,
    auth: authReducer,
    ui: uiReducer,
    user: userReducer,
    favorites: favoritesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

