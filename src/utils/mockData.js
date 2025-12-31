import mockProducts from '../data/mockProducts.json';
import mockProductsWithVariants from '../data/mockProductsWithVariants.json';
import { generateAllProductCombinations } from './productCombinations';

/**
 * Симуляция задержки API запроса
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Получить все товары (с симуляцией задержки)
 * Возвращает все комбинации вариантов как отдельные товары
 */
export const getMockProducts = async (params = {}) => {
  await delay(300); // Симуляция задержки сети

  // Используем товары с вариантами, если они есть, иначе старые
  const allProducts = mockProductsWithVariants.length > 0 
    ? [...mockProductsWithVariants, ...mockProducts.filter(p => !mockProductsWithVariants.find(v => v.id === p.id))]
    : [...mockProducts];

  // Генерируем все комбинации вариантов
  let products = generateAllProductCombinations(allProducts);

  // Оптимизированная фильтрация - один проход вместо множественных
  if (params.category || params.minPrice || params.maxPrice || params.search) {
    const searchLower = params.search?.toLowerCase();
    products = products.filter((p) => {
      // Фильтр по категории
      if (params.category && p.category !== params.category) return false;
      
      // Фильтр по минимальной цене
      if (params.minPrice && p.price < params.minPrice) return false;
      
      // Фильтр по максимальной цене
      if (params.maxPrice && p.price > params.maxPrice) return false;
      
      // Фильтр по поисковому запросу
      if (searchLower) {
        const matchesSearch = 
          (p.fullName && p.fullName.toLowerCase().includes(searchLower)) ||
          p.name.toLowerCase().includes(searchLower) ||
          (p.description && p.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }

  // Пагинация
  const page = params.page || 1;
  const limit = params.limit || 12;
  const start = (page - 1) * limit;
  const end = start + limit;
  const total = products.length;
  const paginatedProducts = products.slice(start, end);

  return {
    products: paginatedProducts,
    total,
    page,
    limit,
  };
};

/**
 * Получить товар по ID (базовый товар, не комбинация)
 */
export const getMockProductById = async (id) => {
  await delay(200);
  
  // Парсим ID - может быть "1" или "1-combinationKey"
  const productId = parseInt(id.toString().split('-')[0]);
  
  // Сначала ищем в товарах с вариантами
  let product = mockProductsWithVariants.find((p) => p.id === productId);
  
  // Если не нашли, ищем в старых данных
  if (!product) {
    product = mockProducts.find((p) => p.id === productId);
  }
  
  if (!product) {
    throw new Error('Товар не найден');
  }
  
  return product;
};

/**
 * Получить рекомендуемые товары (первые 3)
 */
export const getFeaturedProducts = () => {
  const allProducts = mockProductsWithVariants.length > 0 
    ? [...mockProductsWithVariants, ...mockProducts.filter(p => !mockProductsWithVariants.find(v => v.id === p.id))]
    : [...mockProducts];
  return allProducts.slice(0, 3);
};

export default mockProducts;

