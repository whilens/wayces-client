import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Хук для асинхронной загрузки данных с обработкой состояния загрузки и ошибок
 * @param {Function} apiCall - Функция, возвращающая Promise с данными
 * @param {Array} dependencies - Зависимости для автоматической загрузки
 * @returns {Object} { data, isLoading, error, load }
 */
type LoaderError = {
  response?: { status?: number };
  message?: string;
};

export const useAsyncDataLoader = <T>(
  apiCall: () => Promise<T | { data?: T }>,
  dependencies: Array<unknown> = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LoaderError | null>(null);
  const apiCallRef = useRef(apiCall);

  // Обновляем ref при изменении apiCall
  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiCallRef.current();
      // Поддерживаем как прямой ответ, так и response.data
      const result =
        typeof response === 'object' && response !== null && 'data' in response
          ? (response as { data?: T }).data ?? null
          : (response as T);
      setData(result);
      return result;
    } catch (err: unknown) {
      // Не логируем 401 ошибки - это нормально при выходе пользователя
      const typedErr = (typeof err === 'object' && err !== null ? err : {}) as LoaderError;
      if (typedErr.response?.status !== 401) {
        console.error('Ошибка загрузки данных:', err);
      }
      setError(typedErr);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Автоматическая загрузка при изменении зависимостей
  useEffect(() => {
    if (
      dependencies.length > 0 &&
      dependencies.every((dep) => dep !== null && dep !== undefined && dep !== false)
    ) {
      load();
    } else if (dependencies.includes(false)) {
      // Если isAuthenticated стал false, очищаем данные
      setData(null);
      setError(null);
    }
  }, dependencies);

  return { data, isLoading, error, load };
};

