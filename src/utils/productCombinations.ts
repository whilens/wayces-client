import { formatProductNameWithVariants } from './helpers';
import { getImageUrl, getCombinationImage } from './imageUtils';

/**
 * Генерация всех возможных комбинаций вариантов товара
 * @param {Object} product - Товар с вариантами
 * @returns {Array} Массив всех комбинаций
 */
type VariantOption = { id: string; value: string; available?: boolean; priceModifier?: number };
type Variant = { options: VariantOption[] };
type Product = {
  id: number | string;
  name: string;
  basePrice?: number;
  price?: number;
  defaultImage?: string;
  image?: string;
  category?: string;
  description?: string;
  rating?: number;
  reviews?: number;
  specifications?: Record<string, unknown>;
  variants?: Record<string, Variant>;
};
type ProductCombination = {
  id: string | number;
  productId: string | number;
  name: string;
  fullName: string;
  price: number;
  image: string;
  category?: string;
  description?: string;
  rating?: number;
  reviews?: number;
  specifications?: Record<string, unknown>;
  combinationKey: string | null;
  variants: Record<string, string> | null;
  isCombination: boolean;
  baseProduct?: Product;
};

export const generateProductCombinations = (product: Product): ProductCombination[] => {
  const productVariants = product.variants || {};
  if (Object.keys(productVariants).length === 0) {
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

  const combinations: ProductCombination[] = [];
  const variantKeys = Object.keys(productVariants);
  
  // Рекурсивная функция для генерации всех комбинаций
  const generateCombinations = (
    currentCombination: Record<string, string>,
    remainingVariants: string[]
  ) => {
    if (remainingVariants.length === 0) {
      // Вычисляем итоговую цену
      let finalPrice = product.basePrice || product.price || 0;
      
      Object.keys(currentCombination).forEach((key) => {
        const variant = productVariants[key];
        const option = variant.options.find((opt: VariantOption) => opt.id === currentCombination[key]);
        if (option) {
          finalPrice += option.priceModifier || 0;
        }
      });

      // Формируем ключ комбинации
      const combinationKey = Object.keys(currentCombination)
        .sort()
        .map((key) => `${key}-${currentCombination[key]}`)
        .join('_');

      // Получаем изображение для комбинации
      const combinationImage = getCombinationImage(product, currentCombination, productVariants);

      // Формируем полное название
      const fullName = formatProductNameWithVariants(
        product.name,
        currentCombination,
        productVariants
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
    const variant = productVariants[currentVariantKey];
    const remaining = remainingVariants.slice(1);

    // Для каждого значения варианта создаем новую комбинацию
    variant.options.forEach((option: VariantOption) => {
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
export const generateAllProductCombinations = (products: Product[]) => {
  const allCombinations: ProductCombination[] = [];
  
  products.forEach((product: Product) => {
    const combinations = generateProductCombinations(product);
    allCombinations.push(...combinations);
  });
  
  return allCombinations;
};

