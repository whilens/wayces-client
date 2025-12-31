/**
 * Утилиты для работы с вариантами товаров
 */

/**
 * Парсинг комбинации вариантов из URL строки
 * @param {string} combinationString - Строка комбинации вида "color-black_storage-256"
 * @param {Object} productVariants - Объект с вариантами товара
 * @returns {Object} Объект с выбранными вариантами { color: "color-black", storage: "storage-256" }
 */
export const parseCombinationFromUrl = (combinationString, productVariants) => {
  if (!combinationString || !productVariants) return {};
  
  const variantPairs = combinationString.split('_');
  const initialVariants = {};
  
  variantPairs.forEach((pair) => {
    const parts = pair.split('-');
    if (parts.length >= 2) {
      const variantKey = parts[0];
      const optionId = parts.slice(1).join('-'); // На случай если в ID есть дефисы
      
      if (productVariants[variantKey]) {
        // Ищем опцию по полному ID или частичному совпадению
        const option = productVariants[variantKey].options.find(
          (opt) => opt.id === optionId || opt.id.endsWith(optionId) || opt.id.includes(optionId)
        );
        if (option) {
          initialVariants[variantKey] = option.id;
        }
      }
    }
  });
  
  return initialVariants;
};

/**
 * Генерация строки вариантов для отображения
 * @param {Object} selectedVariants - Выбранные варианты
 * @param {Object} productVariants - Объект с вариантами товара
 * @returns {string} Строка вида "Цвет: Черный, Память: 256 ГБ"
 */
export const generateVariantString = (selectedVariants, productVariants) => {
  if (!selectedVariants || !productVariants || Object.keys(selectedVariants).length === 0) {
    return '';
  }

  return Object.keys(selectedVariants)
    .map((key) => {
      const variant = productVariants[key];
      if (!variant) return '';
      
      const option = variant.options.find((opt) => opt.id === selectedVariants[key]);
      if (!option) return '';
      
      return `${variant.name}: ${option.value}`;
    })
    .filter(Boolean)
    .join(', ');
};

