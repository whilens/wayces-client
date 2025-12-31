import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { favoritesAPI } from '../../services/api';

// Асинхронные действия
export const fetchFavorites = createAsyncThunk(
  'favorites/fetchFavorites',
  async (_, { rejectWithValue }) => {
    try {
      const response = await favoritesAPI.getAll();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Ошибка загрузки избранного');
    }
  }
);

export const addToFavorites = createAsyncThunk(
  'favorites/addToFavorites',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await favoritesAPI.add(productId);
      return { productId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Ошибка добавления в избранное');
    }
  }
);

export const removeFromFavorites = createAsyncThunk(
  'favorites/removeFromFavorites',
  async (productId, { rejectWithValue }) => {
    try {
      await favoritesAPI.remove(productId);
      return productId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Ошибка удаления из избранного');
    }
  }
);

export const checkFavorite = createAsyncThunk(
  'favorites/checkFavorite',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await favoritesAPI.check(productId);
      return { productId, isFavorite: response.data.isFavorite };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Ошибка проверки избранного');
    }
  }
);

const initialState = {
  items: [],
  isLoading: false,
  error: null,
  checkedItems: {}, // Кэш проверенных товаров { productId: isFavorite }
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    clearFavorites: (state) => {
      state.items = [];
      state.checkedItems = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchFavorites
      .addCase(fetchFavorites.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.favorites || [];
        // Обновляем кэш проверенных товаров
        action.payload.favorites?.forEach(fav => {
          if (fav.productId) {
            state.checkedItems[fav.productId] = true;
          }
        });
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // addToFavorites
      .addCase(addToFavorites.fulfilled, (state, action) => {
        state.checkedItems[action.payload.productId] = true;
        // Обновляем список, если он загружен
        if (state.items.length > 0) {
          // Товар будет добавлен при следующей загрузке
          // Или можно добавить сразу, если есть данные о товаре
        }
      })
      // removeFromFavorites
      .addCase(removeFromFavorites.fulfilled, (state, action) => {
        state.checkedItems[action.payload] = false;
        state.items = state.items.filter(item => item.productId !== action.payload);
      })
      // checkFavorite
      .addCase(checkFavorite.fulfilled, (state, action) => {
        state.checkedItems[action.payload.productId] = action.payload.isFavorite;
      });
  },
});

export const { clearFavorites } = favoritesSlice.actions;

export default favoritesSlice.reducer;

