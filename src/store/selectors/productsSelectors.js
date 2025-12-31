// Селекторы для товаров

export const selectProducts = (state) => state.products.items;

export const selectCurrentProduct = (state) => state.products.currentProduct;

export const selectProductsIsLoading = (state) => state.products.isLoading;

export const selectProductsError = (state) => state.products.error;

export const selectProductsFilters = (state) => state.products.filters;

export const selectProductsPagination = (state) => state.products.pagination;

export const selectProductById = (id) => (state) =>
  state.products.items.find((product) => product.id === id);

