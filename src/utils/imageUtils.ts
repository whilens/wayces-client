/**
 * Получить полный URL изображения
 * @param {string} imagePath - относительный путь к изображению (например, '/uploads/product-xxx_main.jpg')
 * @returns {string} полный URL изображения
 */
export const getImageUrl = (imagePath: string) => {
  if (!imagePath) {
    return '';
  }

  // Полный URL: отдаём как есть, кроме зашитых в данные dev-URL localhost:5000 — иначе на проде/без бэка картинки ломаются
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const u = new URL(imagePath);
      if (/^(localhost|127\.0\.0\.1)$/i.test(u.hostname) && u.pathname.startsWith('/uploads')) {
        return `${u.pathname}${u.search}`;
      }
    } catch {
      /* ignore */
    }
    return imagePath;
  }

  // База API: полный URL или относительный /api (тогда картинки — относительные /uploads, см. proxy в vite)
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  const SERVER_BASE_URL = String(API_BASE_URL)
    .replace(/\/?api\/?$/i, '')
    .replace(/\/$/, '');

  // Убираем начальный слэш, если он есть, чтобы избежать двойных слэшей
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

  return `${SERVER_BASE_URL}${cleanPath}`;
};

/**
 * Получить URL миниатюры изображения
 * @param {string} imagePath - относительный путь к изображению
 * @returns {string} полный URL миниатюры
 */
export const getThumbnailUrl = (imagePath: string) => {
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
type ProductImageVariantOption = { id: string; images?: string[] | string };
type ProductImageVariants = Record<string, { options?: ProductImageVariantOption[] }>;
type ProductLike = { defaultImage?: string; images?: string[] };
export const getCombinationImage = (
  product: ProductLike,
  selectedVariants: Record<string, string>,
  productVariants: ProductImageVariants
) => {
  if (!selectedVariants || !productVariants || Object.keys(selectedVariants).length === 0) {
    return getImageUrl(product?.defaultImage || '');
  }

  // Ищем изображение по цвету (приоритет)
  if (selectedVariants.color && productVariants.color) {
    const colorVariant = productVariants.color;
    const selectedColorOption = colorVariant.options?.find(
      (opt: ProductImageVariantOption) => opt.id === selectedVariants.color
    );
    
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

