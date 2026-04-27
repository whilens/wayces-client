import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

type AuthAdmin = { id?: number; login?: string } | null;
type AuthState = {
  admin: AuthAdmin;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};
type AuthCredentials = { login: string; password: string };
type ApiError = { response?: { data?: unknown }; message?: string };
const toErr = (error: unknown, fallback: string): string =>
  (error as ApiError)?.message || fallback;

// Асинхронные действия
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: AuthCredentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      const { accessToken, admin } = response.data;
      localStorage.setItem('accessToken', accessToken);
      return { accessToken, admin };
    } catch (error: unknown) {
      return rejectWithValue(toErr(error, 'Ошибка авторизации'));
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authAPI.logout();
    localStorage.removeItem('accessToken');
    return null;
  } catch (error: unknown) {
    localStorage.removeItem('accessToken');
    return rejectWithValue(toErr(error, 'Ошибка выхода'));
  }
});

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return rejectWithValue('No access token found');
      }
      // Попытка обновить токен, чтобы получить актуальные данные админа
      const response = await authAPI.refresh();
      const { accessToken: newAccessToken, admin } = response.data;
      localStorage.setItem('accessToken', newAccessToken);
      return { accessToken: newAccessToken, admin };
    } catch (error: unknown) {
      localStorage.removeItem('accessToken');
      return rejectWithValue(toErr(error, 'Ошибка проверки авторизации'));
    }
  }
);

const initialState: AuthState = {
  admin: null,
  accessToken: localStorage.getItem('accessToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAccessToken: (state, action: { payload: string | null }) => {
      state.accessToken = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setAdmin: (state, action: { payload: AuthAdmin }) => {
      state.admin = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.admin = action.payload.admin;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || null;
        state.isAuthenticated = false;
      })
      // logout
      .addCase(logout.fulfilled, (state) => {
        state.admin = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      })
      // checkAuth
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.admin = action.payload.admin;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.admin = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.error = (action.payload as string) || null;
      });
  },
});

export const { clearError, setAccessToken, setAdmin } = authSlice.actions;

export default authSlice.reducer;

