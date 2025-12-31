import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminProductsAPI, adminCategoriesAPI } from '../../../services/api';
import { ROUTES } from '../../../utils/constants';
import { formatPrice } from '../../../utils/helpers';
import { getImageUrl } from '../../../utils/imageUtils';
import { notification, Modal } from 'antd';
import './ProductForm.css';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const fileInputRef = useRef(null);
  const optionFileInputRefs = useRef({});

  const [formData, setFormData] = useState({
    name: '',
    basePrice: '',
    categoryId: '',
    description: '',
    isActive: true,
    discountType: '', // 'percentage' или 'fixed'
    discountValue: '', // Значение скидки
  });

  const [specifications, setSpecifications] = useState([]);
  const [variants, setVariants] = useState([]);
  const [combinations, setCombinations] = useState([]); // Созданные комплектации
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]); // ID удаленных изображений
  const [selectedDefaultImage, setSelectedDefaultImage] = useState(null); // ID существующего изображения или индекс нового
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditMode);
  const [categoryConfig, setCategoryConfig] = useState(null); // Конфигурация категории
  const [showVariantSelectModal, setShowVariantSelectModal] = useState(false); // Модальное окно выбора варианта

  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchProduct();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await adminCategoriesAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setIsFetching(true);
      const response = await adminProductsAPI.getById(id);
      const product = response.data;

      setFormData({
        name: product.name || '',
        basePrice: product.basePrice || '',
        categoryId: product.categoryId || '',
        description: product.description || '',
        isActive: product.isActive !== false,
        discountType: product.discountType || '',
        discountValue: product.discountValue || '',
      });

      // Загружаем характеристики
      if (product.specifications) {
        const specs = Object.entries(product.specifications).map(([key, value]) => ({
          key,
          value,
        }));
        setSpecifications(specs);
      }

      // Загружаем варианты
      if (product.variants && product.variants.length > 0) {
        const formattedVariants = product.variants.map((variant) => ({
          key: variant.variantKey,
          name: variant.variantName,
          type: variant.variantType,
          displayOrder: variant.displayOrder || 0,
          isRequired: variant.isRequired !== false,
          options: variant.options
            ? variant.options.map((option) => ({
                key: option.optionKey,
                value: option.optionValue,
                colorCode: option.colorCode || '',
                priceModifier: option.priceModifier || 0,
                images: option.images || [],
                isDefault: option.isDefault || false,
                isAvailable: option.isAvailable !== false,
                stockQuantity: option.stockQuantity || 0,
                displayOrder: option.displayOrder || 0,
              }))
            : [],
        }));
        setVariants(formattedVariants);
      }

      // Загружаем комплектации
      if (product.combinations && product.combinations.length > 0) {
        const formattedCombinations = product.combinations.map((comb) => ({
          id: comb.id,
          combinationKey: comb.combinationKey,
          variants: comb.variants || {},
          price: comb.price || parseFloat(product.basePrice) || 0,
          stockQuantity: comb.stockQuantity || 0,
          sku: comb.sku || '',
        }));
        setCombinations(formattedCombinations);
      } else {
        setCombinations([]);
      }

      // Загружаем конфигурацию категории для возможности добавления вариантов
      if (product.categoryId) {
        loadCategoryConfig(product.categoryId, true); // preserveVariants = true, чтобы не перезаписать существующие варианты
      }

      // Загружаем существующие изображения
      if (product.images && product.images.length > 0) {
        const formattedImages = product.images.map((img) => ({
          id: img.id,
          url: getImageUrl(img.imageUrl),
          imageUrl: img.imageUrl, // Сохраняем оригинальный путь для отправки на сервер
        }));
        setExistingImages(formattedImages);
        
        // Определяем, какое изображение является defaultImage
        if (product.defaultImage) {
          const defaultImg = formattedImages.find(
            (img) => img.imageUrl === product.defaultImage
          );
          if (defaultImg) {
            setSelectedDefaultImage(defaultImg.id);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
      notification.error({
        message: 'Ошибка',
        description: error.response?.data?.error || 'Не удалось загрузить товар',
        placement: 'topRight',
      });
      navigate(ROUTES.ADMIN_PRODUCTS);
    } finally {
      setIsFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    
    // При изменении категории загружаем конфигурацию
    if (name === 'categoryId' && value) {
      loadCategoryConfig(value, isEditMode); // При редактировании сохраняем существующие варианты
    } else if (name === 'categoryId' && !value) {
      // Если категория сброшена, очищаем конфигурацию
      setCategoryConfig(null);
    }
  };

  // Загрузка конфигурации категории
  const loadCategoryConfig = async (categoryId, preserveVariants = false) => {
    if (!categoryId) {
      setCategoryConfig(null);
      return;
    }
    
    try {
      const response = await adminCategoriesAPI.getConfig(categoryId);
      const config = response.data;
      
      // Сохраняем конфигурацию для использования при добавлении вариантов
      setCategoryConfig(config);
      
      // Заполняем характеристики из конфигурации (только если не редактируем)
      if (!preserveVariants) {
        if (config.specifications && config.specifications.length > 0) {
          const newSpecs = config.specifications.map(spec => ({
            key: spec.key,
            label: spec.label,
            type: spec.type,
            options: spec.options || null,
            value: '', // Значение заполняет админ
          }));
          setSpecifications(newSpecs);
        } else {
          setSpecifications([]);
        }
      }
      
      // Варианты НЕ добавляем автоматически - только при нажатии "+ Добавить вариант"
    } catch (error) {
      console.error('Ошибка загрузки конфигурации категории:', error);
      setCategoryConfig(null);
      if (!preserveVariants) {
        setSpecifications([]);
      }
    }
  };

  const handleSpecificationChange = (index, field, value) => {
    const newSpecs = [...specifications];
    newSpecs[index][field] = value;
    setSpecifications(newSpecs);
  };

  const addSpecification = () => {
    setSpecifications([...specifications, { key: '', value: '' }]);
  };

  const removeSpecification = (index) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages([...images, ...newImages]);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    // Если удаляемое изображение было defaultImage, сбрасываем выбор
    if (selectedDefaultImage === -(index + 1)) {
      setSelectedDefaultImage(null);
    }
  };

  const removeExistingImage = (imageId) => {
    // Добавляем ID в список удаленных
    setDeletedImageIds([...deletedImageIds, imageId]);
    // Удаляем из списка существующих
    setExistingImages(existingImages.filter((img) => img.id !== imageId));
    // Если удаляемое изображение было defaultImage, сбрасываем выбор
    if (selectedDefaultImage === imageId) {
      setSelectedDefaultImage(null);
    }
  };

  const handleSetDefaultImage = (imageId) => {
    setSelectedDefaultImage(imageId);
  };

  const handleSetDefaultNewImage = (index) => {
    // Для новых изображений используем отрицательные индексы, чтобы отличить от ID
    setSelectedDefaultImage(-(index + 1));
  };

  const addVariant = () => {
    // Если есть конфигурация категории с вариантами, показываем модальное окно
    if (categoryConfig && categoryConfig.variants && categoryConfig.variants.length > 0) {
      // Фильтруем варианты, которые ещё не добавлены
      const availableVariants = categoryConfig.variants.filter(
        configVariant => !variants.some(v => v.key === configVariant.key)
      );
      
      if (availableVariants.length > 0) {
        setShowVariantSelectModal(true);
      } else {
        // Все варианты уже добавлены
        notification.info({
          message: 'Информация',
          description: 'Все доступные варианты из конфигурации категории уже добавлены',
          placement: 'topRight',
        });
      }
    } else {
      // Если конфигурации нет, показываем сообщение
      notification.warning({
        message: 'Внимание',
        description: 'Для выбранной категории нет предопределенных вариантов. Выберите категорию с конфигурацией.',
        placement: 'topRight',
      });
    }
  };

  const handleSelectVariantFromConfig = (selectedVariantKey) => {
    if (!categoryConfig || !categoryConfig.variants) return;
    
    // Находим выбранный вариант в конфигурации
    const configVariant = categoryConfig.variants.find(v => v.key === selectedVariantKey);
    if (!configVariant) return;
    
    // Проверяем, не добавлен ли уже этот вариант
    const alreadyAdded = variants.some(v => v.key === selectedVariantKey);
    if (alreadyAdded) {
      notification.warning({
        message: 'Внимание',
        description: 'Этот вариант уже добавлен к товару',
        placement: 'topRight',
      });
      return;
    }
    
    // Создаем вариант с данными из конфигурации
    const newVariant = {
      key: configVariant.key,
      name: configVariant.name,
      type: configVariant.type || 'button',
      displayOrder: variants.length,
      isRequired: configVariant.isRequired !== false,
      options: [],
    };
    
    setVariants([...variants, newVariant]);
    setShowVariantSelectModal(false);
  };

  const removeVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const addVariantOption = (variantIndex) => {
    const newVariants = [...variants];
    if (!newVariants[variantIndex].options) {
      newVariants[variantIndex].options = [];
    }
    newVariants[variantIndex].options.push({
      key: '',
      value: '',
      colorCode: '',
      priceModifier: 0,
      images: [],
      isDefault: false,
      isAvailable: true,
      stockQuantity: 0,
      displayOrder: newVariants[variantIndex].options.length,
    });
    setVariants(newVariants);
  };

  const removeVariantOption = (variantIndex, optionIndex) => {
    const newVariants = [...variants];
    newVariants[variantIndex].options = newVariants[variantIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    setVariants(newVariants);
  };

  const updateVariantOption = (variantIndex, optionIndex, field, value) => {
    const newVariants = [...variants];
    newVariants[variantIndex].options[optionIndex][field] = value;
    setVariants(newVariants);
  };

  const handleOptionImageUpload = (variantIndex, optionIndex, e) => {
    const files = Array.from(e.target.files);
    const newVariants = [...variants];
    const option = newVariants[variantIndex].options[optionIndex];
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    option.images = [...(option.images || []), ...newImages];
    setVariants(newVariants);
  };

  const removeOptionImage = (variantIndex, optionIndex, imageIndex) => {
    const newVariants = [...variants];
    newVariants[variantIndex].options[optionIndex].images = newVariants[variantIndex].options[
      optionIndex
    ].images.filter((_, i) => i !== imageIndex);
    setVariants(newVariants);
  };

  // Управление комплектациями
  const addCombination = () => {
    // Создаем новую пустую комплектацию
    const newCombination = {
      id: Date.now(), // Временный ID
      variants: {}, // Выбранные варианты для этой комплектации
      price: parseFloat(formData.basePrice) || 0,
      stockQuantity: 0,
      sku: '',
    };
    setCombinations([...combinations, newCombination]);
  };

  const removeCombination = (index) => {
    setCombinations(combinations.filter((_, i) => i !== index));
  };

  const updateCombination = (index, field, value) => {
    const newCombinations = [...combinations];
    newCombinations[index][field] = value;
    setCombinations(newCombinations);
  };

  const updateCombinationVariant = (combIndex, variantKey, optionKey) => {
    const newCombinations = [...combinations];
    if (!newCombinations[combIndex].variants) {
      newCombinations[combIndex].variants = {};
    }
    if (optionKey) {
      newCombinations[combIndex].variants[variantKey] = optionKey;
    } else {
      delete newCombinations[combIndex].variants[variantKey];
    }
    setCombinations(newCombinations);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно';
    }

    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      newErrors.basePrice = 'Цена должна быть больше 0';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание обязательно';
    }

    // Валидация вариантов
    variants.forEach((variant, vIndex) => {
      if (!variant.key.trim()) {
        newErrors[`variant_${vIndex}_key`] = 'Ключ варианта обязателен';
      }
      if (!variant.name.trim()) {
        newErrors[`variant_${vIndex}_name`] = 'Название варианта обязательно';
      }
      if (variant.options.length === 0) {
        newErrors[`variant_${vIndex}_options`] = 'Добавьте хотя бы одну опцию';
      }

      variant.options.forEach((option, oIndex) => {
        if (!option.key.trim()) {
          newErrors[`variant_${vIndex}_option_${oIndex}_key`] = 'Ключ опции обязателен';
        }
        if (!option.value.trim()) {
          newErrors[`variant_${vIndex}_option_${oIndex}_value`] = 'Значение опции обязательно';
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleKeyDown = (e) => {
    // Предотвращаем отправку формы при нажатии Enter в полях ввода
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      notification.error({
        message: 'Ошибка валидации',
        description: 'Проверьте правильность заполнения полей',
        placement: 'topRight',
      });
      return;
    }

    setIsLoading(true);

    try {
      const formDataToSend = new FormData();

      // Основные поля
      formDataToSend.append('name', formData.name);
      formDataToSend.append('basePrice', formData.basePrice);
      if (formData.categoryId) {
        formDataToSend.append('categoryId', formData.categoryId);
      }
      formDataToSend.append('description', formData.description);
      formDataToSend.append('isActive', formData.isActive);
      
      // Скидка
      if (formData.discountType) {
        formDataToSend.append('discountType', formData.discountType);
        formDataToSend.append('discountValue', formData.discountValue || '0');
      } else {
        formDataToSend.append('discountType', '');
        formDataToSend.append('discountValue', '0');
      }

      // Характеристики
      const specsObj = {};
      specifications.forEach((spec) => {
        if (spec.key && spec.value) {
          specsObj[spec.key] = spec.value;
        }
      });
      formDataToSend.append('specifications', JSON.stringify(specsObj));

      // Обрабатываем варианты: извлекаем File объекты из изображений опций
      const processedVariants = variants.map((variant, vIndex) => {
        const processedVariant = { ...variant };
        if (variant.options) {
          processedVariant.options = variant.options.map((option, oIndex) => {
            const processedOption = { ...option };
            // Если есть изображения с File объектами, заменяем их на индексы для отправки
            if (option.images && Array.isArray(option.images)) {
              processedOption.images = option.images.map((img, imgIndex) => {
                // Если это File объект, отправляем его отдельно через FormData
                if (img && typeof img === 'object' && img.file) {
                  // Формируем уникальный ключ для файла
                  const fileKey = `option-images-${vIndex}-${oIndex}-${imgIndex}`;
                  formDataToSend.append(fileKey, img.file);
                  // Возвращаем маркер, что это файл
                  return `__FILE__:${fileKey}`;
                }
                // Если это уже строка (путь), оставляем как есть
                return img;
              });
            }
            return processedOption;
          });
        }
        return processedVariant;
      });
      
      // Варианты (с обработанными изображениями)
      formDataToSend.append('variants', JSON.stringify(processedVariants));

      // Комплектации
      // Убираем временные ID (Date.now()) и отправляем только валидные комплектации
      const validCombinations = combinations.filter(comb => {
        // Проверяем, что у комплектации есть хотя бы один выбранный вариант
        return comb.variants && Object.keys(comb.variants).length > 0;
      }).map(comb => ({
        variants: comb.variants,
        price: comb.price || parseFloat(formData.basePrice) || 0,
        stockQuantity: comb.stockQuantity || 0,
        sku: comb.sku || '',
      }));
      formDataToSend.append('combinations', JSON.stringify(validCombinations));

      // Изображения товара
      images.forEach((img) => {
        formDataToSend.append('images', img.file);
      });

      // Передаем ID удаленных изображений (сервер ожидает removeImages)
      if (deletedImageIds.length > 0) {
        formDataToSend.append('removeImages', JSON.stringify(deletedImageIds));
      }

      // Определяем defaultImage
      if (selectedDefaultImage !== null) {
        if (selectedDefaultImage < 0) {
          // Новое изображение (отрицательный индекс)
          const newImageIndex = Math.abs(selectedDefaultImage) - 1;
          if (images[newImageIndex]) {
            // Для новых изображений путь будет определен на сервере
            formDataToSend.append('defaultImageFromNew', 'true');
            formDataToSend.append('defaultImageNewIndex', newImageIndex.toString());
          }
        } else {
          // Существующее изображение
          const existingImg = existingImages.find((img) => img.id === selectedDefaultImage);
          if (existingImg) {
            formDataToSend.append('defaultImage', existingImg.imageUrl);
          }
        }
      } else if (images.length > 0) {
        // Если не выбран defaultImage, но есть новые изображения, используем первое
        formDataToSend.append('defaultImageFromNew', 'true');
        formDataToSend.append('defaultImageNewIndex', '0');
      } else if (existingImages.length > 0 && isEditMode) {
        // Если нет новых изображений, но есть существующие, используем первое существующее
        formDataToSend.append('defaultImage', existingImages[0].imageUrl);
      }

      let response;
      if (isEditMode) {
        response = await adminProductsAPI.update(id, formDataToSend);
      } else {
        response = await adminProductsAPI.create(formDataToSend);
      }

      notification.success({
        message: isEditMode ? 'Товар обновлен' : 'Товар создан',
        description: `Товар "${formData.name}" успешно ${isEditMode ? 'обновлен' : 'создан'}`,
        placement: 'topRight',
      });

      navigate(ROUTES.ADMIN_PRODUCTS);
    } catch (error) {
      console.error('Ошибка сохранения товара:', error);
      notification.error({
        message: 'Ошибка',
        description: error.response?.data?.error || 'Не удалось сохранить товар',
        placement: 'topRight',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="admin-product-form">
        <div className="admin-product-form__container">
          <p>Загрузка товара...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-product-form">
      <div className="admin-product-form__container">
        <div className="admin-product-form__header">
          <button
            className="admin-product-form__back-button"
            onClick={() => navigate(ROUTES.ADMIN_PRODUCTS)}
          >
            ← Назад к товарам
          </button>
          <h1 className="admin-product-form__title">
            {isEditMode ? 'Редактирование товара' : 'Добавление товара'}
          </h1>
        </div>

        <form className="admin-product-form__form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          {/* Основная информация */}
          <div className="admin-product-form__section">
            <h2 className="admin-product-form__section-title">Основная информация</h2>

            <div className="admin-product-form__form-group">
              <label htmlFor="name" className="admin-product-form__label">
                Название <span className="admin-product-form__required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`admin-product-form__input ${errors.name ? 'admin-product-form__input--error' : ''}`}
                placeholder="Введите название товара"
              />
              {errors.name && <span className="admin-product-form__error">{errors.name}</span>}
            </div>

            <div className="admin-product-form__form-row">
              <div className="admin-product-form__form-group">
                <label htmlFor="basePrice" className="admin-product-form__label">
                  Цена <span className="admin-product-form__required">*</span>
                </label>
                <input
                  type="number"
                  id="basePrice"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`admin-product-form__input ${errors.basePrice ? 'admin-product-form__input--error' : ''}`}
                  placeholder="0.00"
                />
                {errors.basePrice && (
                  <span className="admin-product-form__error">{errors.basePrice}</span>
                )}
              </div>

              <div className="admin-product-form__form-group">
                <label htmlFor="categoryId" className="admin-product-form__label">
                  Категория
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="admin-product-form__input"
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Скидка */}
            <div className="admin-product-form__form-row">
              <div className="admin-product-form__form-group">
                <label htmlFor="discountType" className="admin-product-form__label">
                  Тип скидки
                </label>
                <select
                  id="discountType"
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleChange}
                  className="admin-product-form__input"
                >
                  <option value="">Нет скидки</option>
                  <option value="percentage">Процент (%)</option>
                  <option value="fixed">Фиксированная сумма (₽)</option>
                </select>
              </div>

              {formData.discountType && (
                <div className="admin-product-form__form-group">
                  <label htmlFor="discountValue" className="admin-product-form__label">
                    Размер скидки {formData.discountType === 'percentage' ? '(%, макс. 100)' : '(₽)'}
                  </label>
                  <input
                    type="number"
                    id="discountValue"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleChange}
                    step={formData.discountType === 'percentage' ? '0.01' : '0.01'}
                    min="0"
                    max={formData.discountType === 'percentage' ? '100' : undefined}
                    className="admin-product-form__input"
                    placeholder={formData.discountType === 'percentage' ? '0-100' : '0.00'}
                  />
                </div>
              )}
            </div>

            <div className="admin-product-form__form-group">
              <label htmlFor="description" className="admin-product-form__label">
                Описание <span className="admin-product-form__required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="5"
                className={`admin-product-form__textarea ${errors.description ? 'admin-product-form__textarea--error' : ''}`}
                placeholder="Введите описание товара"
              />
              {errors.description && (
                <span className="admin-product-form__error">{errors.description}</span>
              )}
            </div>

            <div className="admin-product-form__form-group">
              <label className="admin-product-form__checkbox-label">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="admin-product-form__checkbox"
                />
                <span>Товар активен</span>
              </label>
            </div>
          </div>

          {/* Изображения товара */}
          <div className="admin-product-form__section">
            <h2 className="admin-product-form__section-title">Изображения товара</h2>

            {existingImages.length > 0 && (
              <div className="admin-product-form__existing-images">
                {existingImages.map((img) => (
                  <div 
                    key={img.id} 
                    className={`admin-product-form__image-preview ${
                      selectedDefaultImage === img.id ? 'admin-product-form__image-preview--default' : ''
                    }`}
                  >
                    <img src={img.url} alt="Товар" />
                    {selectedDefaultImage === img.id && (
                      <div className="admin-product-form__default-badge">Основное</div>
                    )}
                    <button
                      type="button"
                      className="admin-product-form__remove-image-button"
                      onClick={() => removeExistingImage(img.id)}
                    >
                      ×
                    </button>
                    <button
                      type="button"
                      className="admin-product-form__set-default-button"
                      onClick={() => handleSetDefaultImage(img.id)}
                      title="Сделать основным изображением"
                    >
                      {selectedDefaultImage === img.id ? '✓' : '★'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="admin-product-form__image-upload">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="admin-product-form__file-input"
              />
              <button
                type="button"
                className="admin-product-form__upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                Загрузить изображения
              </button>
            </div>

            {images.length > 0 && (
              <div className="admin-product-form__image-previews">
                {images.map((img, index) => {
                  const isDefault = selectedDefaultImage === -(index + 1);
                  return (
                    <div 
                      key={index} 
                      className={`admin-product-form__image-preview ${
                        isDefault ? 'admin-product-form__image-preview--default' : ''
                      }`}
                    >
                      <img src={img.preview} alt={`Предпросмотр ${index + 1}`} />
                      {isDefault && (
                        <div className="admin-product-form__default-badge">Основное</div>
                      )}
                      <button
                        type="button"
                        className="admin-product-form__remove-image-button"
                        onClick={() => {
                          removeImage(index);
                          if (isDefault) {
                            setSelectedDefaultImage(null);
                          }
                        }}
                      >
                        ×
                      </button>
                      <button
                        type="button"
                        className="admin-product-form__set-default-button"
                        onClick={() => handleSetDefaultNewImage(index)}
                        title="Сделать основным изображением"
                      >
                        {isDefault ? '✓' : '★'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Характеристики */}
          <div className="admin-product-form__section">
            <h2 className="admin-product-form__section-title">Характеристики</h2>
            {specifications.length === 0 ? (
              <p className="admin-product-form__hint">
                Выберите категорию, чтобы загрузить предопределенные характеристики
              </p>
            ) : (
              specifications.map((spec, index) => (
                <div key={index} className="admin-product-form__specification-row">
                  <label className="admin-product-form__spec-label">
                    {spec.label || spec.key || 'Характеристика'}:
                  </label>
                  {spec.type === 'select' && spec.options ? (
                    <select
                      value={spec.value || ''}
                      onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)}
                      className="admin-product-form__input"
                      required
                    >
                      <option value="">Выберите значение</option>
                      {spec.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={spec.type === 'number' ? 'number' : 'text'}
                      placeholder={spec.label || 'Значение'}
                      value={spec.value || ''}
                      onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)}
                      className="admin-product-form__input"
                      required
                    />
                  )}
                  <input
                    type="hidden"
                    value={spec.key}
                    readOnly
                  />
                </div>
              ))
            )}
          </div>

          {/* Варианты */}
          <div className="admin-product-form__section">
            <div className="admin-product-form__section-header">
              <h2 className="admin-product-form__section-title">Варианты товара</h2>
              {formData.categoryId && categoryConfig && categoryConfig.variants && categoryConfig.variants.length > 0 && (
                <button
                  type="button"
                  className="admin-product-form__add-button"
                  onClick={addVariant}
                >
                  + Добавить вариант
                </button>
              )}
              {formData.categoryId && (!categoryConfig || !categoryConfig.variants || categoryConfig.variants.length === 0) && (
                <div style={{ fontSize: '0.875rem', color: '#e53e3e', marginTop: '0.5rem' }}>
                  ⚠️ Конфигурация категории не загружена или нет вариантов
                </div>
              )}
            </div>
            {!formData.categoryId ? (
              <p className="admin-product-form__hint">
                Выберите категорию, чтобы добавить варианты товара
              </p>
            ) : variants.length === 0 ? (
              <p className="admin-product-form__hint">
                Нажмите "Добавить вариант" для добавления вариантов из конфигурации категории
              </p>
            ) : (
              variants.map((variant, vIndex) => (
                <div key={vIndex} className="admin-product-form__variant-group">
                  <div className="admin-product-form__variant-header">
                    <h3>{variant.name || `Вариант ${vIndex + 1}`}</h3>
                  </div>

                  <div className="admin-product-form__form-row">
                    <div className="admin-product-form__form-group">
                      <label className="admin-product-form__label">Ключ варианта</label>
                      <input
                        type="text"
                        value={variant.key}
                        readOnly
                        className="admin-product-form__input admin-product-form__input--readonly"
                        title="Ключ определяется категорией и не может быть изменен"
                      />
                    </div>

                    <div className="admin-product-form__form-group">
                      <label className="admin-product-form__label">Название варианта</label>
                      <input
                        type="text"
                        value={variant.name}
                        readOnly
                        className="admin-product-form__input admin-product-form__input--readonly"
                        title="Название определяется категорией и не может быть изменено"
                      />
                    </div>

                    <div className="admin-product-form__form-group">
                      <label className="admin-product-form__label">Тип *</label>
                      <select
                        value={variant.type}
                        onChange={(e) => updateVariant(vIndex, 'type', e.target.value)}
                        className="admin-product-form__input"
                        title="Выберите тип варианта: 'color' для цветных блоков, 'button' для текстовых кнопок"
                      >
                        <option value="button">Кнопка</option>
                        <option value="color">Цвет</option>
                        <option value="select">Выпадающий список</option>
                      </select>
                      {variant.key === 'color' && variant.type !== 'color' && (
                        <p className="admin-product-form__hint admin-product-form__hint--warning" style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          ⚠️ Для варианта с ключом "color" рекомендуется использовать тип "color" для отображения цветных блоков на странице товара
                        </p>
                      )}
                    </div>
                  </div>

                <div className="admin-product-form__form-group">
                  <label className="admin-product-form__checkbox-label">
                    <input
                      type="checkbox"
                      checked={variant.isRequired}
                      onChange={(e) => updateVariant(vIndex, 'isRequired', e.target.checked)}
                      className="admin-product-form__checkbox"
                    />
                    <span>Обязательный вариант</span>
                  </label>
                </div>

                <div className="admin-product-form__variant-options">
                  <button
                    type="button"
                    className="admin-product-form__add-option-button"
                    onClick={() => addVariantOption(vIndex)}
                  >
                    + Добавить опцию
                  </button>

                  {variant.options.map((option, oIndex) => (
                    <div key={oIndex} className="admin-product-form__option-group">
                      <div className="admin-product-form__option-header">
                        <h4>Опция {oIndex + 1}</h4>
                        <button
                          type="button"
                          className="admin-product-form__remove-button"
                          onClick={() => removeVariantOption(vIndex, oIndex)}
                        >
                          Удалить опцию
                        </button>
                      </div>

                      <div className="admin-product-form__form-row">
                        <div className="admin-product-form__form-group">
                          <label className="admin-product-form__label">Ключ опции *</label>
                          <input
                            type="text"
                            value={option.key}
                            onChange={(e) =>
                              updateVariantOption(vIndex, oIndex, 'key', e.target.value)
                            }
                            placeholder="color-black, size-42..."
                            className={`admin-product-form__input ${errors[`variant_${vIndex}_option_${oIndex}_key`] ? 'admin-product-form__input--error' : ''}`}
                          />
                        </div>

                        <div className="admin-product-form__form-group">
                          <label className="admin-product-form__label">Значение опции *</label>
                          <input
                            type="text"
                            value={option.value}
                            onChange={(e) =>
                              updateVariantOption(vIndex, oIndex, 'value', e.target.value)
                            }
                            placeholder="Черный, 42..."
                            className={`admin-product-form__input ${errors[`variant_${vIndex}_option_${oIndex}_value`] ? 'admin-product-form__input--error' : ''}`}
                          />
                        </div>

                        {variant.type === 'color' && (
                          <div className="admin-product-form__form-group">
                            <label className="admin-product-form__label">Цвет (HEX)</label>
                            <input
                              type="color"
                              value={option.colorCode || '#000000'}
                              onChange={(e) =>
                                updateVariantOption(vIndex, oIndex, 'colorCode', e.target.value)
                              }
                              className="admin-product-form__input admin-product-form__input--color"
                            />
                          </div>
                        )}

                        <div className="admin-product-form__form-group">
                          <label className="admin-product-form__label">Модификатор цены</label>
                          <input
                            type="number"
                            step="0.01"
                            value={option.priceModifier}
                            onChange={(e) =>
                              updateVariantOption(
                                vIndex,
                                oIndex,
                                'priceModifier',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="admin-product-form__input"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="admin-product-form__form-row">
                        <div className="admin-product-form__form-group">
                          <label className="admin-product-form__label">Количество на складе</label>
                          <input
                            type="number"
                            min="0"
                            value={option.stockQuantity}
                            onChange={(e) =>
                              updateVariantOption(
                                vIndex,
                                oIndex,
                                'stockQuantity',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="admin-product-form__input"
                          />
                        </div>

                        <div className="admin-product-form__form-group">
                          <label className="admin-product-form__checkbox-label">
                            <input
                              type="checkbox"
                              checked={option.isDefault}
                              onChange={(e) =>
                                updateVariantOption(vIndex, oIndex, 'isDefault', e.target.checked)
                              }
                              className="admin-product-form__checkbox"
                            />
                            <span>По умолчанию</span>
                          </label>
                        </div>

                        <div className="admin-product-form__form-group">
                          <label className="admin-product-form__checkbox-label">
                            <input
                              type="checkbox"
                              checked={option.isAvailable}
                              onChange={(e) =>
                                updateVariantOption(
                                  vIndex,
                                  oIndex,
                                  'isAvailable',
                                  e.target.checked
                                )
                              }
                              className="admin-product-form__checkbox"
                            />
                            <span>Доступна</span>
                          </label>
                        </div>
                      </div>

                      {/* Изображения для опции */}
                      <div className="admin-product-form__form-group">
                        <label className="admin-product-form__label">Изображения опции</label>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleOptionImageUpload(vIndex, oIndex, e)}
                          className="admin-product-form__file-input"
                          ref={(el) => {
                            if (el) {
                              optionFileInputRefs.current[`${vIndex}_${oIndex}`] = el;
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="admin-product-form__upload-button"
                          onClick={() =>
                            optionFileInputRefs.current[`${vIndex}_${oIndex}`]?.click()
                          }
                        >
                          Загрузить изображения
                        </button>

                        {option.images && option.images.length > 0 && (
                          <div className="admin-product-form__image-previews">
                            {option.images.map((img, imgIndex) => (
                              <div key={imgIndex} className="admin-product-form__image-preview">
                                <img
                                  src={img.preview || img}
                                  alt={`Опция ${oIndex + 1} - ${imgIndex + 1}`}
                                />
                                <button
                                  type="button"
                                  className="admin-product-form__remove-image-button"
                                  onClick={() => removeOptionImage(vIndex, oIndex, imgIndex)}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              ))
            )}
          </div>

          {/* Комплектации */}
          {variants.length > 0 && (
            <div className="admin-product-form__section">
              <h2 className="admin-product-form__section-title">Комплектации</h2>
              <p className="admin-product-form__hint">
                Создайте комплектации товара, выбрав доступные комбинации вариантов
              </p>
              
              <button
                type="button"
                className="admin-product-form__add-button"
                onClick={addCombination}
              >
                + Добавить комплектацию
              </button>

              {combinations.map((combination, combIndex) => (
                <div key={combination.id || combIndex} className="admin-product-form__combination-group">
                  <div className="admin-product-form__combination-header">
                    <h3>Комплектация {combIndex + 1}</h3>
                    <button
                      type="button"
                      className="admin-product-form__remove-button"
                      onClick={() => removeCombination(combIndex)}
                    >
                      Удалить
                    </button>
                  </div>

                  <div className="admin-product-form__form-row">
                    {variants.map((variant, vIdx) => {
                      const selectedOption = combination.variants?.[variant.key] || '';
                      return (
                        <div key={`${variant.key}-${vIdx}`} className="admin-product-form__form-group">
                          <label className="admin-product-form__label">
                            {variant.name} *
                          </label>
                          <select
                            value={selectedOption}
                            onChange={(e) => updateCombinationVariant(combIndex, variant.key, e.target.value)}
                            className="admin-product-form__input"
                            required
                          >
                            <option value="">Выберите {variant.name.toLowerCase()}</option>
                            {variant.options?.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.value}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  <div className="admin-product-form__form-row">
                    <div className="admin-product-form__form-group">
                      <label className="admin-product-form__label">Цена комплектации</label>
                      <input
                        type="number"
                        step="0.01"
                        value={combination.price || formData.basePrice}
                        onChange={(e) => updateCombination(combIndex, 'price', parseFloat(e.target.value) || parseFloat(formData.basePrice) || 0)}
                        className="admin-product-form__input"
                        placeholder={formData.basePrice || '0.00'}
                      />
                    </div>

                    <div className="admin-product-form__form-group">
                      <label className="admin-product-form__label">Количество на складе</label>
                      <input
                        type="number"
                        min="0"
                        value={combination.stockQuantity || 0}
                        onChange={(e) => updateCombination(combIndex, 'stockQuantity', parseInt(e.target.value) || 0)}
                        className="admin-product-form__input"
                      />
                    </div>

                    <div className="admin-product-form__form-group">
                      <label className="admin-product-form__label">Артикул (SKU)</label>
                      <input
                        type="text"
                        value={combination.sku || ''}
                        onChange={(e) => updateCombination(combIndex, 'sku', e.target.value)}
                        className="admin-product-form__input"
                        placeholder="Необязательно"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {combinations.length === 0 && (
                <p className="admin-product-form__hint">
                  Добавьте опции к вариантам, затем создайте комплектации
                </p>
              )}
            </div>
          )}

          <div className="admin-product-form__actions">
            <button
              type="button"
              className="admin-product-form__cancel-button"
              onClick={() => navigate(ROUTES.ADMIN_PRODUCTS)}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="admin-product-form__submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение...' : isEditMode ? 'Сохранить изменения' : 'Создать товар'}
            </button>
          </div>
        </form>
      </div>

      {/* Модальное окно выбора варианта из конфигурации */}
      <Modal
        title="Выберите вариант"
        open={showVariantSelectModal}
        onCancel={() => setShowVariantSelectModal(false)}
        footer={null}
        width={600}
      >
        {categoryConfig && categoryConfig.variants ? (
          <div className="admin-product-form__variant-select">
            {categoryConfig.variants
              .filter(configVariant => !variants.some(v => v.key === configVariant.key))
              .map((configVariant) => (
                <button
                  key={configVariant.key}
                  type="button"
                  className="admin-product-form__variant-select-item"
                  onClick={() => handleSelectVariantFromConfig(configVariant.key)}
                >
                  <div className="admin-product-form__variant-select-info">
                    <h4>{configVariant.name}</h4>
                    <p className="admin-product-form__variant-select-key">
                      Ключ: <code>{configVariant.key}</code>
                    </p>
                    <p className="admin-product-form__variant-select-type">
                      Тип: {configVariant.type === 'color' ? 'Цвет' : configVariant.type === 'button' ? 'Кнопка' : 'Выпадающий список'}
                    </p>
                  </div>
                </button>
              ))}
            {categoryConfig.variants.filter(configVariant => !variants.some(v => v.key === configVariant.key)).length === 0 && (
              <p className="admin-product-form__hint">
                Все доступные варианты уже добавлены к товару
              </p>
            )}
          </div>
        ) : (
          <p className="admin-product-form__hint">
            Нет доступных вариантов для выбора
          </p>
        )}
      </Modal>
    </div>
  );
};

export default ProductForm;

