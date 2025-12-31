// Селекторы для авторизации

export const selectAuthAdmin = (state) => state.auth.admin;
export const selectAuthAccessToken = (state) => state.auth.accessToken;
export const selectAuthIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthIsLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

