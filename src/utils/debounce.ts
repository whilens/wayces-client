/**
 * Debounce функция для задержки выполнения
 * @param {Function} func - Функция для выполнения
 * @param {number} wait - Время задержки в миллисекундах
 * @returns {Function} - Debounced функция
 */
export const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  wait: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: T) {
    const later = () => {
      if (timeout) clearTimeout(timeout);
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

