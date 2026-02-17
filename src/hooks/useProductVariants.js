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

  // Карта комбинаций: ключ -> { combination, stockQuantity } для проверки остатка
  const combinationsMap = useMemo(() => {
    const map = new Map();
    if (!product?.combinations?.length) return map;
    product.combinations.forEach((comb) => {
      if (comb.isActive === false) return;
      const combKey = Object.keys(comb.variants || {})
        .sort()
        .map((k) => `${k}-${comb.variants[k]}`)
        .join('_');
      map.set(combKey, { combination: comb, stockQuantity: comb.stockQuantity ?? 0 });
    });
    return map;
  }, [product]);

  // Инициализация выбранных вариантов: только существующая и с остатком > 0
  useEffect(() => {
    if (product?.variants) {
      const parsedVariants = combinationFromUrl
        ? parseCombinationFromUrl(combinationFromUrl, product.variants)
        : {};
      const initialVariants = {};
      Object.keys(product.variants).forEach((key) => {
        initialVariants[key] = parsedVariants[key] || product.variants[key].default;
      });

      const keyFromVariants = (v) =>
        Object.keys(v)
          .sort()
          .map((k) => `${k}-${v[k]}`)
          .join('_');
      const initialKey = keyFromVariants(initialVariants);
      const entry = combinationsMap.get(initialKey);
      const inStock = entry && entry.stockQuantity > 0;

      if (inStock) {
        setSelectedVariants(initialVariants);
      } else {
        // Подставляем первую комплектацию с остатком > 0
        const firstInStock = product.combinations.find((c) => c.isActive !== false && (c.stockQuantity ?? 0) > 0);
        if (firstInStock?.variants && Object.keys(firstInStock.variants).length > 0) {
          setSelectedVariants({ ...firstInStock.variants });
        } else {
          setSelectedVariants(initialVariants);
        }
      }
      setSelectedImageIndex(0);
    } else {
      setSelectedVariants({});
      setSelectedImageIndex(0);
    }
  }, [product, combinationFromUrl, combinationsMap]);

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

  // Проверка доступности комбинации: существует и остаток > 0
  const isCombinationAvailable = useMemo(() => {
    if (!product?.combinations?.length) return () => true;
    return (variants) => {
      if (!variants || Object.keys(variants).length === 0) return true;
      const checkKey = Object.keys(variants)
        .sort()
        .map((key) => `${key}-${variants[key]}`)
        .join('_');
      const entry = combinationsMap.get(checkKey);
      return entry && entry.stockQuantity > 0;
    };
  }, [product, combinationsMap]);

  // Текущая комплектация по выбранным вариантам (для цены, остатка, блокировки кнопок)
  const currentCombination = useMemo(() => {
    if (!selectedVariants || Object.keys(selectedVariants).length === 0) return null;
    const key = Object.keys(selectedVariants)
      .sort()
      .map((k) => `${k}-${selectedVariants[k]}`)
      .join('_');
    const entry = combinationsMap.get(key);
    return entry ? entry.combination : null;
  }, [selectedVariants, combinationsMap]);

  // Проверка доступности опции: есть хотя бы одна комбинация с этой опцией (остаток не учитываем — опция может быть выбрана, но «нет в наличии»)
  const isOptionAvailable = useMemo(() => {
    if (!product?.combinations?.length) return () => () => true;
    return (variantKey, optionId) => {
      const testVariants = { ...selectedVariants, [variantKey]: optionId };
      return product.combinations.some((comb) => {
        if (comb.isActive === false) return false;
        const combVariants = comb.variants || {};
        return Object.keys(combVariants).every((key) => {
          if (key === variantKey) return combVariants[key] === optionId;
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
    variantOptionsMap,
    isCombinationAvailable,
    isOptionAvailable,
    currentCombination, // { id, combinationKey, price, stockQuantity, variants } или null
  };
};

