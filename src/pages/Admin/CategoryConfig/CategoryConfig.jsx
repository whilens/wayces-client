import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminCategoriesAPI } from '../../../services/api';
import { notification, Modal, Input, Select, Button } from 'antd';
import { ROUTES } from '../../../utils/constants';
import './CategoryConfig.css';

const { Option } = Select;
const { TextArea } = Input;

const CategoryConfig = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [specifications, setSpecifications] = useState([]);
  const [variants, setVariants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSpec, setEditingSpec] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  useEffect(() => {
    if (categoryId) {
      loadConfig();
    }
  }, [categoryId]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const response = await adminCategoriesAPI.getFullConfig(categoryId);
      setCategory(response.data.category);
      setSpecifications(response.data.specifications || []);
      setVariants(response.data.variants || []);
    } catch (error) {
      console.error('Ошибка загрузки конфигурации:', error);
      notification.error({
        message: 'Ошибка',
        description: error.response?.data?.error || 'Не удалось загрузить конфигурацию',
        placement: 'topRight',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSpecification = () => {
    setEditingSpec(null);
    setIsSpecModalOpen(true);
  };

  const handleEditSpecification = (spec) => {
    setEditingSpec(spec);
    setIsSpecModalOpen(true);
  };

  const handleDeleteSpecification = async (id) => {
    Modal.confirm({
      title: 'Удалить характеристику?',
      content: 'Это действие нельзя отменить.',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await adminCategoriesAPI.deleteSpecification(categoryId, id);
          notification.success({
            message: 'Характеристика удалена',
            placement: 'topRight',
          });
          loadConfig();
        } catch (error) {
          notification.error({
            message: 'Ошибка',
            description: error.response?.data?.error || 'Не удалось удалить характеристику',
            placement: 'topRight',
          });
        }
      },
    });
  };

  const handleSaveSpecification = async (values) => {
    try {
      if (editingSpec) {
        await adminCategoriesAPI.updateSpecification(categoryId, editingSpec.id, values);
        notification.success({
          message: 'Характеристика обновлена',
          placement: 'topRight',
        });
      } else {
        await adminCategoriesAPI.addSpecification(categoryId, values);
        notification.success({
          message: 'Характеристика добавлена',
          placement: 'topRight',
        });
      }
      setIsSpecModalOpen(false);
      setEditingSpec(null);
      loadConfig();
    } catch (error) {
      notification.error({
        message: 'Ошибка',
        description: error.response?.data?.error || 'Не удалось сохранить характеристику',
        placement: 'topRight',
      });
    }
  };

  const handleAddVariant = () => {
    setEditingVariant(null);
    setIsVariantModalOpen(true);
  };

  const handleEditVariant = (variant) => {
    setEditingVariant(variant);
    setIsVariantModalOpen(true);
  };

  const handleDeleteVariant = async (id) => {
    Modal.confirm({
      title: 'Удалить вариант?',
      content: 'Это действие нельзя отменить.',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await adminCategoriesAPI.deleteVariant(categoryId, id);
          notification.success({
            message: 'Вариант удален',
            placement: 'topRight',
          });
          loadConfig();
        } catch (error) {
          notification.error({
            message: 'Ошибка',
            description: error.response?.data?.error || 'Не удалось удалить вариант',
            placement: 'topRight',
          });
        }
      },
    });
  };

  const handleSaveVariant = async (values) => {
    try {
      if (editingVariant) {
        await adminCategoriesAPI.updateVariant(categoryId, editingVariant.id, values);
        notification.success({
          message: 'Вариант обновлен',
          placement: 'topRight',
        });
      } else {
        await adminCategoriesAPI.addVariant(categoryId, values);
        notification.success({
          message: 'Вариант добавлен',
          placement: 'topRight',
        });
      }
      setIsVariantModalOpen(false);
      setEditingVariant(null);
      loadConfig();
    } catch (error) {
      notification.error({
        message: 'Ошибка',
        description: error.response?.data?.error || 'Не удалось сохранить вариант',
        placement: 'topRight',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="admin-category-config">
        <div className="admin-category-config__container">
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-category-config">
      <div className="admin-category-config__container">
        <div className="admin-category-config__header">
          <button
            className="admin-category-config__back-button"
            onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
          >
            ← Назад
          </button>
          <h1 className="admin-category-config__title">
            Конфигурация категории: {category?.name || 'Неизвестно'}
          </h1>
        </div>

        {/* Характеристики */}
        <div className="admin-category-config__section">
          <div className="admin-category-config__section-header">
            <h2 className="admin-category-config__section-title">Характеристики</h2>
            <button
              className="admin-category-config__add-button"
              onClick={handleAddSpecification}
            >
              + Добавить характеристику
            </button>
          </div>

          {specifications.length === 0 ? (
            <p className="admin-category-config__empty">Характеристики не добавлены</p>
          ) : (
            <div className="admin-category-config__list">
              {specifications.map((spec) => (
                <div key={spec.id} className="admin-category-config__item">
                  <div className="admin-category-config__item-content">
                    <div className="admin-category-config__item-main">
                      <span className="admin-category-config__item-key">{spec.key}</span>
                      <span className="admin-category-config__item-label">{spec.label}</span>
                      <span className="admin-category-config__item-type">{spec.type}</span>
                    {spec.unit && (
                      <span className="admin-category-config__item-unit">unit: {spec.unit}</span>
                    )}
                    </div>
                    {spec.options && (
                      <div className="admin-category-config__item-options">
                        Опции: {Array.isArray(spec.options) ? spec.options.join(', ') : 'Нет'}
                      </div>
                    )}
                  </div>
                  <div className="admin-category-config__item-actions">
                    <button
                      className="admin-category-config__edit-button"
                      onClick={() => handleEditSpecification(spec)}
                    >
                      Редактировать
                    </button>
                    <button
                      className="admin-category-config__delete-button"
                      onClick={() => handleDeleteSpecification(spec.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Варианты */}
        <div className="admin-category-config__section">
          <div className="admin-category-config__section-header">
            <h2 className="admin-category-config__section-title">Варианты</h2>
            <button
              className="admin-category-config__add-button"
              onClick={handleAddVariant}
            >
              + Добавить вариант
            </button>
          </div>

          {variants.length === 0 ? (
            <p className="admin-category-config__empty">Варианты не добавлены</p>
          ) : (
            <div className="admin-category-config__list">
              {variants.map((variant) => (
                <div key={variant.id} className="admin-category-config__item">
                  <div className="admin-category-config__item-content">
                    <div className="admin-category-config__item-main">
                      <span className="admin-category-config__item-key">{variant.key}</span>
                      <span className="admin-category-config__item-label">{variant.name}</span>
                      <span className="admin-category-config__item-type">{variant.type}</span>
                      {variant.isRequired && (
                        <span className="admin-category-config__item-required">Обязательный</span>
                      )}
                      {variant.unit && (
                        <span className="admin-category-config__item-unit">unit: {variant.unit}</span>
                      )}
                      {Array.isArray(variant.optionValues) && variant.optionValues.length > 0 && (
                        <span className="admin-category-config__item-unit">Значений: {variant.optionValues.length}</span>
                      )}
                    </div>
                  </div>
                  <div className="admin-category-config__item-actions">
                    <button
                      className="admin-category-config__edit-button"
                      onClick={() => handleEditVariant(variant)}
                    >
                      Редактировать
                    </button>
                    <button
                      className="admin-category-config__delete-button"
                      onClick={() => handleDeleteVariant(variant.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно для характеристики */}
      <SpecificationModal
        open={isSpecModalOpen}
        onCancel={() => {
          setIsSpecModalOpen(false);
          setEditingSpec(null);
        }}
        onSave={handleSaveSpecification}
        specification={editingSpec}
      />

      {/* Модальное окно для варианта */}
      <VariantModal
        open={isVariantModalOpen}
        onCancel={() => {
          setIsVariantModalOpen(false);
          setEditingVariant(null);
        }}
        onSave={handleSaveVariant}
        variant={editingVariant}
      />
    </div>
  );
};

// Модальное окно для редактирования характеристики
const SpecificationModal = ({ open, onCancel, onSave, specification }) => {
  const [formData, setFormData] = useState({
    key: '',
    label: '',
    type: 'text',
    options: '',
    displayOrder: 0,
    unit: '',
  });

  useEffect(() => {
    if (specification) {
      setFormData({
        key: specification.key || '',
        label: specification.label || '',
        type: specification.type || 'text',
        options: specification.options ? (Array.isArray(specification.options) ? specification.options.join('\n') : '') : '',
        displayOrder: specification.displayOrder || 0,
        unit: specification.unit || '',
      });
    } else {
      setFormData({
        key: '',
        label: '',
        type: 'text',
        options: '',
        displayOrder: 0,
        unit: '',
      });
    }
  }, [specification, open]);

  const handleSubmit = () => {
    if (!formData.key || !formData.label || !formData.type) {
      notification.warning({
        message: 'Заполните все обязательные поля',
        placement: 'topRight',
      });
      return;
    }

    const options = formData.options
      ? formData.options.split('\n').filter(opt => opt.trim())
      : null;

    onSave({
      key: formData.key,
      label: formData.label,
      type: formData.type,
      options: formData.type === 'select' ? options : null,
      displayOrder: parseInt(formData.displayOrder) || 0,
      unit: formData.unit || null,
    });
  };

  return (
    <Modal
      title={specification ? 'Редактировать характеристику' : 'Добавить характеристику'}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="Сохранить"
      cancelText="Отмена"
      width={600}
    >
      <div className="admin-category-config__modal-form">
        <div className="admin-category-config__form-group">
          <label>Ключ (key) *</label>
          <Input
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            placeholder="material"
            disabled={!!specification}
          />
          <small>Латинские буквы, без пробелов (например: material, weight)</small>
        </div>

        <div className="admin-category-config__form-group">
          <label>Название (label) *</label>
          <Input
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            placeholder="Материал"
          />
        </div>

        <div className="admin-category-config__form-group">
          <label>Тип *</label>
          <Select
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value })}
            style={{ width: '100%' }}
          >
            <Option value="text">Текст</Option>
            <Option value="number">Число</Option>
            <Option value="select">Выбор из списка</Option>
          </Select>
        </div>

        {formData.type === 'select' && (
          <div className="admin-category-config__form-group">
            <label>Опции (каждая с новой строки)</label>
            <TextArea
              value={formData.options}
              onChange={(e) => setFormData({ ...formData, options: e.target.value })}
              placeholder="Да&#10;Нет"
              rows={4}
            />
          </div>
        )}

        <div className="admin-category-config__form-group">
          <label>Порядок отображения</label>
          <Input
            type="number"
            value={formData.displayOrder}
            onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
            min={0}
          />
        </div>

        <div className="admin-category-config__form-group">
          <label>Единица измерения (unit)</label>
          <Input
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="г, кг, дюйм, ГБ, МБ и т.д."
          />
          <small>Опционально. Будет отображаться после значения (например: "200 г")</small>
        </div>
      </div>
    </Modal>
  );
};

// Модальное окно для редактирования варианта
const VariantModal = ({ open, onCancel, onSave, variant }) => {
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    type: 'button',
    isRequired: true,
    displayOrder: 0,
    unit: '',
    optionValues: [],
  });

  const isColorVariant = (key, type) => key === 'color' || type === 'color';

  useEffect(() => {
    if (!open) return;
    if (variant) {
      const raw = variant.optionValues && Array.isArray(variant.optionValues) ? variant.optionValues : [];
      const colorDefs = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#795548', '#000000'];
      setFormData({
        key: variant.key || '',
        name: variant.name || '',
        type: variant.type || 'button',
        isRequired: variant.isRequired !== false,
        displayOrder: variant.displayOrder || 0,
        unit: variant.unit || '',
        optionValues:
          raw.length
            ? raw.map((o, i) => {
                const needColor = isColorVariant(variant.key, variant.type);
                const fallback = needColor ? colorDefs[i % colorDefs.length] : '';
                return { value: o.value || '', colorCode: (o.colorCode || fallback).toString().toLowerCase() };
              })
            : [],
      });
    } else {
      setFormData({
        key: '',
        name: '',
        type: 'button',
        isRequired: true,
        displayOrder: 0,
        unit: '',
        optionValues: [],
      });
    }
  }, [open, variant?.id]);

  // Палитра дефолтов для варианта «Цвет», чтобы новые значения не были все чёрными
  const COLOR_DEFAULTS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#795548', '#000000'];

  const addOptionValue = () => {
    setFormData((prev) => {
      const isColorVariant = prev.key === 'color' || prev.type === 'color';
      const nextIndex = prev.optionValues.length;
      const defaultColor = isColorVariant ? COLOR_DEFAULTS[nextIndex % COLOR_DEFAULTS.length] : '#000000';
      return {
        ...prev,
        optionValues: [...prev.optionValues, { value: '', colorCode: defaultColor }],
      };
    });
  };

  const removeOptionValue = (index) => {
    setFormData((prev) => ({
      ...prev,
      optionValues: prev.optionValues.filter((_, i) => i !== index),
    }));
  };

  const updateOptionValue = (index, field, value) => {
    const normalized = field === 'colorCode' && value ? String(value).toLowerCase() : value;
    setFormData((prev) => {
      const next = [...prev.optionValues];
      next[index] = { ...next[index], [field]: normalized };
      return { ...prev, optionValues: next };
    });
  };

  // Неконтролируемый цвет: в state не пишем при каждом движении ползунка, только по debounce — убирает цикл обновлений
  const pendingColorsRef = useRef({});
  const colorDebounceRef = useRef(null);
  const handleColorChange = (index, value) => {
    const normalized = value ? String(value).toLowerCase() : value;
    pendingColorsRef.current[index] = normalized;
    if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current);
    colorDebounceRef.current = setTimeout(() => {
      const pending = { ...pendingColorsRef.current };
      pendingColorsRef.current = {};
      colorDebounceRef.current = null;
      if (Object.keys(pending).length === 0) return;
      setFormData((prev) => {
        const next = [...prev.optionValues];
        Object.entries(pending).forEach(([i, v]) => {
          if (v && next[Number(i)]) next[Number(i)] = { ...next[Number(i)], colorCode: v };
        });
        return { ...prev, optionValues: next };
      });
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current);
    };
  }, []);

  const handleSubmit = () => {
    if (!formData.key || !formData.name || !formData.type) {
      notification.warning({
        message: 'Заполните все обязательные поля',
        placement: 'topRight',
      });
      return;
    }

    const isColor = isColorVariant(formData.key, formData.type);
    const optionValues = formData.optionValues
      .map((o) => ({
        value: (o.value || '').trim(),
        colorCode: isColor && (o.colorCode || '').trim() ? (o.colorCode || '').trim() : null,
      }))
      .filter((o) => o.value !== '');

    onSave({
      key: formData.key,
      name: formData.name,
      type: formData.type,
      isRequired: formData.isRequired,
      displayOrder: parseInt(formData.displayOrder) || 0,
      unit: formData.unit || null,
      optionValues,
    });
  };

  return (
    <Modal
      title={variant ? 'Редактировать вариант' : 'Добавить вариант'}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="Сохранить"
      cancelText="Отмена"
      width={600}
    >
      <div className="admin-category-config__modal-form">
        <div className="admin-category-config__form-group">
          <label>Ключ (key) *</label>
          <Input
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            placeholder="color"
            disabled={!!variant}
          />
          <small>Латинские буквы, без пробелов (например: color, size, memory)</small>
        </div>

        <div className="admin-category-config__form-group">
          <label>Название (name) *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Цвет"
          />
        </div>

        <div className="admin-category-config__form-group">
          <label>Тип *</label>
          <Select
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value })}
            style={{ width: '100%' }}
          >
            <Option value="button">Кнопки</Option>
            <Option value="select">Выпадающий список</Option>
            <Option value="color">Цвет</Option>
          </Select>
        </div>

        <div className="admin-category-config__form-group">
          <label>
            <input
              type="checkbox"
              checked={formData.isRequired}
              onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
            />
            {' '}Обязательный вариант
          </label>
        </div>

        <div className="admin-category-config__form-group">
          <label>Порядок отображения</label>
          <Input
            type="number"
            value={formData.displayOrder}
            onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
            min={0}
          />
        </div>

        <div className="admin-category-config__form-group">
          <label>Единица измерения (unit)</label>
          <Input
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="EU, US, ГБ, МБ и т.д."
          />
          <small>Опционально. Будет отображаться после значения (например: "42 EU")</small>
        </div>

        <div className="admin-category-config__form-group">
          <label>Доступные значения</label>
          <p style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
            Список значений для этого варианта. Ключи (size-38, color-black и т.д.) генерируются автоматически. При создании товара можно будет выбрать, какие из этих значений доступны.
          </p>
          <button
            type="button"
            onClick={addOptionValue}
            className="admin-category-config__add-button"
            style={{ marginBottom: 8 }}
          >
            + Добавить значение
          </button>
                  {formData.optionValues.length === 0 ? (
                    <p className="admin-category-config__empty" style={{ marginTop: 4 }}>Значения не добавлены</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {formData.optionValues.map((opt, index) => {
                        const showColorPicker = formData.key === 'color' || formData.type === 'color';
                        return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Input
                            value={opt.value}
                            onChange={(e) => updateOptionValue(index, 'value', e.target.value)}
                            placeholder={showColorPicker ? 'Черный, Красный...' : '38, 39, 40...'}
                            style={{ flex: '1 1 120px', minWidth: 100 }}
                          />
                          {showColorPicker && (
                            <>
                              <input
                                type="color"
                                key={`color-${index}`}
                                defaultValue={opt.colorCode || '#000000'}
                                onChange={(e) => handleColorChange(index, e.target.value)}
                                title="Цвет"
                                style={{ width: 36, height: 32, padding: 0, border: '1px solid #d9d9d9', borderRadius: 4 }}
                              />
                              <span style={{ fontSize: 12, color: '#888' }}>{opt.colorCode || ''}</span>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => removeOptionValue(index)}
                            style={{ padding: '4px 8px', fontSize: 12 }}
                          >
                            Удалить
                          </button>
                        </div>
                      ); })}
                    </div>
                  )}
        </div>
      </div>
    </Modal>
  );
};

export default CategoryConfig;

