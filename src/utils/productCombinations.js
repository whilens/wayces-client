import { formatProductNameWithVariants } from './helpers';
import { getImageUrl, getCombinationImage } from './imageUtils';

/**
 * Генерация всех возможных комбинаций вариантов товара
 * @param {Object} product - Товар с вариантами
 * @returns {Array} Массив всех комбинаций
 */
export const generateProductCombinations = (product) => {
  if (!product.variants || Object.keys(product.variants).length === 0) {
    // Если нет вариантов, возвращаем один товар
    return [
      {
        id: product.id,
        productId: product.id,
        name: product.name,
        fullName: product.name,
        price: product.basePrice || product.price || 0,
        image: getImageUrl(product.defaultImage || product.image || ''),
        category: product.category,
        description: product.description,
        rating: product.rating,
        reviews: product.reviews,
        combinationKey: null,
        variants: null,
        isCombination: false,
      },
    ];
  }

  const combinations = [];
  const variantKeys = Object.keys(product.variants);
  
  // Рекурсивная функция для генерации всех комбинаций
  const generateCombinations = (currentCombination, remainingVariants) => {
    if (remainingVariants.length === 0) {
      // Вычисляем итоговую цену
      let finalPrice = product.basePrice || product.price || 0;
      const variantValues = {};
      
      Object.keys(currentCombination).forEach((key) => {
        const variant = product.variants[key];
        const option = variant.options.find((opt) => opt.id === currentCombination[key]);
        if (option) {
          finalPrice += option.priceModifier || 0;
          variantValues[key] = currentCombination[key];
        }
      });

      // Формируем ключ комбинации
      const combinationKey = Object.keys(currentCombination)
        .sort()
        .map((key) => `${key}-${currentCombination[key]}`)
        .join('_');

      // Получаем изображение для комбинации
      const combinationImage = getCombinationImage(product, currentCombination, product.variants);

      // Формируем полное название
      const fullName = formatProductNameWithVariants(
        product.name,
        currentCombination,
        product.variants
      );

      combinations.push({
        id: `${product.id}-${combinationKey}`, // Уникальный ID для комбинации
        productId: product.id, // ID базового товара
        name: product.name,
        fullName: fullName,
        price: finalPrice,
        image: combinationImage,
        category: product.category,
        description: product.description,
        rating: product.rating,
        reviews: product.reviews,
        specifications: product.specifications,
        combinationKey: combinationKey,
        variants: { ...currentCombination },
        isCombination: true,
        baseProduct: product, // Сохраняем ссылку на базовый товар
      });
      return;
    }

    const currentVariantKey = remainingVariants[0];
    const variant = product.variants[currentVariantKey];
    const remaining = remainingVariants.slice(1);

    // Для каждого значения варианта создаем новую комбинацию
    variant.options.forEach((option) => {
      if (option.available !== false) {
        generateCombinations(
          {
            ...currentCombination,
            [currentVariantKey]: option.id,
          },
          remaining
        );
      }
    });
  };

  generateCombinations({}, variantKeys);
  return combinations;
};

/**
 * Получить все комбинации для списка товаров
 */
export const generateAllProductCombinations = (products) => {
  const allCombinations = [];
  
  products.forEach((product) => {
    const combinations = generateProductCombinations(product);
    allCombinations.push(...combinations);
  });
  
  return allCombinations;
};

