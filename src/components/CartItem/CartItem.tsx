import React, { useMemo } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { updateQuantity, removeItem } from '../../store/slices/cartSlice';
import { formatPrice } from '../../utils/helpers';
import './CartItem.css';

type CartItemData = {
  id: number | string;
  itemKey?: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

type CartItemProps = {
  item: CartItemData;
};

const CartItem = React.memo(({ item }: CartItemProps) => {
  const dispatch = useAppDispatch();
  
  const itemTotal = useMemo(() => item.price * item.quantity, [item.price, item.quantity]);
  const formattedItemPrice = useMemo(() => formatPrice(item.price), [item.price]);
  const formattedItemTotal = useMemo(() => formatPrice(itemTotal), [itemTotal]);
  const itemKey = item.itemKey || item.id;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity <= 0) {
      dispatch(removeItem(itemKey));
    } else {
      dispatch(updateQuantity({ id: item.id, itemKey: itemKey, quantity: newQuantity }));
    }
  };

  const handleRemove = () => {
    dispatch(removeItem(itemKey));
  };

  return (
    <div className="cart-item">
      <img 
        src={item.image} 
        alt={item.name} 
        className="cart-item__image"
        loading="lazy"
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image';
        }}
      />
      <div className="cart-item__info">
        <h3 className="cart-item__name">{item.name}</h3>
        <p className="cart-item__price">{formattedItemPrice}</p>
      </div>
      <div className="cart-item__quantity">
        <button
          className="cart-item__quantity-button"
          onClick={() => handleQuantityChange(item.quantity - 1)}
          aria-label="Уменьшить количество"
        >
          −
        </button>
        <span className="cart-item__quantity-value">{item.quantity}</span>
        <button
          className="cart-item__quantity-button"
          onClick={() => handleQuantityChange(item.quantity + 1)}
          aria-label="Увеличить количество"
        >
          +
        </button>
      </div>
      <div className="cart-item__total">
        {formattedItemTotal}
      </div>
      {/* <button
        className="cart-item__remove"
        onClick={handleRemove}
        aria-label="Удалить товар"
      >
        ×
      </button> */}
    </div>
  );
}, (prevProps: Readonly<CartItemProps>, nextProps: Readonly<CartItemProps>) => {
  // Оптимизированное сравнение
  const prev = prevProps.item;
  const next = nextProps.item;
  
  return (
    prev.itemKey === next.itemKey &&
    prev.price === next.price &&
    prev.quantity === next.quantity &&
    prev.name === next.name
  );
});

CartItem.displayName = 'CartItem';

export default CartItem;

