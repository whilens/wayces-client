import { createSlice } from '@reduxjs/toolkit';

// Вспомогательная функция для вычисления итогов
const calculateTotals = (items) => {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { totalQuantity, totalPrice };
};

// Middleware для автоматического пересчета итогов после изменений в корзине
const recalculateTotals = (state) => {
  const totals = calculateTotals(state.items);
  state.totalQuantity = totals.totalQuantity;
  state.totalPrice = totals.totalPrice;
};

const initialState = {
  items: [],
  totalQuantity: 0,
  totalPrice: 0,
  isLoading: false,
  error: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const { id, name, price, image, variants, variantString, quantity = 1 } = action.payload;
      
      // Создаем уникальный ключ для товара с вариантами
      const variantKey = variants ? JSON.stringify(variants) : null;
      const itemKey = variantKey ? `${id}-${variantKey}` : id;
      
      // Ищем существующий товар с такими же вариантами
      const existingItem = state.items.find((item) => {
        if (item.variants && variants) {
          return item.id === id && JSON.stringify(item.variants) === variantKey;
        }
        return item.id === id && !item.variants && !variants;
      });

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          id,
          name,
          price,
          image,
          quantity,
          variants: variants || null,
          variantString: variantString || null,
          itemKey, // Уникальный ключ для идентификации
        });
      }

      recalculateTotals(state);
    },
    removeItem: (state, action) => {
      // Может быть id или itemKey
      const identifier = action.payload;
      state.items = state.items.filter((item) => 
        item.id !== identifier && item.itemKey !== identifier
      );
      recalculateTotals(state);
    },
    updateQuantity: (state, action) => {
      const { id, itemKey, quantity } = action.payload;
      // Ищем по itemKey (приоритет) или id
      const item = state.items.find((item) => 
        (itemKey && item.itemKey === itemKey) || (!itemKey && item.id === id)
      );

      if (item) {
        if (quantity <= 0) {
          const identifier = item.itemKey || item.id;
          state.items = state.items.filter((item) => 
            item.itemKey !== identifier && item.id !== identifier
          );
        } else {
          item.quantity = quantity;
        }
      }

      recalculateTotals(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.totalQuantity = 0;
      state.totalPrice = 0;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, setLoading, setError } =
  cartSlice.actions;

export default cartSlice.reducer;

