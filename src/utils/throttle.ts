/**
 * Throttle функция - ограничивает частоту вызова функции
 */
export const throttle = <T extends unknown[]>(
  func: (...args: T) => void,
  wait: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;

  return function executedFunction(...args: T) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
};

