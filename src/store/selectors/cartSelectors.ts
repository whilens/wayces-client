// Селекторы для корзины - мемоизация селекторов
import type { RootState } from '../store';

export const selectCartItems = (state: RootState) => state.cart.items;

export const selectCartTotalQuantity = (state: RootState) => state.cart.totalQuantity;

export const selectCartTotalPrice = (state: RootState) => state.cart.totalPrice;

export const selectCartIsLoading = (state: RootState) => state.cart.isLoading;

export const selectCartError = (state: RootState) => state.cart.error;

export const selectCartItemById = (id: number | string) => (state: RootState) =>
  state.cart.items.find((item) => item.id === id);

export const selectCartItemCount = (state: RootState) => state.cart.items.length;

