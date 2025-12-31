import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productsAPI } from '../../services/api';
import { getMockProducts, getMockProductById } from '../../utils/mockData';

// Использовать мок данные или API (переключить через переменную окружения)
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true';

// Асинхронные действия
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (params = {}, { rejectWithValue }) => {
    try {
      if (USE_MOCK_DATA) {
        const data = await getMockProducts(params);
        return data;
      } else {
        const response = await productsAPI.getAll(params);
        return response.data;
      }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id, { rejectWithValue }) => {
    try {
      if (USE_MOCK_DATA) {
        const data = await getMockProductById(id);
        return data;
      } else {
        const response = await productsAPI.getById(id);
        return response.data;
      }
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
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
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      // Очищаем товары при изменении фильтров
      state.items = [];
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      // Очищаем товары при сбросе фильтров
      state.items = [];
    },
    setLimit: (state, action) => {
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
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        const isAppend = action.meta?.arg?.append;
        const products = action.payload.products || (Array.isArray(action.payload) ? action.payload : []);
        const total = action.payload.total || products.length;
        
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
        state.error = action.payload;
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
        state.error = action.payload;
      });
  },
});

export const { setFilters, resetFilters, setLimit, clearItems, clearCurrentProduct } = productsSlice.actions;

export default productsSlice.reducer;

