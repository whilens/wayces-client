import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import {
  selectCartItems,
  selectCartTotalQuantity,
  selectCartTotalPrice,
} from '../../store/selectors/cartSelectors';
import { formatPrice } from '../../utils/helpers';
import { ROUTES } from '../../utils/constants';
import CartItem from '../../components/CartItem/CartItem';
import './Cart.css';

const Cart = () => {
  const items = useAppSelector(selectCartItems) as Array<{
    id: number;
    itemKey?: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
  }>;
  const totalQuantity = useAppSelector(selectCartTotalQuantity);
  const totalPrice = useAppSelector(selectCartTotalPrice);

  // Хуки должны быть вызваны до условных возвратов
  const formattedTotalPrice = useMemo(() => formatPrice(totalPrice), [totalPrice]);

  if (items.length === 0) {
    return (
      <div className="cart cart--empty">
        <div className="cart__container">
          <h1 className="cart__title">Корзина пуста</h1>
          <p className="cart__empty-text">Добавьте товары в корзину</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart">
      <div className="cart__container">
        <h1 className="cart__title">Корзина</h1>
        <div className="cart__content">
          <div className="cart__items">
            {items.map((item) => (
              <CartItem key={item.itemKey || item.id} item={item} />
            ))}
          </div>
          <div className="cart__summary">
            <h2 className="cart__summary-title">Итого</h2>
            <div className="cart__summary-row">
              <span>Товаров:</span>
              <span>{totalQuantity}</span>
            </div>
            <div className="cart__summary-row cart__summary-row--total">
              <span>Сумма:</span>
              <span>{formattedTotalPrice}</span>
            </div>
            <Link to={ROUTES.CHECKOUT} className="cart__checkout-button">
              Оформить заказ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

