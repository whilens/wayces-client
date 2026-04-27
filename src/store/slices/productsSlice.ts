import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productsAPI } from '../../services/api';
import { getMockProducts, getMockProductById } from '../../utils/mockData';

type Product = { id: number | string; name?: string };
type ProductsFilters = {
  categoryId: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  search: string;
  specifications: Record<string, unknown>;
  variantFilters: Record<string, unknown>;
};
type ProductsState = {
  items: Product[];
  currentProduct: Product | null;
  isLoading: boolean;
  error: string | null;
  filters: ProductsFilters;
  pagination: { page: number; limit: number; total: number };
};
type FetchProductsArgs = Record<string, unknown>;
type FetchProductsResult = { products?: Product[]; total?: number; hasMore?: boolean } | Product[];
type ApiError = { response?: { data?: unknown }; message?: string };
const errText = (error: unknown, fallback: string) =>
  (error as ApiError)?.message || fallback;

// Использовать мок данные или API (переключить через переменную окружения)
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Асинхронные действия
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params: FetchProductsArgs = {}, { rejectWithValue }) => {
    try {
      if (USE_MOCK_DATA) {
        const data = await getMockProducts(params);
        return data;
      } else {
        const response = await productsAPI.getAll(
          params as Record<string, string | number | boolean | null | undefined>
        );
        return response.data;
      }
    } catch (error: unknown) {
      return rejectWithValue(errText(error, 'Ошибка загрузки товаров'));
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id: string | number, { rejectWithValue }) => {
    try {
      if (USE_MOCK_DATA) {
        const data = await getMockProductById(id);
        return data;
      } else {
        const response = await productsAPI.getById(id);
        return response.data;
      }
    } catch (error: unknown) {
      return rejectWithValue(errText(error, 'Ошибка загрузки товара'));
    }
  }
);

const initialState: ProductsState = {
  items: [],
  currentProduct: null,
  isLoading: false,
  error: null,
  filters: {
    categoryId: null,
    minPrice: null,
    maxPrice: null,
    search: '',
    specifications: {},
    variantFilters: {},
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action: { payload: Partial<ProductsFilters> }) => {
      state.filters = { ...state.filters, ...action.payload };
      // Очищаем товары при изменении фильтров
      state.items = [];
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      // Очищаем товары при сбросе фильтров
      state.items = [];
    },
    setLimit: (state, action: { payload: number }) => {
      state.pagination.limit = action.payload;
      state.items = []; // Очищаем товары при изменении лимита
    },
    clearItems: (state) => {
      state.items = [];
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchProducts
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action: { payload: FetchProductsResult; meta?: { arg?: { append?: boolean } } }) => {
        state.isLoading = false;
        const isAppend = action.meta?.arg?.append;
        const payloadObj = Array.isArray(action.payload) ? { products: action.payload } : action.payload;
        const products = payloadObj.products || [];
        const total = payloadObj.total || products.length;
        
        if (isAppend) {
          // Добавляем к существующим
          state.items = [...state.items, ...products];
        } else {
          // Заменяем
          state.items = products;
        }
        state.pagination.total = total;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || null;
      })
      // fetchProductById
      .addCase(fetchProductById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || null;
      });
  },
});

export const { setFilters, resetFilters, setLimit, clearItems, clearCurrentProduct } = productsSlice.actions;

export default productsSlice.reducer;

