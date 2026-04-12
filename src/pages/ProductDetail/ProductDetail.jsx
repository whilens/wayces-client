import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { notification } from 'antd';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProductById, clearCurrentProduct } from '../../store/slices/productsSlice';
import { addItem } from '../../store/slices/cartSlice';
import { formatPrice, calculateDiscountedPrice } from '../../utils/helpers';
import { generateVariantString, buildCombinationKeyFromVariants } from '../../utils/variantHelpers';
import { useProductVariants } from '../../hooks/useProductVariants';
import { ROUTES } from '../../utils/constants';
import ProductReviews from '../../components/ProductReviews/ProductReviews';
import ProductCard from '../../components/ProductCard/ProductCard';
import { searchAPI, categoryConfigAPI } from '../../services/api';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentProduct, isLoading, error } = useAppSelector((state) => state.products);
  
  const [searchParams, setSearchParams] = useSearchParams();

  // Снимок query при открытии карточки этого товара (только смена :id в маршруте), иначе при обновлении ?combination сбросит выбор
  const initialUrlParams = useMemo(
    () => ({
      combination: searchParams.get('combination'),
      combinationId: searchParams.get('combinationId'),
    }),
    [id]
  );

  const {
    selectedVariants,
    selectedImageIndex,
    setSelectedImageIndex,
    currentImages,
    finalPrice,
    productFullName,
    handleVariantChange,
    isOptionAvailable,
    isCombinationAvailable,
    currentCombination,
  } = useProductVariants(currentProduct, initialUrlParams, id);

  // Обновляем query при смене комплектации (шаринг ссылки, история с replace)
  useEffect(() => {
    if (!currentProduct?.variants) return;
    if (id && String(currentProduct.id) !== String(id)) return;
    if (!Object.keys(selectedVariants).length) return;

    const next = new URLSearchParams(searchParams);
    next.delete('combination');
    next.delete('combinationId');

    const hasDbCombinations = (currentProduct.combinations?.length ?? 0) > 0;
    if (hasDbCombinations && currentCombination?.id != null) {
      next.set('combinationId', String(currentCombination.id));
    } else {
      const key = buildCombinationKeyFromVariants(selectedVariants);
      if (key) next.set('combination', key);
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    id,
    selectedVariants,
    currentCombination,
    currentProduct?.id,
    currentProduct?.variants,
    currentProduct?.combinations?.length,
    searchParams,
    setSearchParams,
  ]);

  // Можно добавить в корзину: нет вариантов — всегда; есть варианты — только существующая комплектация с остатком > 0
  const canAddToCart = !currentProduct?.combinations?.length || (currentCombination && (currentCombination.stockQuantity ?? 0) > 0);

  // Состояние модального окна для просмотра изображений
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  
  // Статистика отзывов
  const [reviewsStats, setReviewsStats] = useState({
    averageRating: 0,
    totalReviews: 0,
  });

  // Похожие товары
  const [similarProducts, setSimilarProducts] = useState([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  
  // Конфигурация категории для маппинга названий характеристик
  const [categoryConfig, setCategoryConfig] = useState(null);

  useEffect(() => {
    if (id) {
      // Очищаем предыдущий товар перед загрузкой нового
      dispatch(clearCurrentProduct());
      dispatch(fetchProductById(id));
      // Сбрасываем статистику отзывов
      setReviewsStats({ averageRating: 0, totalReviews: 0 });
      // Сбрасываем похожие товары
      setSimilarProducts([]);
      // Сбрасываем конфигурацию категории
      setCategoryConfig(null);
    }
  }, [id, dispatch]);

  // Используем конфигурацию категории из ответа API товара (если есть)
  // Если нет - загружаем отдельно (fallback)
  useEffect(() => {
    if (!currentProduct) return;
    
    if (currentProduct?.categoryConfig) {
      // Конфигурация уже пришла с товаром
      setCategoryConfig(currentProduct.categoryConfig);
    } else if (currentProduct?.categoryId) {
      // Fallback: загружаем отдельно, если не пришла с товаром
      const loadCategoryConfig = async () => {
        try {
          const response = await categoryConfigAPI.getConfig(currentProduct.categoryId);
          setCategoryConfig(response.data);
        } catch (error) {
          console.error('Ошибка загрузки конфигурации категории:', error);
          setCategoryConfig(null);
        }
      };
      loadCategoryConfig();
    } else {
      setCategoryConfig(null);
    }
  }, [currentProduct?.id]);

  // Создаем маппинг ключей характеристик на их названия и единицы измерения
  const specLabelsMap = useMemo(() => {
    // Если есть готовый маппинг из API - используем его
    if (categoryConfig?.specLabelsMap) {
      return categoryConfig.specLabelsMap;
    }
    // Иначе создаем из specifications
    if (!categoryConfig?.specifications) {
      return {};
    }
    const map = {};
    categoryConfig.specifications.forEach(spec => {
      if (spec.key && spec.label) {
        map[spec.key] = spec.label;
      }
    });
    return map;
  }, [categoryConfig]);

  // Создаем маппинг ключей характеристик на их единицы измерения
  const specUnitsMap = useMemo(() => {
    if (!categoryConfig?.specifications) {
      return {};
    }
    const map = {};
    categoryConfig.specifications.forEach(spec => {
      if (spec.key && spec.unit) {
        map[spec.key] = spec.unit;
      }
    });
    return map;
  }, [categoryConfig]);

  // Загрузка похожих товаров
  useEffect(() => {
    if (!id || !currentProduct || !currentProduct.id) {
      return;
    }

    const productId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(productId)) {
      return;
    }

    const loadSimilar = async () => {
      setIsLoadingSimilar(true);
      try {
        const response = await searchAPI.getSimilar(productId, 6);
        if (response?.data?.products) {
          setSimilarProducts(response.data.products);
        }
      } catch (error) {
        console.error('Ошибка загрузки похожих товаров:', error);
        setSimilarProducts([]);
      } finally {
        setIsLoadingSimilar(false);
      }
    };

    loadSimilar();
  }, [id, currentProduct]);
  
  // Обработчик обновления статистики отзывов
  const handleStatsChange = (stats) => {
    setReviewsStats({
      averageRating: stats.averageRating || 0,
      totalReviews: stats.totalReviews || 0,
    });
  };

  // Подготовка данных товара для добавления в корзину
  const prepareCartItem = useCallback(() => {
    if (!currentProduct) return null;
    
    const variantString = currentProduct.variants
      ? generateVariantString(selectedVariants, currentProduct.variants)
      : '';

    const priceToUse = currentCombination?.price != null ? parseFloat(currentCombination.price) : finalPrice;
    const priceInfoCart = calculateDiscountedPrice(priceToUse, currentProduct.discountType, currentProduct.discountValue);
    return {
      id: currentProduct.id,
      name: productFullName,
      price: priceInfoCart.discountedPrice,
      image: currentImages[0],
      quantity: 1,
      variants: selectedVariants,
      variantString,
    };
  }, [currentProduct, productFullName, finalPrice, currentImages, selectedVariants, currentCombination]);

  // Добавление в корзину
  const handleAddToCart = () => {
    if (!canAddToCart) {
      notification.warning({
        message: 'Нет в наличии',
        description: 'Эта комплектация временно недоступна. Выберите другую или зайдите позже.',
        placement: 'topRight',
      });
      return;
    }
    const cartItem = prepareCartItem();
    if (!cartItem) return;
    dispatch(addItem(cartItem));
    notification.success({
      message: 'Добавлено в корзину',
      description: productFullName,
      placement: 'topRight',
    });
  };

  // Купить сейчас - добавляет в корзину и переходит на страницу оформления
  const handleBuyNow = () => {
    if (!canAddToCart) {
      notification.warning({
        message: 'Нет в наличии',
        description: 'Эта комплектация временно недоступна. Выберите другую или зайдите позже.',
        placement: 'topRight',
      });
      return;
    }
    const cartItem = prepareCartItem();
    if (!cartItem) return;
    dispatch(addItem(cartItem));
    notification.success({
      message: 'Добавлено в корзину',
      description: productFullName,
      placement: 'topRight',
    });
    navigate(ROUTES.CHECKOUT);
  };

  // Копирование артикула (SKU) в буфер обмена
  const displaySku = currentCombination?.sku || currentProduct?.sku || null;
  const handleCopySku = useCallback(() => {
    if (!displaySku) return;
    navigator.clipboard.writeText(displaySku).then(() => {
      notification.success({
        message: 'Артикул скопирован',
        description: displaySku,
        placement: 'topRight',
      });
    }).catch(() => {
      notification.error({
        message: 'Не удалось скопировать',
        placement: 'topRight',
      });
    });
  }, [displaySku]);

  // Открытие модального окна с изображением
  const handleImageClick = () => {
    setModalImageIndex(selectedImageIndex);
    setIsImageModalOpen(true);
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setIsImageModalOpen(false);
  };

  // Навигация по изображениям в модальном окне
  const handlePrevImage = (e) => {
    e.stopPropagation();
    setModalImageIndex((prev) => (prev > 0 ? prev - 1 : currentImages.length - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setModalImageIndex((prev) => (prev < currentImages.length - 1 ? prev + 1 : 0));
  };

  // Закрытие по ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isImageModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isImageModalOpen]);

  // Блокировка скролла при открытом модальном окне
  useEffect(() => {
    if (isImageModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isImageModalOpen]);

  if (isLoading) {
    return (
      <div className="product-detail-loading">
        <p>Загрузка товара...</p>
      </div>
    );
  }

  if (error || !currentProduct) {
    const errorMessage = error && typeof error === 'object' ? (error.message || error.error || 'Товар не найден') : 'Товар не найден';
    return (
      <div className="product-detail-error">
        <p>{errorMessage}</p>
        <button onClick={() => navigate('/products')}>Вернуться к каталогу</button>
      </div>
    );
  }

  return (
    <div className="product-detail">
      <div className="product-detail__container">
        <button
          className="product-detail__back-button"
          onClick={() => navigate(ROUTES.PRODUCTS)}
        >
          ← Вернуться к каталогу
        </button>
        <div className="product-detail__content">
          {/* Галерея изображений слева */}
          <div className="product-detail__gallery">
            <div className="product-detail__main-image" onClick={handleImageClick}>
              <img
                src={currentImages[selectedImageIndex]}
                alt={currentProduct.name}
                className="product-detail__image"
              />
              <div className="product-detail__image-overlay">
                <span className="product-detail__zoom-icon">🔍</span>
              </div>
            </div>
            {currentImages.length > 1 && (
              <div className="product-detail__thumbnails">
                {currentImages.map((image, index) => (
                  <button
                    key={index}
                    className={`product-detail__thumbnail ${
                      selectedImageIndex === index ? 'product-detail__thumbnail--active' : ''
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={image} alt={`${currentProduct.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Информация и комплектации справа */}
          <div className="product-detail__info">
            <h1 className="product-detail__title">{productFullName}</h1>

            {displaySku && (
              <div className="product-detail__sku" onClick={handleCopySku} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleCopySku()} title="Нажмите, чтобы скопировать артикул">
                <span className="product-detail__sku-label">Артикул:</span>
                <span className="product-detail__sku-value">{displaySku}</span>
                <span className="product-detail__sku-copy" aria-hidden>📋</span>
              </div>
            )}

            {reviewsStats.totalReviews > 0 ? (
              <div className="product-detail__rating">
                <span className="product-detail__stars">
                  {'★'.repeat(Math.floor(reviewsStats.averageRating))}
                  {reviewsStats.averageRating % 1 >= 0.5 && '☆'}
                </span>
                <span className="product-detail__rating-value">
                  {reviewsStats.averageRating.toFixed(1)} | {reviewsStats.totalReviews} {getReviewWord(reviewsStats.totalReviews)}
                </span>
              </div>
            ) : (
              <div className="product-detail__rating">
                <span className="product-detail__rating-value product-detail__rating-value--no-reviews">
                  Нет отзывов
                </span>
              </div>
            )}

            <div className="product-detail__price">
              {(() => {
                if (!currentProduct) return formatPrice(0);
                
                const priceInfo = calculateDiscountedPrice(
                  finalPrice,
                  currentProduct.discountType || null,
                  currentProduct.discountValue || null
                );
                
                if (priceInfo.hasDiscount) {
                  return (
                    <div className="product-detail__price-container">
                      <span className="product-detail__price-original">{formatPrice(priceInfo.originalPrice)}</span>
                      <div className="product-detail__price-discounted-badge">
                        <p className="product-detail__price-discounted-text">
                          {formatPrice(priceInfo.discountedPrice)}
                        </p>
                      </div>
                    </div>
                  );
                }
                return formatPrice(finalPrice);
              })()}
            </div>

            {currentProduct.specifications && (
              <div className="product-detail__specs">
                <h3 className="product-detail__specs-title">Характеристики:</h3>
                <ul className="product-detail__specs-list">
                  {Object.entries(currentProduct.specifications).map(([key, value]) => {
                    const label = specLabelsMap[key] || key;
                    const unit = specUnitsMap[key];
                    const displayValue = unit ? `${value} ${unit}` : value;
                    return (
                      <li key={key} className="product-detail__specs-item">
                        <span className="product-detail__specs-key">{label}:</span>
                        <span className="product-detail__specs-value">{displayValue}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Выбор комплектаций */}
            {currentProduct.variants && (
              <div className="product-detail__variants">
                {Object.entries(currentProduct.variants).map(([variantKey, variant]) => (
                  <div key={variantKey} className="product-detail__variant-group">
                    <label className="product-detail__variant-label">{variant.name}:</label>
                    <div className={`product-detail__variant-options product-detail__variant-options--${variant.type}`}>
                      {variant.options.map((option) => {
                        const isSelected = selectedVariants[variantKey] === option.id;
                        const isOptionAvailableCheck = isOptionAvailable 
                          ? isOptionAvailable(variantKey, option.id)
                          : (option.available !== false);
                        const isAvailable = option.available !== false && isOptionAvailableCheck;

                        if (variant.type === 'color') {
                          return (
                            <button
                              key={option.id}
                              className={`product-detail__variant-color ${
                                isSelected ? 'product-detail__variant-color--selected' : ''
                              } ${!isAvailable ? 'product-detail__variant-color--unavailable' : ''}`}
                              onClick={() => isAvailable && handleVariantChange(variantKey, option.id)}
                              disabled={!isAvailable}
                              style={{ backgroundColor: option.color }}
                              title={isAvailable ? option.value : `${option.value} (недоступно)`}
                              aria-label={option.value}
                            />
                          );
                        } else {
                          return (
                            <button
                              key={option.id}
                              className={`product-detail__variant-button ${
                                isSelected ? 'product-detail__variant-button--selected' : ''
                              } ${!isAvailable ? 'product-detail__variant-button--unavailable' : ''}`}
                              onClick={() => isAvailable && handleVariantChange(variantKey, option.id)}
                              disabled={!isAvailable}
                              title={isAvailable ? option.value : `${option.value} (недоступно)`}
                            >
                              {option.value}
                              {option.priceModifier > 0 && (
                                <span className="product-detail__variant-price-mod">
                                  +{formatPrice(option.priceModifier)}
                                </span>
                              )}
                            </button>
                          );
                        }
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="product-detail__actions">
              {currentProduct.combinations?.length > 0 && !canAddToCart && (
                <p className="product-detail__out-of-stock">Нет в наличии</p>
              )}
              <button
                className={`product-detail__add-to-cart ${!canAddToCart ? 'product-detail__add-to-cart--disabled' : ''}`}
                onClick={handleAddToCart}
              >
                Добавить в корзину
              </button>
              <button
                className={`product-detail__buy-now ${!canAddToCart ? 'product-detail__buy-now--disabled' : ''}`}
                onClick={handleBuyNow}
              >
                Купить сейчас
              </button>
            </div>

            <div className="product-detail__description">
              <h3 className="product-detail__description-title">Описание:</h3>
              <p className="product-detail__description-text">{currentProduct.description}</p>
            </div>
          </div>
        </div>
        
        {/* Отзывы */}
        <ProductReviews 
          productId={currentProduct.id} 
          onStatsChange={handleStatsChange}
        />

        {/* Похожие товары */}
        {similarProducts.length > 0 && (
          <section className="product-detail__similar">
            <div className="product-detail__container">
              <h2 className="product-detail__similar-title">Похожие товары</h2>
              {isLoadingSimilar ? (
                <div className="product-detail__similar-loading">Загрузка...</div>
              ) : (
                <div className="product-detail__similar-grid">
                  {similarProducts.map((product) => {
                    // Формируем правильную структуру для ProductCard
                    const productForCard = {
                      id: product.id,
                      productId: product.id,
                      name: product.name || '',
                      fullName: product.name || '',
                      basePrice: product.basePrice || 0,
                      price: product.basePrice || 0,
                      defaultImage: product.defaultImage || '/placeholder.png',
                      image: product.defaultImage || '/placeholder.png',
                      description: product.description || '',
                      variants: null,
                      combinationKey: null,
                      discountType: product.discountType || null,
                      discountValue: product.discountValue || null,
                    };
                    
                    return (
                      <ProductCard
                        key={`similar-${product.id}`}
                        product={productForCard}
                        viewMode="grid"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Модальное окно для просмотра изображений */}
      {isImageModalOpen && (
        <div className="product-detail__image-modal" onClick={handleCloseModal}>
          <div className="product-detail__image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="product-detail__image-modal-close"
              onClick={handleCloseModal}
              aria-label="Закрыть"
            >
              ×
            </button>
            {currentImages.length > 1 && (
              <>
                <button
                  className="product-detail__image-modal-prev"
                  onClick={handlePrevImage}
                  aria-label="Предыдущее изображение"
                >
                  ‹
                </button>
                <button
                  className="product-detail__image-modal-next"
                  onClick={handleNextImage}
                  aria-label="Следующее изображение"
                >
                  ›
                </button>
              </>
            )}
            <div className="product-detail__image-modal-main">
              <img
                src={currentImages[modalImageIndex]}
                alt={`${currentProduct.name} ${modalImageIndex + 1}`}
                className="product-detail__image-modal-img"
              />
              <div className="product-detail__image-modal-counter">
                {modalImageIndex + 1} / {currentImages.length}
              </div>
            </div>
            {currentImages.length > 1 && (
              <div className="product-detail__image-modal-thumbnails">
                {currentImages.map((image, index) => (
                  <button
                    key={index}
                    className={`product-detail__image-modal-thumbnail ${
                      modalImageIndex === index ? 'product-detail__image-modal-thumbnail--active' : ''
                    }`}
                    onClick={() => setModalImageIndex(index)}
                  >
                    <img src={image} alt={`${currentProduct.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Склонение слова "отзыв"
function getReviewWord(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'отзывов';
  }
  if (lastDigit === 1) {
    return 'отзыв';
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'отзыва';
  }
  return 'отзывов';
}

export default ProductDetail;

