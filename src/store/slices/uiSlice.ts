import { createSlice } from '@reduxjs/toolkit';

// Загружаем тему из localStorage или используем системную
const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    return savedTheme;
  }
  // Проверяем системную тему
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

type NotificationItem = { id: number; message?: string; description?: string; type?: string };
type UiState = {
  sidebarOpen: boolean;
  modalOpen: boolean;
  modalType: string | null;
  notifications: NotificationItem[];
  theme: string;
};

const initialState: UiState = {
  sidebarOpen: false,
  modalOpen: false,
  modalType: null,
  notifications: [],
  theme: getInitialTheme(),
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: { payload: boolean }) => {
      state.sidebarOpen = action.payload;
    },
    openModal: (state, action: { payload: string | null }) => {
      state.modalOpen = true;
      state.modalType = action.payload;
    },
    closeModal: (state) => {
      state.modalOpen = false;
      state.modalType = null;
    },
    addNotification: (state, action: { payload: Omit<NotificationItem, 'id'> }) => {
      const notification = {
        id: Date.now(),
        ...action.payload,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: { payload: number }) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    setTheme: (state, action: { payload: string }) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      // Применяем тему к document
      document.documentElement.setAttribute('data-theme', action.payload);
    },
    toggleTheme: (state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = newTheme;
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  openModal,
  closeModal,
  addNotification,
  removeNotification,
  setTheme,
  toggleTheme,
} = uiSlice.actions;

export default uiSlice.reducer;

