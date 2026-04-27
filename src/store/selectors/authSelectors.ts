// Селекторы для авторизации
import type { RootState } from '../store';

export const selectAuthAdmin = (state: RootState) => state.auth.admin;
export const selectAuthAccessToken = (state: RootState) => state.auth.accessToken;
export const selectAuthIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthIsLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

