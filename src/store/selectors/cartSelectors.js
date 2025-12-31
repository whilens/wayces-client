// Селекторы для корзины - мемоизация селекторов

export const selectCartItems = (state) => state.cart.items;

export const selectCartTotalQuantity = (state) => state.cart.totalQuantity;

export const selectCartTotalPrice = (state) => state.cart.totalPrice;

export const selectCartIsLoading = (state) => state.cart.isLoading;

export const selectCartError = (state) => state.cart.error;

export const selectCartItemById = (id) => (state) =>
  state.cart.items.find((item) => item.id === id);

export const selectCartItemCount = (state) => state.cart.items.length;

