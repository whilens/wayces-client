import { useState, useMemo, useEffect } from 'react';
import { formatProductNameWithVariants } from '../utils/helpers';
import { parseCombinationFromUrl } from '../utils/variantHelpers';
import { getImageUrl, getCombinationImage } from '../utils/imageUtils';

/**
 * Кастомный хук для управления вариантами товара
 * @param {Object} product - Товар с вариантами
 * @param {string} combinationFromUrl - Комбинация из URL
 * @returns {Object} Состояние и вычисляемые значения вариантов
 */
export const useProductVariants = (product, combinationFromUrl) => {
  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Создаем Map для быстрого доступа к опциям вариантов
  const variantOptionsMap = useMemo(() => {
    if (!product?.variants) return {};
    
    const map = {};
    Object.keys(product.variants).forEach((key) => {
      map[key] = new Map(
        product.variants[key].options.map(opt => [opt.id, opt])
      );
    });
    return map;
  }, [product]);

  // Инициализация выбранных вариантов
  useEffect(() => {
    if (product?.variants) {
      // Парсим комбинацию из URL
      const parsedVariants = combinationFromUrl
        ? parseCombinationFromUrl(combinationFromUrl, product.variants)
        : {};
      
      // Если не все варианты восстановлены из URL, используем значения по умолчанию
      const initialVariants = {};
      Object.keys(product.variants).forEach((key) => {
        initialVariants[key] = parsedVariants[key] || product.variants[key].default;
      });
      
      setSelectedVariants(initialVariants);
      setSelectedImageIndex(0);
    } else {
      setSelectedVariants({});
      setSelectedImageIndex(0);
    }
  }, [product, combinationFromUrl]);

  // Получение текущих изображений на основе выбранных вариантов
  const currentImages = useMemo(() => {
    // Если есть варианты и выбран цвет, используем изображения варианта цвета
    if (product?.variants && selectedVariants.color) {
      const colorVariant = product.variants.color;
      if (colorVariant && variantOptionsMap.color) {
        const selectedColor = variantOptionsMap.color.get(selectedVariants.color);
        if (selectedColor?.images && Array.isArray(selectedColor.images) && selectedColor.images.length > 0) {
          return selectedColor.images.map(img => getImageUrl(img));
        }
      }
    }

    // Используем все изображения товара, если они есть
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images.map(img => getImageUrl(img));
    }

    // Если нет изображений товара, используем defaultImage
    const defaultImg = product?.defaultImage || '';
    return defaultImg ? [getImageUrl(defaultImg)] : [''];
  }, [product, selectedVariants, variantOptionsMap]);

  // Вычисление итоговой цены с учетом выбранных вариантов
  const finalPrice = useMemo(() => {
    if (!product) return 0;
    
    let price = product.basePrice || product.price || 0;
    
    if (product.variants && Object.keys(selectedVariants).length > 0) {
      Object.keys(selectedVariants).forEach((variantKey) => {
        const optionMap = variantOptionsMap[variantKey];
        if (optionMap) {
          const selectedOption = optionMap.get(selectedVariants[variantKey]);
          if (selectedOption?.priceModifier) {
            price += selectedOption.priceModifier;
          }
        }
      });
    }
    
    return price;
  }, [product, selectedVariants, variantOptionsMap]);

  // Формируем полное название товара с вариантами
  const productFullName = useMemo(() => {
    if (!product) return '';
    
    if (product.variants && Object.keys(selectedVariants).length > 0) {
      return formatProductNameWithVariants(
        product.name,
        selectedVariants,
        product.variants
      );
    }
    
    return product.name;
  }, [product, selectedVariants]);

  // Проверка доступности комбинации
  const isCombinationAvailable = useMemo(() => {
    if (!product?.combinations || !product.combinations.length) {
      // Если нет комплектаций, все комбинации доступны
      return () => true;
    }

    // Создаем Set доступных комбинаций для быстрой проверки
    const availableCombinations = new Set();
    product.combinations.forEach((comb) => {
      if (comb.isActive !== false) {
        // Формируем ключ комбинации из вариантов
        const combKey = Object.keys(comb.variants || {})
          .sort()
          .map((key) => `${key}-${comb.variants[key]}`)
          .join('_');
        availableCombinations.add(combKey);
      }
    });

    // Функция проверки доступности комбинации
    return (variants) => {
      if (!variants || Object.keys(variants).length === 0) {
        return true; // Если ничего не выбрано, считаем доступным
      }

      // Формируем ключ для проверки
      const checkKey = Object.keys(variants)
        .sort()
        .map((key) => `${key}-${variants[key]}`)
        .join('_');

      return availableCombinations.has(checkKey);
    };
  }, [product]);

  // Проверка доступности опции варианта с учетом текущих выбранных вариантов
  const isOptionAvailable = useMemo(() => {
    if (!product?.combinations || !product.combinations.length) {
      // Если нет комплектаций, все опции доступны
      return () => () => true;
    }

    return (variantKey, optionId) => {
      // Создаем тестовую комбинацию с выбранной опцией
      const testVariants = {
        ...selectedVariants,
        [variantKey]: optionId,
      };

      // Проверяем, есть ли хотя бы одна доступная комбинация с этой опцией
      return product.combinations.some((comb) => {
        if (comb.isActive === false) return false;

        const combVariants = comb.variants || {};
        const combKeys = Object.keys(combVariants);

        // Проверяем, что все выбранные варианты совпадают с комбинацией
        return combKeys.every((key) => {
          if (key === variantKey) {
            return combVariants[key] === optionId;
          }
          return testVariants[key] === undefined || combVariants[key] === testVariants[key];
        });
      });
    };
  }, [product, selectedVariants]);

  // Обработчик выбора варианта
  const handleVariantChange = (variantKey, optionId) => {
    // Всегда обновляем выбранные варианты
    // Проверка доступности выполняется через isOptionAvailable для визуального отображения
    const newVariants = {
      ...selectedVariants,
      [variantKey]: optionId,
    };
    
    setSelectedVariants(newVariants);
    
    // Если меняется цвет, сбрасываем индекс изображения
    if (variantKey === 'color') {
      setSelectedImageIndex(0);
    }
  };

  return {
    selectedVariants,
    setSelectedVariants,
    selectedImageIndex,
    setSelectedImageIndex,
    currentImages,
    finalPrice,
    productFullName,
    handleVariantChange,
    variantOptionsMap, // Экспортируем для использования в компоненте
    isCombinationAvailable, // Функция проверки доступности комбинации
    isOptionAvailable, // Функция проверки доступности опции
  };
};

