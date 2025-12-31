import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProducts, setFilters, resetFilters, setLimit, clearItems } from '../../store/slices/productsSlice';
import {
  selectProducts,
  selectProductsIsLoading,
  selectProductsError,
  selectProductsPagination,
} from '../../store/selectors/productsSelectors';
import { productsAPI } from '../../services/api';
import ProductCard from '../../components/ProductCard/ProductCard';
import ProductFilters from '../../components/ProductFilters/ProductFilters';
import './Products.css';

const Products = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const items = useAppSelector(selectProducts);
  const isLoading = useAppSelector(selectProductsIsLoading);
  const error = useAppSelector(selectProductsError);
  const pagination = useAppSelector(selectProductsPagination);
  const filters = useAppSelector((state) => state.products.filters);

  // Инициализация фильтров из URL (только один раз при монтировании)
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Состояние для товаров для фильтров (без фильтрации по характеристикам и вариантам)
  const [productsForFilters, setProductsForFilters] = useState([]);
  const [isLoadingFiltersProducts, setIsLoadingFiltersProducts] = useState(false);
  
  // Режим отображения товаров (grid/list)
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('productsViewMode');
    return saved === 'list' ? 'list' : 'grid';
  });
  
  // Локальная страница для подгрузки (не в Redux, не в URL)
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Ref для элемента триггера infinite scroll
  const loadMoreRef = useRef(null);
  
  // Инициализация фильтров из URL (только один раз при монтировании)
  useEffect(() => {
    if (isInitialized) return;
    
    const categoryId = searchParams.get('categoryId');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const search = searchParams.get('search');
    const specifications = searchParams.get('specifications');
    const variantFilters = searchParams.get('variantFilters');

    // Нормализуем specifications: преобразуем строки в массивы
    let normalizedSpecs = {};
    if (specifications) {
      try {
        const parsedSpecs = JSON.parse(specifications);
        Object.entries(parsedSpecs).forEach(([key, value]) => {
          if (value) {
            normalizedSpecs[key] = Array.isArray(value) ? value : [value];
          }
        });
      } catch (e) {
        console.error('Ошибка парсинга specifications:', e);
      }
    }

    const urlFilters = {
      categoryId: categoryId ? parseInt(categoryId) : null,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      search: search || '',
      specifications: normalizedSpecs,
      variantFilters: variantFilters ? JSON.parse(variantFilters) : {},
    };

    dispatch(setFilters(urlFilters));
    setIsInitialized(true);
  }, [dispatch, searchParams, isInitialized]);

  // Обновление URL при изменении фильтров (без page)
  const prevFiltersRef = useRef(null);
  
  useEffect(() => {
    if (!isInitialized) return;

    const filtersChanged = !prevFiltersRef.current || 
      JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);

    if (!filtersChanged) return;

    const params = new URLSearchParams();
    if (filters.categoryId) params.set('categoryId', filters.categoryId.toString());
    if (filters.minPrice !== null && filters.minPrice !== undefined) params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== null && filters.maxPrice !== undefined) params.set('maxPrice', filters.maxPrice.toString());
    if (filters.search) params.set('search', filters.search);
    if (filters.specifications && Object.keys(filters.specifications).length > 0) {
      params.set('specifications', JSON.stringify(filters.specifications));
    }
    if (filters.variantFilters && Object.keys(filters.variantFilters).length > 0) {
      params.set('variantFilters', JSON.stringify(filters.variantFilters));
    }

    setSearchParams(params, { replace: true });
    prevFiltersRef.current = { ...filters };
  }, [filters, setSearchParams, isInitialized]);

  // Загрузка товаров для фильтров (без фильтрации по характеристикам и вариантам)
  useEffect(() => {
    if (!isInitialized) return;
    
    const loadProductsForFilters = async () => {
      setIsLoadingFiltersProducts(true);
      try {
        const params = {
          page: 1,
          limit: 100, // Максимальное значение, разрешенное сервером
        };

        if (filters.categoryId) params.categoryId = filters.categoryId;
        if (filters.minPrice !== null) params.minPrice = filters.minPrice;
        if (filters.maxPrice !== null) params.maxPrice = filters.maxPrice;
        if (filters.search) params.search = filters.search;

        const response = await productsAPI.getAll(params);
        setProductsForFilters(response.data.products || []);
      } catch (error) {
        console.error('Ошибка загрузки товаров для фильтров:', error);
        setProductsForFilters([]);
      } finally {
        setIsLoadingFiltersProducts(false);
      }
    };

    loadProductsForFilters();
  }, [filters.categoryId, filters.minPrice, filters.maxPrice, filters.search, isInitialized]);

  // Сброс страницы при изменении фильтров или лимита
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
  }, [filters, pagination.limit]);

  // Загрузка товаров (основной useEffect)
  useEffect(() => {
    if (!isInitialized) return;
    
    const loadProducts = async () => {
      const isFirstPage = currentPage === 1;
      
      if (isFirstPage) {
        dispatch(clearItems());
      } else {
        setIsLoadingMore(true);
      }

      const params = {
        page: currentPage,
        limit: pagination.limit,
        append: !isFirstPage,
      };

      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.minPrice !== null) params.minPrice = filters.minPrice;
      if (filters.maxPrice !== null) params.maxPrice = filters.maxPrice;
      if (filters.search) params.search = filters.search;
      if (filters.specifications && Object.keys(filters.specifications).length > 0) {
        params.specifications = JSON.stringify(filters.specifications);
      }
      if (filters.variantFilters && Object.keys(filters.variantFilters).length > 0) {
        params.variantFilters = JSON.stringify(filters.variantFilters);
      }

      try {
        const result = await dispatch(fetchProducts(params)).unwrap();
        // Обновляем hasMore на основе ответа сервера
        setHasMore(result.hasMore ?? (result.products?.length === pagination.limit));
      } catch (err) {
        console.error('Ошибка загрузки товаров:', err);
        setHasMore(false);
      } finally {
        setIsLoadingMore(false);
      }
    };

    loadProducts();
  }, [dispatch, currentPage, pagination.limit, filters, isInitialized]);

  const handleCategoryChange = useCallback((categoryId) => {
    dispatch(setFilters({ 
      categoryId,
      minPrice: null,
      maxPrice: null,
      search: '',
      specifications: {},
      variantFilters: {},
    }));
  }, [dispatch]);

  const handleFiltersChange = useCallback((newFilters) => {
    dispatch(setFilters(newFilters));
  }, [dispatch]);

  const handleResetFilters = useCallback(() => {
    dispatch(resetFilters());
  }, [dispatch]);

  // Мемоизация списка товаров
  const productsList = useMemo(
    () => items.map((product) => <ProductCard key={product.id} product={product} viewMode={viewMode} />),
    [items, viewMode]
  );
  
  // Обработчик изменения режима отображения
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem('productsViewMode', mode);
  }, []);
  
  // Обработчик изменения лимита товаров
  const handleLimitChange = useCallback((newLimit) => {
    dispatch(setLimit(newLimit));
  }, [dispatch]);
  
  // Функция загрузки следующей страницы
  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  }, [isLoading, isLoadingMore, hasMore]);
  
  // Infinite scroll с Intersection Observer
  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          setCurrentPage(prev => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    
    observer.observe(currentRef);
    
    return () => {
      observer.unobserve(currentRef);
    };
  }, [hasMore, isLoading, isLoadingMore]);

  // Сообщение об ошибке
  const errorMessage = error 
    ? (typeof error === 'string' ? error : error?.message || error?.error || 'Неизвестная ошибка')
    : null;

  return (
    <div className="products">
      <div className="products__container">
        <h1 className="products__title">Каталог товаров</h1>
        <div className="products__content">
          <div className="products__sidebar">
            <ProductFilters
              selectedCategory={filters.categoryId}
              onCategoryChange={handleCategoryChange}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onResetFilters={handleResetFilters}
              products={productsForFilters}
            />
          </div>
          <div className="products__main">
            {/* Переключатель режима отображения и выбор количества */}
            <div className="products__view-controls">
              <div className="products__view-toggle">
                <button
                  className={`products__view-button ${viewMode === 'grid' ? 'products__view-button--active' : ''}`}
                  onClick={() => handleViewModeChange('grid')}
                  aria-label="Плитки"
                  title="Плитки"
                >
                  <span className="products__view-icon">⊞</span>
                </button>
                <button
                  className={`products__view-button ${viewMode === 'list' ? 'products__view-button--active' : ''}`}
                  onClick={() => handleViewModeChange('list')}
                  aria-label="Список"
                  title="Список"
                >
                  <span className="products__view-icon">☰</span>
                </button>
              </div>
              <div className="products__limit-selector">
                <label htmlFor="products-limit" className="products__limit-label">
                  Товаров на странице:
                </label>
                <select
                  id="products-limit"
                  className="products__limit-select"
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            
            {/* Оверлей загрузки - только при первой загрузке */}
            {isLoading && currentPage === 1 && items.length === 0 && (
              <div className="products__loading-overlay">
                <div className="products__loading-spinner"></div>
                <p>Загрузка товаров...</p>
              </div>
            )}
            
            {/* Сообщение об ошибке */}
            {errorMessage && !isLoading && (
              <div className="products__error-message">
                <p>Ошибка загрузки: {errorMessage}</p>
              </div>
            )}
            
            {/* Сетка/Список товаров */}
            <div className={`products__grid products__grid--${viewMode} ${isLoading && currentPage === 1 && items.length === 0 ? 'products__grid--loading' : ''}`}>
              {!errorMessage && items.length > 0 ? (
                productsList
              ) : !errorMessage && !isLoading ? (
                <p className="products__empty">Товары не найдены</p>
              ) : null}
            </div>
            
            {/* Блок подгрузки */}
            {items.length > 0 && (
              <div className="products__load-section">
                {/* Элемент для триггера infinite scroll */}
                <div ref={loadMoreRef} className="products__load-trigger" />
                
                {/* Индикатор загрузки */}
                {isLoadingMore && (
                  <div className="products__load-more-spinner">
                    <div className="products__loading-spinner"></div>
                    <p>Загрузка товаров...</p>
                  </div>
                )}
                
                {/* Кнопка "Загрузить ещё" */}
                {hasMore && !isLoadingMore && !isLoading && (
                  <button 
                    className="products__load-more-button"
                    onClick={loadMore}
                  >
                    Загрузить ещё
                  </button>
                )}
                
                {/* Сообщение о конце списка */}
                {!hasMore && (
                  <p className="products__end-message">
                    Все товары загружены ({pagination.total} шт.)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;

