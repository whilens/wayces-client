import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addItem, updateQuantity, removeItem } from '../../store/slices/cartSlice';
import { addToFavorites, removeFromFavorites, checkFavorite } from '../../store/slices/favoritesSlice';
import { openAuthModal } from '../../store/slices/userSlice';
import { formatPrice, calculateDiscountedPrice } from '../../utils/helpers';
import { buildCombinationKeyFromVariants } from '../../utils/variantHelpers';
import { getImageUrl } from '../../utils/imageUtils';
import './ProductCard.css';

const ProductCard = React.memo(({ product, viewMode = 'grid' }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const cartItems = useAppSelector((state) => state.cart.items);
  const { isAuthenticated } = useAppSelector((state) => state.user);
  const { checkedItems } = useAppSelector((state) => state.favorites);
  
  const {
    id,
    productId, // ID базового товара (если это комбинация)
    name,
    fullName, // Полное название с вариантами
    price,
    priceMax, // Для displayAsProduct: макс. цена (от X – Y ₽)
    basePrice,
    image,
    defaultImage,
    description,
    variants, // Варианты комбинации
    combinationKey, // Ключ комбинации
    combinationId, // id строки product_combinations (список каталога с БД)
    linkCombinationKey, // Для displayAsProduct: куда вести с предвыбором (с бэкенда)
    linkCombinationId,
    displayAsProduct, // Одна карточка на товар — выбор варианта на странице товара
    discountType, // Тип скидки
    discountValue, // Значение скидки
  } = product;

  const baseProductId = productId || id; // Используем productId если есть (комбинация)
  const originalPrice = price || basePrice;
  const priceInfo = useMemo(() => calculateDiscountedPrice(originalPrice, discountType, discountValue), [originalPrice, discountType, discountValue]);
  const displayPrice = priceInfo.discountedPrice;
  const displayImage = getImageUrl(image || defaultImage);
  const displayName = fullName || name;
  const isFavorite = checkedItems[baseProductId] || false;
  // Для «одна карточка на товар»: показываем «от X ₽» или «от X – Y ₽»
  const isProductLevel = displayAsProduct === true;
  const priceMaxDiscounted = priceMax != null ? calculateDiscountedPrice(priceMax, discountType, discountValue).discountedPrice : null;
  const priceLabel = isProductLevel
    ? (priceMax != null && priceMax !== price ? `от ${formatPrice(displayPrice)} – ${formatPrice(priceMaxDiscounted)}` : `от ${formatPrice(displayPrice)}`)
    : null;

  const resolvedCombinationKey = useMemo(
    () => combinationKey || buildCombinationKeyFromVariants(variants),
    [combinationKey, variants]
  );

  const productDetailPath = useMemo(() => {
    const pid = baseProductId;
    const qs = new URLSearchParams();
    const setCombId = (raw) => {
      const n = raw != null ? Number(raw) : NaN;
      if (Number.isFinite(n) && n > 0) qs.set('combinationId', String(n));
    };
    if (isProductLevel) {
      setCombId(linkCombinationId);
      if (!qs.has('combinationId') && linkCombinationKey) {
        qs.set('combination', linkCombinationKey);
      }
    } else {
      setCombId(combinationId);
      if (!qs.has('combinationId') && resolvedCombinationKey) {
        qs.set('combination', resolvedCombinationKey);
      }
    }
    const s = qs.toString();
    return s ? `/products/${pid}?${s}` : `/products/${pid}`;
  }, [
    baseProductId,
    isProductLevel,
    linkCombinationId,
    linkCombinationKey,
    combinationId,
    resolvedCombinationKey,
  ]);

  // Проверяем, есть ли товар в корзине
  const cartItem = useMemo(() => {
    const variantKey = variants ? JSON.stringify(variants) : null;
    return cartItems.find((item) => {
      if (item.variants && variants) {
        return item.id === baseProductId && JSON.stringify(item.variants) === variantKey;
      }
      return item.id === baseProductId && !item.variants && !variants;
    });
  }, [cartItems, baseProductId, variants]);

  const handleAddToCart = useCallback((e) => {
    e.stopPropagation();
    dispatch(addItem({ 
      id: baseProductId, 
      name: displayName, 
      price: displayPrice, // Используем цену со скидкой
      image: displayImage,
      variants: variants || null,
      variantString: null, // Будет сформировано автоматически
    }));
    notification.success({
      message: 'Добавлено в корзину',
      description: displayName,
      placement: 'topRight',
    });
  }, [dispatch, baseProductId, displayName, displayPrice, displayImage, variants]);

  const handleQuantityChange = useCallback((newQuantity, e) => {
    if (e) e.stopPropagation();
    if (!cartItem) return;
    
    if (newQuantity <= 0) {
      dispatch(removeItem(cartItem.itemKey || cartItem.id));
    } else {
      dispatch(updateQuantity({ 
        id: cartItem.id, 
        itemKey: cartItem.itemKey, 
        quantity: newQuantity 
      }));
    }
  }, [dispatch, cartItem]);

  const handleCardClick = useCallback(() => {
    navigate(productDetailPath);
  }, [navigate, productDetailPath]);

  // Проверяем избранное при монтировании
  React.useEffect(() => {
    if (isAuthenticated && !(baseProductId in checkedItems)) {
      dispatch(checkFavorite(baseProductId));
    }
  }, [isAuthenticated, baseProductId, checkedItems, dispatch]);

  const handleFavoriteToggle = useCallback(async (e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      dispatch(openAuthModal({}));
      return;
    }

    if (isFavorite) {
      await dispatch(removeFromFavorites(baseProductId));
    } else {
      await dispatch(addToFavorites(baseProductId));
      notification.success({
        message: 'Добавлено в избранное',
        description: displayName,
        placement: 'topRight',
      });
    }
  }, [isAuthenticated, isFavorite, baseProductId, dispatch, displayName]);

  const formattedPrice = useMemo(() => formatPrice(displayPrice), [displayPrice]);
  const formattedOriginalPrice = useMemo(() => formatPrice(priceInfo.originalPrice), [priceInfo.originalPrice]);
  const displayPriceText = isProductLevel ? priceLabel : formattedPrice;
  const discountBadge = useMemo(() => {
    if (!priceInfo.hasDiscount) return null;
    if (discountType === 'percentage') {
      return `-${Math.round(priceInfo.discountPercent)}%`;
    } else {
      return `-${formatPrice(priceInfo.discountAmount)}`;
    }
  }, [priceInfo.hasDiscount, priceInfo.discountPercent, priceInfo.discountAmount, discountType]);

  // Для режима списка - отображение как в корзине
  if (viewMode === 'list') {
    return (
      <div className={`product-card product-card--list`}>
        <img 
          src={displayImage} 
          alt={name}
          className="product-card__image product-card__image--clickable"
          loading="lazy"
          onClick={handleCardClick}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/100?text=No+Image';
          }}
        />
        <div className="product-card__info" onClick={handleCardClick}>
          <h3 className="product-card__title">{displayName}</h3>
          {priceInfo.hasDiscount && !isProductLevel ? (
            <div className="product-card__price-container">
              <span className="product-card__price-original">{formattedOriginalPrice}</span>
              <span className="product-card__price-discounted">{displayPriceText}</span>
            </div>
          ) : (
            <p className="product-card__price-text">{displayPriceText}</p>
          )}
          {description && (
            <p className="product-card__description">{description}</p>
          )}
        </div>
        {cartItem && !isProductLevel ? (
          <div className="product-card__quantity">
            <button
              className="product-card__quantity-button"
              onClick={(e) => handleQuantityChange(cartItem.quantity - 1, e)}
              aria-label="Уменьшить количество"
            >
              −
            </button>
            <span className="product-card__quantity-value">{cartItem.quantity}</span>
            <button
              className="product-card__quantity-button"
              onClick={(e) => handleQuantityChange(cartItem.quantity + 1, e)}
              aria-label="Увеличить количество"
            >
              +
            </button>
          </div>
        ) : isProductLevel ? (
          <button
            className="product-card__add-button"
            onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
            aria-label="Выбрать вариант"
          >
            Выбрать вариант
          </button>
        ) : (
          <button
            className="product-card__add-button"
            onClick={handleAddToCart}
            aria-label={`Добавить ${name} в корзину`}
          >
            В корзину
          </button>
        )}
        {/* <div className="product-card__total">
          {formattedPrice}
        </div> */}
      </div>
    );
  }

  // Для режима плиток - обычное отображение
  return (
    <div className={`product-card product-card--${viewMode}`} onClick={handleCardClick}>
      <div className="product-card__image-wrapper">
        <img 
          src={displayImage} 
          alt={name}
          className="product-card__image"
          loading="lazy"
        />
        <button
          className={`product-card__favorite ${isFavorite ? 'product-card__favorite--active' : ''}`}
          onClick={handleFavoriteToggle}
          aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
          title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <div className="product-card__overlay">
          <button 
            className="product-card__button"
            onClick={(e) => { e.stopPropagation(); isProductLevel ? handleCardClick() : handleAddToCart(e); }}
            aria-label={isProductLevel ? 'Выбрать вариант' : `Добавить ${name} в корзину`}
          >
            {isProductLevel ? 'Выбрать вариант' : 'Добавить в корзину'}
          </button>
        </div>
      </div>
      
      <div className="product-card__content">
        <h3 className="product-card__title">{displayName}</h3>
        {description && (
          <p className="product-card__description">{description}</p>
        )}
        <div className="product-card__footer">
          {priceInfo.hasDiscount && !isProductLevel ? (
            <div className="product-card__price-container">
              <span className="product-card__price-original">{formattedOriginalPrice}</span>
              <span className="product-card__price-discounted">{displayPriceText}</span>
            </div>
          ) : (
            <span className="product-card__price">{displayPriceText}</span>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизированная функция сравнения для React.memo
  const prev = prevProps.product;
  const next = nextProps.product;

  return (
    prev.id === next.id &&
    prev.productId === next.productId &&
    prev.price === next.price &&
    prev.priceMax === next.priceMax &&
    prev.basePrice === next.basePrice &&
    prev.fullName === next.fullName &&
    prev.name === next.name &&
    prev.combinationKey === next.combinationKey &&
    prev.combinationId === next.combinationId &&
    prev.linkCombinationKey === next.linkCombinationKey &&
    prev.linkCombinationId === next.linkCombinationId &&
    prev.displayAsProduct === next.displayAsProduct &&
    prev.image === next.image &&
    prev.defaultImage === next.defaultImage &&
    prevProps.viewMode === nextProps.viewMode &&
    JSON.stringify(prev.variants) === JSON.stringify(next.variants)
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;

