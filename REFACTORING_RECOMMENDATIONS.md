# Рекомендации по рефакторингу и оптимизации

## 🔴 Критические проблемы

### 1. **ProductDetail.jsx - Дублирование логики форматирования названия**
**Проблема:** `formatProductNameWithVariants` вызывается дважды:
- В `productFullName` (useMemo)
- В `handleAddToCart` (без мемоизации)

**Решение:**
```javascript
// Использовать уже вычисленный productFullName
const handleAddToCart = () => {
  if (!currentProduct) return;
  
  dispatch(addItem({
    id: currentProduct.id,
    name: productFullName, // Используем уже вычисленное значение
    price: finalPrice,
    image: currentImages[0],
    quantity: 1,
    variants: selectedVariants,
    variantString: generateVariantString(selectedVariants, currentProduct.variants),
  }));
};
```

### 2. **Cart.jsx - Форматирование цен в цикле**
**Проблема:** `formatPrice` вызывается для каждого товара в цикле без мемоизации

**Решение:**
```javascript
// Вынести в отдельный компонент CartItem с мемоизацией
const CartItem = React.memo(({ item }) => {
  const formattedItemPrice = useMemo(() => formatPrice(item.price), [item.price]);
  const formattedItemTotal = useMemo(() => formatPrice(item.price * item.quantity), [item.price, item.quantity]);
  // ...
});
```

### 3. **cartSlice.js - Дублирование calculateTotals**
**Проблема:** `calculateTotals` вызывается в каждом reducer

**Решение:** Использовать `prepareReducer` или middleware для автоматического пересчета:
```javascript
// Добавить в extraReducers
.addMatcher(
  (action) => action.type.startsWith('cart/'),
  (state) => {
    const totals = calculateTotals(state.items);
    state.totalQuantity = totals.totalQuantity;
    state.totalPrice = totals.totalPrice;
  }
)
```

### 4. **ProductDetail.jsx - Сложная логика парсинга URL**
**Проблема:** Парсинг `combinationFromUrl` выполняется в useEffect, логика сложная

**Решение:** Вынести в отдельную утилиту:
```javascript
// utils/variantHelpers.js
export const parseCombinationFromUrl = (combinationString, productVariants) => {
  if (!combinationString || !productVariants) return {};
  
  const variantPairs = combinationString.split('_');
  const initialVariants = {};
  
  variantPairs.forEach((pair) => {
    const parts = pair.split('-');
    if (parts.length >= 2) {
      const variantKey = parts[0];
      const optionId = parts.slice(1).join('-');
      
      if (productVariants[variantKey]) {
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
```

## 🟡 Важные оптимизации

### 5. **ProductCard.jsx - Неоптимальная функция сравнения для React.memo**
**Проблема:** Сравнение не учитывает все важные поля (fullName, variants, combinationKey)

**Решение:**
```javascript
}, (prevProps, nextProps) => {
  const prev = prevProps.product;
  const next = nextProps.product;
  
  return (
    prev.id === next.id &&
    prev.productId === next.productId &&
    prev.price === next.price &&
    prev.fullName === next.fullName &&
    prev.combinationKey === next.combinationKey &&
    JSON.stringify(prev.variants) === JSON.stringify(next.variants)
  );
});
```

### 6. **ProductDetail.jsx - Множественные find() в циклах**
**Проблема:** В `finalPrice` и других местах используется `find()` в циклах

**Решение:** Создать Map для быстрого доступа:
```javascript
const variantOptionsMap = useMemo(() => {
  if (!currentProduct?.variants) return {};
  
  const map = {};
  Object.keys(currentProduct.variants).forEach((key) => {
    map[key] = new Map(
      currentProduct.variants[key].options.map(opt => [opt.id, opt])
    );
  });
  return map;
}, [currentProduct]);
```

### 7. **mockData.js - Неэффективная фильтрация**
**Проблема:** Фильтры применяются последовательно, можно оптимизировать

**Решение:** Использовать один проход:
```javascript
const filteredProducts = products.filter((p) => {
  if (params.category && p.category !== params.category) return false;
  if (params.minPrice && p.price < params.minPrice) return false;
  if (params.maxPrice && p.price > params.maxPrice) return false;
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    if (!p.fullName?.toLowerCase().includes(searchLower) &&
        !p.name.toLowerCase().includes(searchLower) &&
        !p.description?.toLowerCase().includes(searchLower)) {
      return false;
    }
  }
  return true;
});
```

### 8. **Header.jsx - Создание URLSearchParams на каждом рендере**
**Проблема:** `new URLSearchParams(window.location.search)` создается при каждом рендере

**Решение:** Использовать `useSearchParams` из react-router-dom:
```javascript
import { useSearchParams } from 'react-router-dom';

const [searchParams] = useSearchParams();
const combinationFromUrl = searchParams.get('combination');
```

### 9. **productCombinations.js - Неиспользуемая переменная variantValues**
**Проблема:** `variantValues` создается, но не используется

**Решение:** Удалить неиспользуемый код

### 10. **Cart.jsx - Отсутствие управления количеством**
**Проблема:** Нет кнопок увеличения/уменьшения количества

**Решение:** Добавить компонент управления количеством:
```javascript
const QuantityControl = ({ item, onUpdate }) => (
  <div className="quantity-control">
    <button onClick={() => onUpdate(item.itemKey, item.quantity - 1)}>-</button>
    <span>{item.quantity}</span>
    <button onClick={() => onUpdate(item.itemKey, item.quantity + 1)}>+</button>
  </div>
);
```

## 🟢 Улучшения кода

### 11. **Вынести константы**
**Проблема:** Магические числа и строки разбросаны по коду

**Решение:**
```javascript
// utils/constants.js
export const VARIANT_ORDER = ['storage', 'memory', 'ram', 'size', 'color'];
export const SCROLL_THRESHOLD = 50;
export const API_DELAY = 300;
```

### 12. **Создать кастомные хуки**
**Проблема:** Дублирование логики в компонентах

**Решение:**
```javascript
// hooks/useProductVariants.js
export const useProductVariants = (product, initialVariants = {}) => {
  const [selectedVariants, setSelectedVariants] = useState(initialVariants);
  
  const currentPrice = useMemo(() => {
    // логика вычисления цены
  }, [product, selectedVariants]);
  
  const currentImages = useMemo(() => {
    // логика получения изображений
  }, [product, selectedVariants]);
  
  return { selectedVariants, setSelectedVariants, currentPrice, currentImages };
};
```

### 13. **Разделить ProductDetail на подкомпоненты**
**Проблема:** Компонент слишком большой (330 строк)

**Решение:**
- `ProductGallery` - галерея изображений
- `ProductInfo` - основная информация
- `ProductVariants` - выбор вариантов
- `ProductSpecs` - характеристики
- `ProductActions` - кнопки действий

### 14. **Добавить обработку ошибок**
**Проблема:** Нет обработки ошибок при загрузке изображений

**Решение:**
```javascript
const [imageError, setImageError] = useState(false);

<img 
  src={image}
  onError={() => setImageError(true)}
  alt={name}
/>
{imageError && <div>Изображение не загружено</div>}
```

### 15. **Оптимизировать селекторы Redux**
**Проблема:** Селекторы не мемоизированы с помощью `createSelector`

**Решение:**
```javascript
import { createSelector } from '@reduxjs/toolkit';

export const selectCartItems = (state) => state.cart.items;

export const selectCartTotalQuantity = createSelector(
  [selectCartItems],
  (items) => items.reduce((sum, item) => sum + item.quantity, 0)
);

export const selectCartTotalPrice = createSelector(
  [selectCartItems],
  (items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);
```

### 16. **Добавить типизацию (TypeScript)**
**Проблема:** Нет типизации, возможны ошибки времени выполнения

**Решение:** Постепенно мигрировать на TypeScript или добавить PropTypes

### 17. **Оптимизировать генерацию комбинаций**
**Проблема:** Генерация всех комбинаций может быть медленной для товаров с большим количеством вариантов

**Решение:** 
- Кэшировать результаты
- Генерировать лениво (по требованию)
- Использовать Web Worker для тяжелых вычислений

### 18. **Добавить виртуализацию для больших списков**
**Проблема:** Рендеринг всех товаров может быть медленным

**Решение:** Использовать `react-window` или `react-virtualized` для виртуализации списка товаров

### 19. **Оптимизировать изображения**
**Проблема:** Все изображения загружаются сразу

**Решение:**
- Использовать lazy loading (уже есть)
- Добавить placeholder/skeleton
- Использовать WebP формат
- Добавить srcset для адаптивных изображений

### 20. **Добавить мемоизацию для навигации**
**Проблема:** `handleCardClick` создается заново для каждой карточки

**Решение:** Уже используется `useCallback`, но можно оптимизировать формирование URL:
```javascript
const productUrl = useMemo(() => {
  const url = `/products/${baseProductId}`;
  if (combinationKey) {
    return `${url}?combination=${combinationKey}`;
  }
  return url;
}, [baseProductId, combinationKey]);
```

## 📊 Приоритеты

### Высокий приоритет:
1. ✅ Оптимизация форматирования цен в Cart
2. ✅ Вынос парсинга URL в утилиту
3. ✅ Исправление функции сравнения в ProductCard
4. ✅ Оптимизация calculateTotals в cartSlice

### Средний приоритет:
5. ✅ Создание кастомных хуков
6. ✅ Разделение ProductDetail на компоненты
7. ✅ Мемоизация селекторов Redux
8. ✅ Оптимизация фильтрации в mockData

### Низкий приоритет:
9. ✅ Добавление TypeScript
10. ✅ Виртуализация списков
11. ✅ Оптимизация изображений

