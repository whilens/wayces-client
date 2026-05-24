import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { userAuthAPI } from '../../services/api';

type User = {
  id?: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  avatar?: string | null;
} | null;
type UserState = {
  user: User;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authModal: {
    isOpen: boolean;
    step: 'phone' | 'code' | 'register';
    phone: string;
    registrationToken: string | null;
    redirectTo: string | null;
  };
};
type ApiError = { response?: { data?: { error?: string } } };
const getErr = (error: unknown, fallback: string) =>
  (error as ApiError)?.response?.data?.error || fallback;

// Асинхронные действия
export const sendCode = createAsyncThunk(
  'user/sendCode',
  async (phone: string, { rejectWithValue }) => {
    try {
      // Убеждаемся, что phone всегда строка
      const phoneStr = String(phone || '');
      const response = await userAuthAPI.sendCode(phoneStr);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(getErr(error, 'Ошибка отправки кода'));
    }
  }
);

export const verifyCode = createAsyncThunk(
  'user/verifyCode',
  async ({ phone, code }: { phone: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await userAuthAPI.verifyCode(phone, code);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(getErr(error, 'Ошибка проверки кода'));
    }
  }
);

export const registerUser = createAsyncThunk(
  'user/register',
  async (
    { registrationToken, firstName, lastName }: { registrationToken: string; firstName: string; lastName: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await userAuthAPI.register({ registrationToken, firstName, lastName });
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(getErr(error, 'Ошибка регистрации'));
    }
  }
);

export const refreshUserToken = createAsyncThunk(
  'user/refresh',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userAuthAPI.refresh();
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(getErr(error, 'Ошибка обновления токена'));
    }
  }
);

export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { rejectWithValue }) => {
    try {
      await userAuthAPI.logout();
      return null;
    } catch (error: unknown) {
      return rejectWithValue(getErr(error, 'Ошибка выхода'));
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'user/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userAuthAPI.me();
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(getErr(error, 'Ошибка получения пользователя'));
    }
  }
);

const initialState: UserState = {
  user: null,
  accessToken: localStorage.getItem('userAccessToken') || null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  // Состояние модального окна авторизации
  authModal: {
    isOpen: false,
    step: 'phone', // 'phone', 'code', 'register'
    phone: '',
    registrationToken: null,
    redirectTo: null, // куда перенаправить после авторизации (например, на страницу отзыва)
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Установить пользователя
    setUser: (state, action: { payload: User }) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    // Открыть модальное окно авторизации
    openAuthModal: (
      state,
      action: PayloadAction<{ redirectTo?: string | null } | undefined>
    ) => {
      state.authModal.isOpen = true;
      state.authModal.step = 'phone';
      state.authModal.phone = '';
      state.authModal.registrationToken = null;
      state.authModal.redirectTo = action.payload?.redirectTo || null;
      state.error = null;
    },
    // Закрыть модальное окно
    closeAuthModal: (state) => {
      state.authModal.isOpen = false;
      state.authModal.step = 'phone';
      state.authModal.phone = '';
      state.authModal.registrationToken = null;
      state.error = null;
    },
    // Установить телефон
    setPhone: (state, action: { payload: string }) => {
      state.authModal.phone = action.payload;
    },
    // Очистить ошибку
    clearError: (state) => {
      state.error = null;
    },
    // Установить токен (для инициализации из localStorage)
    setUserAccessToken: (state, action: { payload: string | null }) => {
      state.accessToken = action.payload;
      if (action.payload) {
        localStorage.setItem('userAccessToken', action.payload);
      } else {
        localStorage.removeItem('userAccessToken');
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // sendCode
      .addCase(sendCode.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendCode.fulfilled, (state) => {
        state.isLoading = false;
        state.authModal.step = 'code';
      })
      .addCase(sendCode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || null;
      })
      // verifyCode
      .addCase(verifyCode.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyCode.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.status === 'authenticated') {
          // Пользователь авторизован
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.isAuthenticated = true;
          localStorage.setItem('userAccessToken', action.payload.accessToken);
          state.authModal.isOpen = false;
        } else if (action.payload.status === 'needs_registration') {
          // Нужна регистрация
          state.authModal.step = 'register';
          state.authModal.registrationToken = action.payload.registrationToken;
        }
      })
      .addCase(verifyCode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || null;
      })
      // registerUser
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        localStorage.setItem('userAccessToken', action.payload.accessToken);
        state.authModal.isOpen = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || null;
      })
      // refreshUserToken
      .addCase(refreshUserToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshUserToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        localStorage.setItem('userAccessToken', action.payload.accessToken);
      })
      .addCase(refreshUserToken.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        localStorage.removeItem('userAccessToken');
      })
      // logoutUser
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        localStorage.removeItem('userAccessToken');
      })
      // fetchCurrentUser
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        localStorage.removeItem('userAccessToken');
      });
  },
});

export const {
  setUser,
  openAuthModal,
  closeAuthModal,
  setPhone,
  clearError,
  setUserAccessToken,
} = userSlice.actions;

export default userSlice.reducer;

