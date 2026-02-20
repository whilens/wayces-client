// Вспомогательные функции

/**
 * Форматирует цену в рубли
 */
export const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(price);
};

/**
 * Рассчитывает цену со скидкой
 * @param {number} originalPrice - Исходная цена
 * @param {string|null} discountType - Тип скидки: 'percentage' или 'fixed'
 * @param {number} discountValue - Значение скидки
 * @returns {Object} { originalPrice, discountedPrice, discountAmount, discountPercent }
 */
export const calculateDiscountedPrice = (originalPrice, discountType, discountValue) => {
  if (!discountType || !discountValue || discountValue <= 0) {
    return {
      originalPrice,
      discountedPrice: originalPrice,
      discountAmount: 0,
      discountPercent: 0,
      hasDiscount: false,
    };
  }

  let discountAmount = 0;
  let discountedPrice = originalPrice;

  if (discountType === 'percentage') {
    discountAmount = (originalPrice * parseFloat(discountValue)) / 100;
    discountedPrice = originalPrice - discountAmount;
    discountedPrice = Math.round(discountedPrice); // убираем копейки при процентной скидке
  } else if (discountType === 'fixed') {
    discountAmount = parseFloat(discountValue);
    discountedPrice = originalPrice - discountAmount;
  }

  // Убеждаемся, что цена не отрицательная
  if (discountedPrice < 0) {
    discountedPrice = 0;
    discountAmount = originalPrice;
  }

  const discountPercent = discountType === 'percentage' 
    ? parseFloat(discountValue) 
    : (discountAmount / originalPrice) * 100;

  return {
    originalPrice,
    discountedPrice,
    discountAmount,
    discountPercent: Math.round(discountPercent * 100) / 100,
    hasDiscount: true,
  };
};

/**
 * Форматирует дату
 */
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

/**
 * Обрезает текст до указанной длины
 */
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Дебаунс функция
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Валидация email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Валидация телефона
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Генерация уникального ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Форматирование названия товара с вариантами
 * Примеры:
 * - "iPhone 15 Pro Max, 256 ГБ, Натуральный титан"
 * - "Кроссовки Nike Air Max 270, размер 42, Черный"
 */
export const formatProductNameWithVariants = (productName, variants, productVariants) => {
  if (!variants || !productVariants || Object.keys(variants).length === 0) {
    return productName;
  }

  const variantParts = [];

  // Порядок приоритета для отображения вариантов (сначала технические характеристики, потом цвет)
  const variantOrder = ['storage', 'memory', 'ram', 'size', 'color'];

  // Сначала добавляем варианты в порядке приоритета
  variantOrder.forEach((key) => {
    if (variants[key] && productVariants[key]) {
      const variant = productVariants[key];
      const selectedOption = variant.options.find((opt) => opt.id === variants[key]);
      if (selectedOption) {
        // Для размера добавляем "размер"
        if (key === 'size') {
          variantParts.push(`размер ${selectedOption.value}`);
        } else {
          variantParts.push(selectedOption.value);
        }
      }
    }
  });

  // Добавляем остальные варианты, которые не в списке приоритета
  Object.keys(variants).forEach((key) => {
    if (!variantOrder.includes(key) && productVariants[key]) {
      const variant = productVariants[key];
      const selectedOption = variant.options.find((opt) => opt.id === variants[key]);
      if (selectedOption) {
        variantParts.push(selectedOption.value);
      }
    }
  });

  if (variantParts.length > 0) {
    return `${productName}, ${variantParts.join(', ')}`;
  }

  return productName;
};

