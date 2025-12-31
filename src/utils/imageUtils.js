/**
 * Получить полный URL изображения
 * @param {string} imagePath - относительный путь к изображению (например, '/uploads/product-xxx_main.jpg')
 * @returns {string} полный URL изображения
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return '';
  }

  // Если уже полный URL (начинается с http:// или https://), возвращаем как есть
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Получаем базовый URL бэкенда из переменной окружения или используем дефолтный
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  // Убираем /api из конца, чтобы получить базовый URL сервера
  const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

  // Убираем начальный слэш, если он есть, чтобы избежать двойных слэшей
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

  return `${SERVER_BASE_URL}${cleanPath}`;
};

/**
 * Получить URL миниатюры изображения
 * @param {string} imagePath - относительный путь к изображению
 * @returns {string} полный URL миниатюры
 */
export const getThumbnailUrl = (imagePath) => {
  if (!imagePath) {
    return '';
  }

  // Если уже полный URL, возвращаем как есть
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Заменяем _main на _thumb для получения миниатюры
  const thumbnailPath = imagePath.replace('_main', '_thumb');
  return getImageUrl(thumbnailPath);
};

/**
 * Получает изображение для комбинации вариантов товара
 * @param {Object} product - Товар
 * @param {Object} selectedVariants - Выбранные варианты { variantKey: optionId }
 * @param {Object} productVariants - Варианты товара в формате клиента
 * @returns {string} URL изображения или пустая строка
 */
export const getCombinationImage = (product, selectedVariants, productVariants) => {
  if (!selectedVariants || !productVariants || Object.keys(selectedVariants).length === 0) {
    return getImageUrl(product?.defaultImage || '');
  }

  // Ищем изображение по цвету (приоритет)
  if (selectedVariants.color && productVariants.color) {
    const colorVariant = productVariants.color;
    const selectedColorOption = colorVariant.options?.find(opt => opt.id === selectedVariants.color);
    
    if (selectedColorOption?.images) {
      const images = Array.isArray(selectedColorOption.images) 
        ? selectedColorOption.images 
        : [selectedColorOption.images];
      if (images.length > 0) {
        return getImageUrl(images[0]);
      }
    }
  }

  // Используем изображения товара, если они есть
  if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
    return getImageUrl(product.images[0]);
  }

  return getImageUrl(product?.defaultImage || '');
};

