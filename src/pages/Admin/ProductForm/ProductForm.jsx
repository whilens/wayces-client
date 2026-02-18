import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminProductsAPI, adminCategoriesAPI } from '../../../services/api';
import { ROUTES } from '../../../utils/constants';
import { formatPrice } from '../../../utils/helpers';
import { getImageUrl } from '../../../utils/imageUtils';
import { notification } from 'antd';
import './ProductForm.css';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const fileInputRef = useRef(null);
  const optionFileInputRefs = useRef({});
  const hasUnsavedChangesRef = useRef(false);

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
  const [currentStep, setCurrentStep] = useState(1); // Визард: 1 — основное, 2 — варианты, 3 — комплектации
  const [manualVariantName, setManualVariantName] = useState('');
  const [manualVariantValues, setManualVariantValues] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchProduct();
    }
  }, [id]);

  // Шаг 2: загрузка конфига категории при входе, если ещё не загружен
  useEffect(() => {
    if (currentStep === 2 && formData.categoryId && !categoryConfig) {
      loadCategoryConfig(formData.categoryId, isEditMode);
    }
  }, [currentStep, formData.categoryId]);

  // Предупреждение при уходе со страницы с несохранёнными данными (закрытие вкладки, обновление)
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Шаг 2: подтянуть все варианты из конфига (добавить отсутствующие в state)
  useEffect(() => {
    if (currentStep !== 2 || !categoryConfig?.variants?.length) return;
    setVariants((prev) => {
      const next = [...prev];
      for (const cv of categoryConfig.variants) {
        if (next.some((v) => v.key === cv.key)) continue;
        next.push({
          key: cv.key,
          name: cv.name,
          type: cv.type || 'button',
          displayOrder: next.length,
          isRequired: true,
          options: [],
          availableOptions: cv.options || [],
        });
      }
      return next;
    });
  }, [currentStep, categoryConfig?.variants]);

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
    hasUnsavedChangesRef.current = true;
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

      // При редактировании товара подставляем доступные значения вариантов из конфига (для чекбоксов)
      if (preserveVariants && config?.variants?.length) {
        setVariants((prev) =>
          prev.map((v) => ({
            ...v,
            availableOptions: v.availableOptions ?? config.variants.find((cv) => cv.key === v.key)?.options ?? [],
          }))
        );
      }
      
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
    hasUnsavedChangesRef.current = true;
    const newSpecs = [...specifications];
    newSpecs[index][field] = value;
    setSpecifications(newSpecs);
  };

  const addSpecification = () => {
    hasUnsavedChangesRef.current = true;
    setSpecifications([...specifications, { key: '', value: '' }]);
  };

  const removeSpecification = (index) => {
    hasUnsavedChangesRef.current = true;
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e) => {
    hasUnsavedChangesRef.current = true;
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages([...images, ...newImages]);
  };

  const removeImage = (index) => {
    hasUnsavedChangesRef.current = true;
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    // Если удаляемое изображение было defaultImage, сбрасываем выбор
    if (selectedDefaultImage === -(index + 1)) {
      setSelectedDefaultImage(null);
    }
  };

  const removeExistingImage = (imageId) => {
    hasUnsavedChangesRef.current = true;
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

  // Переключение опции из списка доступных (чекбокс): добавить/убрать из variant.options
  const toggleVariantOptionFromList = (variantIndex, optionFromConfig) => {
    hasUnsavedChangesRef.current = true;
    const newVariants = [...variants];
    const variant = newVariants[variantIndex];
    const exists = variant.options.some((o) => o.key === optionFromConfig.key);
    if (exists) {
      variant.options = variant.options.filter((o) => o.key !== optionFromConfig.key);
    } else {
      variant.options = [
        ...(variant.options || []),
        {
          key: optionFromConfig.key,
          value: optionFromConfig.value,
          colorCode: optionFromConfig.colorCode || '',
          priceModifier: 0,
          images: [],
          isDefault: variant.options.length === 0,
          isAvailable: true,
          stockQuantity: 0,
          displayOrder: variant.options.length,
        },
      ];
    }
    setVariants(newVariants);
  };

  const removeVariant = (index) => {
    hasUnsavedChangesRef.current = true;
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Slug для ключей при ручном добавлении варианта
  const toSlug = (s) =>
    String(s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') || 'option';

  // Добавить вариант вручную (когда в конфиге категории нет вариантов)
  const addManualVariant = (variantName, valuesStr) => {
    const name = variantName.trim();
    if (!name) return;
    hasUnsavedChangesRef.current = true;
    const values = valuesStr
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length === 0) return;
    const variantKey = toSlug(name);
    const options = values.map((val, i) => ({
      key: toSlug(val) || `${variantKey}-${i}`,
      value: val,
      colorCode: '',
      priceModifier: 0,
      images: [],
      isDefault: i === 0,
      isAvailable: true,
      stockQuantity: 0,
      displayOrder: i,
    }));
    setVariants((prev) => [
      ...prev,
      {
        key: variantKey,
        name,
        type: 'button',
        displayOrder: prev.length,
        isRequired: true,
        options,
        availableOptions: [],
      },
    ]);
  };

  // Количество комбинаций (декартово произведение размеров опций)
  const combinationsCount =
    variants.length === 0
      ? 0
      : variants.reduce((n, v) => n * Math.max(1, (v.options?.length || 0)), 1);

  const validateStep2 = () => {
    if (variants.length === 0) return false;
    const hasOptions = variants.every((v) => (v.options?.length || 0) > 0);
    return hasOptions;
  };

  const validateStep3 = () => {
    if (variants.length > 0 && combinations.length === 0) return false;
    const invalid = combinations.some(
      (c) => (c.price ?? 0) < 0 || (c.stockQuantity ?? 0) < 0
    );
    return !invalid;
  };

  // Ключ комбинации (как на бэкенде) для слияния при редактировании
  const getCombinationKey = (variantsObj) =>
    Object.keys(variantsObj || {})
      .sort()
      .map((k) => `${k}-${variantsObj[k]}`)
      .join('_');

  // Декартово произведение вариантов → массив { variants, price, stockQuantity, sku }
  const buildCombinationsTable = (variantList, basePriceNum) => {
    const list = variantList.filter((v) => (v.options?.length || 0) > 0);
    if (list.length === 0) return [];
    const basePrice = parseFloat(basePriceNum) || 0;
    const build = (index, current) => {
      if (index === list.length) return [{ ...current }];
      const v = list[index];
      const result = [];
      for (const opt of v.options) {
        result.push(...build(index + 1, { ...current, [v.key]: opt.key }));
      }
      return result;
    };
    const raw = build(0, {});
    return raw.map((variantsObj) => {
      let price = basePrice;
      for (const [vKey, oKey] of Object.entries(variantsObj)) {
        const v = list.find((x) => x.key === vKey);
        const opt = v?.options?.find((o) => o.key === oKey);
        if (opt) price += parseFloat(opt.priceModifier || 0);
      }
      return { variants: variantsObj, price, stockQuantity: 0, sku: '' };
    });
  };

  // На шаге 3: собрать таблицу из вариантов и слить с существующими комплектациями
  useEffect(() => {
    if (currentStep !== 3 || variants.length === 0) return;
    const built = buildCombinationsTable(variants, formData.basePrice);
    const keyToExisting = new Map();
    combinations.forEach((c) => {
      const key = getCombinationKey(c.variants);
      if (key) keyToExisting.set(key, c);
    });
    const merged = built.map((row) => {
      const key = getCombinationKey(row.variants);
      const existing = keyToExisting.get(key);
      if (existing) {
        return {
          variants: row.variants,
          price: existing.price ?? row.price,
          stockQuantity: existing.stockQuantity ?? row.stockQuantity,
          sku: existing.sku ?? row.sku,
        };
      }
      return row;
    });
    setCombinations(merged);
  }, [currentStep, variants]);

  const applyBulkPrice = (value) => {
    const num = parseFloat(value);
    if (Number.isNaN(num) || num < 0) return;
    hasUnsavedChangesRef.current = true;
    setCombinations((prev) =>
      prev.map((c) => ({ ...c, price: num }))
    );
  };

  const applyBulkStock = (value) => {
    const num = parseInt(value, 10);
    if (Number.isNaN(num) || num < 0) return;
    hasUnsavedChangesRef.current = true;
    setCombinations((prev) =>
      prev.map((c) => ({ ...c, stockQuantity: num }))
    );
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

  const updateCombination = (index, field, value) => {
    hasUnsavedChangesRef.current = true;
    const newCombinations = [...combinations];
    newCombinations[index][field] = value;
    setCombinations(newCombinations);
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Название обязательно';
    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) newErrors.basePrice = 'Цена должна быть больше 0';
    if (!formData.description.trim()) newErrors.description = 'Описание обязательно';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAsSimple = async () => {
    if (!validateStep1()) {
      notification.error({
        message: 'Ошибка валидации',
        description: 'Заполните название, цену и описание',
        placement: 'topRight',
      });
      return;
    }
    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('basePrice', formData.basePrice);
      if (formData.categoryId) formDataToSend.append('categoryId', formData.categoryId);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('isActive', formData.isActive);
      if (formData.discountType) {
        formDataToSend.append('discountType', formData.discountType);
        formDataToSend.append('discountValue', formData.discountValue || '0');
      } else {
        formDataToSend.append('discountType', '');
        formDataToSend.append('discountValue', '0');
      }
      const specsObj = {};
      specifications.forEach((spec) => {
        if (spec.key && spec.value) specsObj[spec.key] = spec.value;
      });
      formDataToSend.append('specifications', JSON.stringify(specsObj));
      formDataToSend.append('variants', JSON.stringify([]));
      formDataToSend.append('combinations', JSON.stringify([]));
      images.forEach((img) => formDataToSend.append('images', img.file));
      if (deletedImageIds.length > 0) formDataToSend.append('removeImages', JSON.stringify(deletedImageIds));
      if (selectedDefaultImage !== null) {
        if (selectedDefaultImage < 0) {
          const newImageIndex = Math.abs(selectedDefaultImage) - 1;
          if (images[newImageIndex]) {
            formDataToSend.append('defaultImageFromNew', 'true');
            formDataToSend.append('defaultImageNewIndex', newImageIndex.toString());
          }
        } else {
          const existingImg = existingImages.find((img) => img.id === selectedDefaultImage);
          if (existingImg) formDataToSend.append('defaultImage', existingImg.imageUrl);
        }
      } else if (images.length > 0) {
        formDataToSend.append('defaultImageFromNew', 'true');
        formDataToSend.append('defaultImageNewIndex', '0');
      } else if (existingImages.length > 0 && isEditMode) {
        formDataToSend.append('defaultImage', existingImages[0].imageUrl);
      }
      if (isEditMode) {
        await adminProductsAPI.update(id, formDataToSend);
      } else {
        await adminProductsAPI.create(formDataToSend);
      }
      notification.success({
        message: isEditMode ? 'Товар обновлен' : 'Товар создан',
        description: `Товар "${formData.name}" сохранён как простой (без вариантов)`,
        placement: 'topRight',
      });
      hasUnsavedChangesRef.current = false;
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

    if (!validateStep1()) {
      notification.error({
        message: 'Ошибка валидации',
        description: 'Заполните название, цену и описание',
        placement: 'topRight',
      });
      return;
    }
    if (variants.length > 0 && !validateStep2()) {
      notification.error({
        message: 'Ошибка валидации',
        description: 'У каждого варианта должна быть отмечена хотя бы одна опция',
        placement: 'topRight',
      });
      return;
    }
    if (variants.length > 0 && !validateStep3()) {
      notification.error({
        message: 'Ошибка валидации',
        description: 'Проверьте: цена и остаток не должны быть отрицательными',
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

      // Обрабатываем варианты: извлекаем File объекты из изображений опций (availableOptions не отправляем)
      const processedVariants = variants.map((variant, vIndex) => {
        const { availableOptions, ...variantRest } = variant;
        const processedVariant = { ...variantRest };
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
      hasUnsavedChangesRef.current = false;
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
            aria-label="Назад к списку товаров"
          >
            ← Назад к товарам
          </button>
          <h1 className="admin-product-form__title">
            {isEditMode ? 'Редактирование товара' : 'Добавление товара'}
          </h1>
          <nav className="admin-product-form__steps" aria-label="Шаги формы товара">
            <span className={currentStep === 1 ? 'admin-product-form__step--active' : ''} aria-current={currentStep === 1 ? 'step' : undefined}>1. Основное</span>
            <span className="admin-product-form__step-sep" aria-hidden="true">→</span>
            <span className={currentStep === 2 ? 'admin-product-form__step--active' : ''} aria-current={currentStep === 2 ? 'step' : undefined}>2. Варианты</span>
            <span className="admin-product-form__step-sep" aria-hidden="true">→</span>
            <span className={currentStep === 3 ? 'admin-product-form__step--active' : ''} aria-current={currentStep === 3 ? 'step' : undefined}>3. Комплектации</span>
          </nav>
        </div>

        <form className="admin-product-form__form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          {/* Шаг 1: Основное */}
          {currentStep === 1 && (
            <>
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
                <p className="admin-product-form__hint admin-product-form__hint--small">
                  Варианты и автоартикулы зависят от выбранной категории.
                </p>
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

          <div className="admin-product-form__actions admin-product-form__actions--step">
            {(!isEditMode || variants.length === 0) && (
              <button
                type="button"
                className="admin-product-form__submit-button"
                disabled={isLoading}
                onClick={handleSaveAsSimple}
                aria-label={isLoading ? 'Сохранение...' : 'Сохранить как простой товар без вариантов'}
              >
                {isLoading ? 'Сохранение...' : 'Сохранить как простой товар'}
              </button>
            )}
            <button
              type="button"
              className="admin-product-form__submit-button"
              aria-label="Перейти к шагу 2: Варианты"
              onClick={() => {
                if (!validateStep1()) {
                  notification.error({
                    message: 'Ошибка валидации',
                    description: 'Заполните название, цену и описание',
                    placement: 'topRight',
                  });
                  return;
                }
                // При первом переходе на шаг 2 заполняем варианты из конфига категории
                if (categoryConfig?.variants?.length && variants.length === 0) {
                  setVariants(
                    categoryConfig.variants.map((v, i) => ({
                      key: v.key,
                      name: v.name,
                      type: v.type || 'button',
                      displayOrder: i,
                      isRequired: true,
                      options: [],
                      availableOptions: v.options || [],
                    }))
                  );
                }
                setCurrentStep(2);
              }}
            >
              Далее: указать варианты
            </button>
          </div>
            </>
          )}

          {/* Шаг 2: Варианты */}
          {currentStep === 2 && (
            <>
          <div className="admin-product-form__section">
            <h2 className="admin-product-form__section-title">Варианты товара</h2>

            {!formData.categoryId ? (
              <p className="admin-product-form__hint">
                Выберите категорию на шаге 1, чтобы загрузить варианты из конфигурации или добавьте вариант вручную ниже.
              </p>
            ) : null}

            {/* Варианты из конфига категории */}
            {formData.categoryId && categoryConfig?.variants?.length > 0 && (
              <>
                <p className="admin-product-form__hint" style={{ marginBottom: '1rem' }}>
                  Отметьте значения, которые есть у этой модели.
                </p>
                {categoryConfig.variants.map((configVariant) => {
                  const vIndex = variants.findIndex((v) => v.key === configVariant.key);
                  if (vIndex === -1) return null;
                  const variant = variants[vIndex];
                  return (
                    <div key={variant.key} className="admin-product-form__variant-group admin-product-form__variant-group--step2">
                      <h3 className="admin-product-form__variant-step2-title">{variant.name}</h3>
                      <div className="admin-product-form__option-checkboxes admin-product-form__option-checkboxes--step2">
                        {(variant.availableOptions || []).map((opt) => {
                          const isSelected = variant.options?.some((o) => o.key === opt.key);
                          return (
                            <label
                              key={opt.key}
                              className="admin-product-form__option-checkbox-label"
                            >
                              <input
                                type="checkbox"
                                checked={!!isSelected}
                                onChange={() => toggleVariantOptionFromList(vIndex, opt)}
                              />
                              {variant.type === 'color' && opt.colorCode && (
                                <span
                                  className="admin-product-form__option-color-swatch"
                                  style={{ backgroundColor: opt.colorCode }}
                                  title={opt.value}
                                />
                              )}
                              <span>{opt.value}</span>
                            </label>
                          );
                        })}
                      </div>
                      {variant.options?.length > 0 && (
                        <p className="admin-product-form__hint admin-product-form__hint--small">
                          Выбрано: {variant.options.length}
                        </p>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Ручной вариант: когда категория не выбрана или в конфиге нет вариантов */}
            {(!formData.categoryId || !categoryConfig || !categoryConfig.variants?.length) && (
              <div className="admin-product-form__manual-variant">
                <h3 className="admin-product-form__manual-variant-title">Добавить вариант вручную</h3>
                <p className="admin-product-form__hint">
                  У категории нет предустановленных вариантов. Укажите название и значения через запятую.
                </p>
                <div className="admin-product-form__form-row">
                  <div className="admin-product-form__form-group">
                    <label className="admin-product-form__label">Название варианта</label>
                    <input
                      type="text"
                      value={manualVariantName}
                      onChange={(e) => setManualVariantName(e.target.value)}
                      className="admin-product-form__input"
                      placeholder="Например: Размер"
                    />
                  </div>
                  <div className="admin-product-form__form-group">
                    <label className="admin-product-form__label">Значения (через запятую)</label>
                    <input
                      type="text"
                      value={manualVariantValues}
                      onChange={(e) => setManualVariantValues(e.target.value)}
                      className="admin-product-form__input"
                      placeholder="42, 44, 46, 48"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-product-form__add-button"
                  onClick={() => {
                    addManualVariant(manualVariantName, manualVariantValues);
                    setManualVariantName('');
                    setManualVariantValues('');
                  }}
                  disabled={!manualVariantName.trim() || !manualVariantValues.trim()}
                >
                  + Добавить вариант
                </button>
              </div>
            )}

            {/* Подсчёт комбинаций */}
            {variants.length > 0 && (
              <div className="admin-product-form__variants-summary">
                <p className="admin-product-form__hint">
                  Будет создано <strong>{combinationsCount}</strong> комбинаций.
                </p>
              </div>
            )}
          </div>

          <div className="admin-product-form__actions admin-product-form__actions--step">
            <button type="button" className="admin-product-form__cancel-button" onClick={() => setCurrentStep(1)} aria-label="Назад к шагу 1: Основное">
              Назад
            </button>
            <button
              type="button"
              className="admin-product-form__submit-button"
              aria-label="Перейти к шагу 3: Комплектации"
              onClick={() => {
                if (variants.length === 0) {
                  notification.warning({
                    message: 'Нет вариантов',
                    description: 'Добавьте хотя бы один вариант или сохраните товар как простой на шаге 1.',
                    placement: 'topRight',
                  });
                  return;
                }
                if (!validateStep2()) {
                  notification.warning({
                    message: 'Выберите значения',
                    description: 'У каждого варианта должна быть отмечена хотя бы одна опция.',
                    placement: 'topRight',
                  });
                  return;
                }
                setCurrentStep(3);
              }}
            >
              Далее: комплектации
            </button>
          </div>
            </>
          )}

          {/* Шаг 3: Комплектации */}
          {currentStep === 3 && (
            <>
          {variants.length > 0 ? (
            <div className="admin-product-form__section">
              <h2 className="admin-product-form__section-title">Комплектации</h2>
              <p className="admin-product-form__hint">
                Проверьте цены и остатки. Ключи вариантов в интерфейсе не отображаются.
              </p>

              {/* Массовые действия */}
              <div className="admin-product-form__bulk-actions">
                <div className="admin-product-form__bulk-row">
                  <label className="admin-product-form__label">Одна цена для всех</label>
                  <div className="admin-product-form__bulk-input-row">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      className="admin-product-form__input admin-product-form__bulk-input"
                      placeholder={formData.basePrice || '0'}
                    />
                    <button
                      type="button"
                      className="admin-product-form__add-button"
                      onClick={() => { applyBulkPrice(bulkPrice); setBulkPrice(''); }}
                      aria-label="Применить одну цену ко всем комплектациям"
                    >
                      Применить
                    </button>
                  </div>
                </div>
                <div className="admin-product-form__bulk-row">
                  <label className="admin-product-form__label">Остаток для всех</label>
                  <div className="admin-product-form__bulk-input-row">
                    <input
                      type="number"
                      min="0"
                      value={bulkStock}
                      onChange={(e) => setBulkStock(e.target.value)}
                      className="admin-product-form__input admin-product-form__bulk-input"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      className="admin-product-form__add-button"
                      onClick={() => { applyBulkStock(bulkStock); setBulkStock(''); }}
                      aria-label="Применить один остаток ко всем комплектациям"
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-product-form__table-wrap" role="region" aria-label="Таблица комплектаций: варианты, цена, остаток, артикул">
                <p className="admin-product-form__table-scroll-hint" aria-hidden="true">На узких экранах таблицу можно прокрутить вправо.</p>
                <table className="admin-product-form__combinations-table" aria-label="Комплектации товара">
                  <caption className="admin-product-form__table-caption">Цена, остаток и артикул по комбинациям вариантов</caption>
                  <thead>
                    <tr>
                      {variants.map((v) => (
                        <th key={v.key} scope="col">{v.name}</th>
                      ))}
                      <th scope="col">Цена</th>
                      <th scope="col">Остаток</th>
                      <th scope="col">Артикул</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinations.map((combination, combIndex) => (
                      <tr key={getCombinationKey(combination.variants) || combIndex}>
                        {variants.map((v) => {
                          const optionKey = combination.variants?.[v.key];
                          const option = v.options?.find((o) => o.key === optionKey);
                          return (
                            <td key={v.key}>{option ? option.value : '—'}</td>
                          );
                        })}
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={combination.price ?? ''}
                            onChange={(e) => updateCombination(combIndex, 'price', parseFloat(e.target.value) || 0)}
                            className="admin-product-form__input admin-product-form__table-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={combination.stockQuantity ?? ''}
                            onChange={(e) => updateCombination(combIndex, 'stockQuantity', parseInt(e.target.value, 10) || 0)}
                            className="admin-product-form__input admin-product-form__table-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={combination.sku ?? ''}
                            onChange={(e) => updateCombination(combIndex, 'sku', e.target.value)}
                            className="admin-product-form__input admin-product-form__table-input"
                            placeholder={
                              formData.categoryId && categories.find((c) => c.id === Number(formData.categoryId))?.skuAutoGenerate
                                ? 'Авто'
                                : ''
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {formData.categoryId && categories.find((c) => c.id === Number(formData.categoryId))?.skuAutoGenerate && (
                <p className="admin-product-form__hint admin-product-form__hint--small">
                  Пустой артикул — подставится автоматически по категории.
                </p>
              )}
            </div>
          ) : (
            <div className="admin-product-form__section">
              <p className="admin-product-form__hint">
                Варианты не добавлены. Сохраните товар как простой или вернитесь на шаг 2 и добавьте варианты.
              </p>
            </div>
          )}

          <div className="admin-product-form__actions">
            <button type="button" className="admin-product-form__cancel-button" onClick={() => setCurrentStep(2)} aria-label="Назад к шагу 2: Варианты">
              Назад
            </button>
            <button
              type="button"
              className="admin-product-form__cancel-button"
              onClick={() => navigate(ROUTES.ADMIN_PRODUCTS)}
              aria-label="Отмена и возврат к списку товаров"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="admin-product-form__submit-button"
              disabled={isLoading}
              aria-label={isLoading ? 'Сохранение...' : isEditMode ? 'Сохранить изменения товара' : 'Создать товар'}
            >
              {isLoading ? 'Сохранение...' : isEditMode ? 'Сохранить изменения' : 'Создать товар'}
            </button>
          </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProductForm;

