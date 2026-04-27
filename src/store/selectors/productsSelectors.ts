// Селекторы для товаров
import type { RootState } from '../store';

export const selectProducts = (state: RootState) => state.products.items;

export const selectCurrentProduct = (state: RootState) => state.products.currentProduct;

export const selectProductsIsLoading = (state: RootState) => state.products.isLoading;

export const selectProductsError = (state: RootState) => state.products.error;

export const selectProductsFilters = (state: RootState) => state.products.filters;

export const selectProductsPagination = (state: RootState) => state.products.pagination;

export const selectProductById = (id: number | string) => (state: RootState) =>
  state.products.items.find((product) => product.id === id);

