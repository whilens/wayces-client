import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Select } from 'antd';
import { productsAPI, categoryConfigAPI } from '../../services/api';
import './ProductFilters.css';

type Category = { id: number; name: string };
type FilterState = {
  minPrice?: number | null;
  maxPrice?: number | null;
  specifications?: Record<string, string[] | undefined>;
  variantFilters?: Record<string, string | number | undefined>;
};
type VariantOption = {
  id: string | number;
  value: string;
  color?: string;
  priceModifier: number;
};
type AvailableVariant = {
  name: string;
  type: string;
  options: VariantOption[];
};
type CategoryConfigSpec = { key: string; label?: string };
type CategoryConfig = { specifications?: CategoryConfigSpec[] };

type ProductFiltersProps = {
  selectedCategory: number | null;
  onCategoryChange: (categoryId: number | null) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  products?: Array<Record<string, unknown>>;
};

const ProductFilters = ({ 
  selectedCategory, 
  onCategoryChange, 
  filters, 
  onFiltersChange, 
  onResetFilters,
  products = []
}: ProductFiltersProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Конфигурация категории для маппинга названий характеристик
  const [categoryConfig, setCategoryConfig] = useState<CategoryConfig | null>(null);
  
  // Локальное состояние для полей цены (для плавного ввода)
  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice ?? '');
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice ?? '');
  
  // Синхронизация локального состояния с внешними фильтрами (при сбросе и т.д.)
  const prevFiltersRef = useRef<FilterState>(filters);
  useEffect(() => {
    // Обновляем локальное состояние только если фильтры изменились извне (не от нашего ввода)
    if (prevFiltersRef.current.minPrice !== filters.minPrice) {
      setLocalMinPrice(filters.minPrice ?? '');
    }
    if (prevFiltersRef.current.maxPrice !== filters.maxPrice) {
      setLocalMaxPrice(filters.maxPrice ?? '');
    }
    prevFiltersRef.current = filters;
  }, [filters.minPrice, filters.maxPrice]);

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
        setCategorySearch('');
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  // Загрузка категорий
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productsAPI.getCategories();
        setCategories(response.data);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Получаем уникальные варианты из товаров выбранной категории
  const availableVariants = useMemo<Record<string, AvailableVariant>>(() => {
    if (!products || products.length === 0) return {};

    const variantsMap: Record<
      string,
      { name: string; type: string; options: Map<string | number, VariantOption> }
    > = {};
    const processedProducts = new Set(); // Для отслеживания уже обработанных базовых товаров

    products.forEach((product) => {
      const typedProduct = product as {
        id?: number;
        productId?: number;
        baseProduct?: Record<string, unknown>;
      };
      // Получаем базовый товар (если это комбинация)
      const baseProduct = typedProduct.baseProduct || typedProduct;
      const baseProductTyped = baseProduct as { id?: number; variants?: Record<string, unknown> };
      const productId = baseProductTyped.id || typedProduct.productId || typedProduct.id;
      
      // Пропускаем, если уже обработали этот базовый товар
      if (processedProducts.has(productId)) return;
      processedProducts.add(productId);
      
      const rawVariants = baseProductTyped.variants;
      if (rawVariants && typeof rawVariants === 'object') {
        Object.entries(rawVariants).forEach(([variantKey, variant]) => {
          const typedVariant = variant as {
            name?: string;
            type?: string;
            options?: Array<Record<string, unknown>>;
          };
          if (!variantsMap[variantKey]) {
            variantsMap[variantKey] = {
              name: typedVariant.name || variantKey,
              type: typedVariant.type || 'button',
              options: new Map(),
            };
          }

          // Собираем уникальные опции
          if (typedVariant.options && Array.isArray(typedVariant.options)) {
            typedVariant.options.forEach((option) => {
              const opt = option as {
                id?: string | number;
                optionKey?: string | number;
                value?: string;
                optionValue?: string;
                color?: string;
                colorCode?: string;
                priceModifier?: string | number;
              };
              const optionId = opt.id || opt.optionKey;
              const optionValue = opt.value || opt.optionValue;
              
              if (optionId && optionValue && !variantsMap[variantKey].options.has(optionId)) {
                variantsMap[variantKey].options.set(optionId, {
                  id: optionId,
                  value: optionValue,
                  color: opt.color || opt.colorCode,
                  priceModifier: parseFloat(String(opt.priceModifier || 0)),
                });
              }
            });
          }
        });
      }
    });

    // Преобразуем Map в массивы и сортируем опции
    const result: Record<string, AvailableVariant> = {};
    Object.entries(variantsMap).forEach(([key, variant]) => {
      result[key] = {
        name: variant.name,
        type: variant.type,
        options: Array.from(variant.options.values()).sort((a: VariantOption, b: VariantOption) => {
          // Сортируем по значению для лучшего UX
          return a.value.localeCompare(b.value, 'ru');
        }),
      };
    });

    return result;
  }, [products]);

  // Получаем уникальные характеристики из товаров выбранной категории
  const availableSpecs = useMemo<Record<string, string[]>>(() => {
    if (!products || products.length === 0) return {};

    const specsMap: Record<string, Set<string>> = {};
    const processedProducts = new Set(); // Для отслеживания уже обработанных базовых товаров

    products.forEach((product) => {
      const typedProduct = product as {
        id?: number;
        productId?: number;
        baseProduct?: Record<string, unknown>;
      };
      const baseProduct = typedProduct.baseProduct || typedProduct;
      const baseProductTyped = baseProduct as { id?: number; specifications?: Record<string, unknown> };
      const productId = baseProductTyped.id || typedProduct.productId || typedProduct.id;
      
      // Пропускаем, если уже обработали этот базовый товар
      if (processedProducts.has(productId)) return;
      processedProducts.add(productId);
      
      const rawSpecs = baseProductTyped.specifications;
      if (rawSpecs && typeof rawSpecs === 'object') {
        Object.entries(rawSpecs).forEach(([specKey, specValue]) => {
          if (!specsMap[specKey]) {
            specsMap[specKey] = new Set();
          }
          if (specValue) {
            specsMap[specKey].add(String(specValue));
          }
        });
      }
    });

    // Преобразуем Set в массивы и сортируем
    const result: Record<string, string[]> = {};
    Object.entries(specsMap).forEach(([key, values]) => {
      result[key] = Array.from(values as Set<string>).sort();
    });

    return result;
  }, [products]);

  // Загрузка конфигурации категории для маппинга названий характеристик
  useEffect(() => {
    const loadCategoryConfig = async () => {
      if (selectedCategory) {
        try {
          const response = await categoryConfigAPI.getConfig(selectedCategory);
          setCategoryConfig(response.data);
        } catch (error) {
          console.error('Ошибка загрузки конфигурации категории:', error);
          setCategoryConfig(null);
        }
      } else {
        setCategoryConfig(null);
      }
    };

    if (selectedCategory) {
      loadCategoryConfig();
    } else {
      setCategoryConfig(null);
    }
  }, [selectedCategory]);

  // Создаем маппинг ключей характеристик на их названия
  const specLabelsMap = useMemo(() => {
    if (!categoryConfig?.specifications) return {};
    const map: Record<string, string> = {};
    categoryConfig.specifications.forEach((spec: CategoryConfigSpec) => {
      if (spec.key && spec.label) {
        map[spec.key] = spec.label;
      }
    });
    return map;
  }, [categoryConfig]);

  const handleCategoryClick = (e: React.MouseEvent<HTMLElement>, categoryId: number | null) => {
    e.preventDefault();
    e.stopPropagation();
    onCategoryChange(categoryId === selectedCategory ? null : categoryId);
    setIsCategoryDropdownOpen(false);
    setCategorySearch('');
  };

  // Фильтрация категорий по поисковому запросу
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) {
      return categories;
    }
    const searchLower = categorySearch.toLowerCase();
    return categories.filter((category) => 
      category.name.toLowerCase().includes(searchLower)
    );
  }, [categories, categorySearch]);

  // Получаем название выбранной категории
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategory) return 'Все категории';
    const category = categories.find((cat) => cat.id === selectedCategory);
    return category ? category.name : 'Все категории';
  }, [selectedCategory, categories]);

  // Debounce для полей цены
  const priceChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handlePriceChange = useCallback((field: 'minPrice' | 'maxPrice', value: string) => {
    // Немедленно обновляем локальное состояние для плавного ввода
    if (field === 'minPrice') {
      setLocalMinPrice(value);
    } else {
      setLocalMaxPrice(value);
    }
    
    // Очищаем предыдущий таймер
    if (priceChangeTimeoutRef.current) {
      clearTimeout(priceChangeTimeoutRef.current);
    }
    
    // Устанавливаем новый таймер для debounce (500ms)
    priceChangeTimeoutRef.current = setTimeout(() => {
      const numValue = value && value !== '' ? parseFloat(value) : null;
      onFiltersChange({
        ...filters,
        [field]: numValue,
      });
    }, 500);
  }, [filters, onFiltersChange]);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (priceChangeTimeoutRef.current) {
        clearTimeout(priceChangeTimeoutRef.current);
      }
    };
  }, []);

  const handleSpecChange = (key: string, values: string[]) => {
    onFiltersChange({
      ...filters,
      specifications: {
        ...(filters.specifications || {}),
        [key]: values && values.length > 0 ? values : undefined,
      },
    });
  };

  const handleVariantChange = (variantKey: string, optionValue: string | number | undefined) => {
    onFiltersChange({
      ...filters,
      variantFilters: {
        ...(filters.variantFilters || {}),
        [variantKey]: optionValue || undefined,
      },
    });
  };

  return (
    <div className={`product-filters ${isOpen ? 'product-filters--open' : ''}`}>
      <button
        className="product-filters__toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Скрыть фильтры' : 'Показать фильтры'}
      >
        {isOpen ? '▼' : '▶'} Фильтры
      </button>

      {isOpen && (
        <div className="product-filters__content">
          {/* Категории */}
          <div className="product-filters__section">
            <h3 className="product-filters__section-title">Категории</h3>
            {isLoadingCategories ? (
              <p>Загрузка...</p>
            ) : (
              <div className="product-filters__category-select" ref={categoryDropdownRef}>
                <button
                  type="button"
                  className="product-filters__category-select-button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                  }}
                >
                  <span>{selectedCategoryName}</span>
                  <span className="product-filters__category-select-arrow">
                    {isCategoryDropdownOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isCategoryDropdownOpen && (
                  <div className="product-filters__category-dropdown">
                    <div className="product-filters__category-search">
                      <input
                        type="text"
                        placeholder="Поиск категории..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="product-filters__category-search-input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="product-filters__category-list">
                      <button
                        type="button"
                        className={`product-filters__category-item ${
                          !selectedCategory ? 'product-filters__category-item--active' : ''
                        }`}
                        onClick={(e) => handleCategoryClick(e, null)}
                      >
                        Все категории
                      </button>
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            className={`product-filters__category-item ${
                              selectedCategory === category.id
                                ? 'product-filters__category-item--active'
                                : ''
                            }`}
                            onClick={(e) => handleCategoryClick(e, category.id)}
                          >
                            {category.name}
                          </button>
                        ))
                      ) : (
                        <div className="product-filters__category-empty">
                          Категории не найдены
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Фильтр по цене */}
          <div className="product-filters__section">
            <h3 className="product-filters__section-title">Цена</h3>
            <div className="product-filters__price-inputs">
              <input
                type="number"
                placeholder="От"
                value={localMinPrice}
                onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                className="product-filters__price-input"
              />
              <span className="product-filters__price-separator">—</span>
              <input
                type="number"
                placeholder="До"
                value={localMaxPrice}
                onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                className="product-filters__price-input"
              />
            </div>
          </div>

          {/* Динамические фильтры по вариантам */}
          {selectedCategory && Object.keys(availableVariants).length > 0 && (
            <>
              {Object.entries(availableVariants).map(([variantKey, variant]) => (
                <div key={variantKey} className="product-filters__section">
                  <h3 className="product-filters__section-title">{variant.name}</h3>
                  <div className={`product-filters__variant-options product-filters__variant-options--${variant.type}`}>
                    {variant.options.map((option) => {
                      const isSelected = filters.variantFilters?.[variantKey] === option.id;
                      
                      if (variant.type === 'color') {
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`product-filters__variant-color ${
                              isSelected ? 'product-filters__variant-color--active' : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleVariantChange(variantKey, isSelected ? undefined : option.id);
                            }}
                            style={{ backgroundColor: option.color || '#ccc' }}
                            title={option.value}
                            aria-label={option.value}
                          />
                        );
                      } else {
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`product-filters__variant-button ${
                              isSelected ? 'product-filters__variant-button--active' : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleVariantChange(variantKey, isSelected ? undefined : option.id);
                            }}
                          >
                            {option.value}
                            {option.priceModifier > 0 && (
                              <span className="product-filters__variant-price-mod">
                                +{option.priceModifier.toLocaleString('ru-RU')} ₽
                              </span>
                            )}
                          </button>
                        );
                      }
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Динамические фильтры по характеристикам */}
          {selectedCategory && Object.keys(availableSpecs).length > 0 && (
            <>
              {Object.entries(availableSpecs).map(([specKey, specValues]) => {
                const specLabel = specLabelsMap[specKey] || specKey;
                return (
                  <div key={specKey} className="product-filters__section">
                    <h3 className="product-filters__section-title">{specLabel}</h3>
                    <Select
                      mode="multiple"
                      placeholder="Выберите значения"
                      allowClear
                      style={{ width: '100%' }}
                      value={filters.specifications?.[specKey] || []}
                      onChange={(values) => handleSpecChange(specKey, values)}
                      options={specValues.map((value) => ({
                        label: value,
                        value: value,
                      }))}
                    />
                  </div>
                );
              })}
            </>
          )}

          {/* Кнопка сброса фильтров */}
          <div className="product-filters__section">
            <button
              type="button"
              className="product-filters__reset-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onResetFilters();
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;

