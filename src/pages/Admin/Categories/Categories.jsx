import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminCategoriesAPI } from '../../../services/api';
import { ROUTES } from '../../../utils/constants';
import { notification, Modal, Input, Select } from 'antd';
import './Categories.css';

const { Option } = Select;
const { TextArea } = Input;

const AdminCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminCategoriesAPI.getAll();
      setCategories(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки категорий');
      notification.error({
        message: 'Ошибка',
        description: err.response?.data?.error || 'Не удалось загрузить категории',
        placement: 'topRight',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigClick = (categoryId) => {
    navigate(ROUTES.ADMIN_CATEGORY_CONFIG.replace(':categoryId', categoryId));
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setIsCreateModalOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setIsEditModalOpen(true);
  };

  const handleDeleteCategory = async (id) => {
    Modal.confirm({
      title: 'Удалить категорию?',
      content: 'Это действие нельзя отменить. Все товары этой категории также будут затронуты.',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          // TODO: Добавить API для удаления категории
          notification.warning({
            message: 'Функция удаления',
            description: 'API для удаления категорий пока не реализовано',
            placement: 'topRight',
          });
        } catch (error) {
          notification.error({
            message: 'Ошибка',
            description: error.response?.data?.error || 'Не удалось удалить категорию',
            placement: 'topRight',
          });
        }
      },
    });
  };

  const handleSaveCategory = async (values) => {
    try {
      if (editingCategory) {
        await adminCategoriesAPI.update(editingCategory.id, values);
        notification.success({
          message: 'Категория обновлена',
          placement: 'topRight',
        });
        setIsEditModalOpen(false);
        setEditingCategory(null);
        fetchCategories();
      } else {
        await adminCategoriesAPI.create(values);
        notification.success({
          message: 'Категория создана',
          placement: 'topRight',
        });
        setIsCreateModalOpen(false);
        fetchCategories();
      }
    } catch (error) {
      notification.error({
        message: 'Ошибка',
        description: error.response?.data?.error || 'Не удалось сохранить категорию',
        placement: 'topRight',
      });
    }
  };

  const renderCategoryTree = (categories, parentId = null, level = 0) => {
    const filtered = categories.filter(cat => {
      if (parentId === null) {
        return !cat.parentId;
      }
      return cat.parentId === parentId;
    });

    if (filtered.length === 0) {
      return null;
    }

    return (
      <ul className={`admin-categories__tree admin-categories__tree--level-${level}`}>
        {filtered.map((category) => (
          <li key={category.id} className="admin-categories__tree-item">
            <div className="admin-categories__item">
              <div className="admin-categories__item-info">
                <div className="admin-categories__item-name">
                  {category.name}
                  {category.slug && (
                    <span className="admin-categories__item-slug">({category.slug})</span>
                  )}
                </div>
                {category.description && (
                  <div className="admin-categories__item-description">
                    {category.description}
                  </div>
                )}
              </div>
              <div className="admin-categories__item-actions">
                <button
                  className="admin-categories__edit-button"
                  onClick={() => handleEditCategory(category)}
                  title="Редактировать категорию"
                >
                  ✏️ Редактировать
                </button>
                <button
                  className="admin-categories__config-button"
                  onClick={() => handleConfigClick(category.id)}
                  title="Настроить характеристики и варианты"
                >
                  ⚙️ Настроить
                </button>
                <button
                  className="admin-categories__delete-button"
                  onClick={() => handleDeleteCategory(category.id)}
                  title="Удалить категорию"
                >
                  🗑️ Удалить
                </button>
              </div>
            </div>
            {renderCategoryTree(categories, category.id, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  if (isLoading) {
    return (
      <div className="admin-categories">
        <div className="admin-categories__container">
          <p>Загрузка категорий...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-categories">
        <div className="admin-categories__container">
          <p className="admin-categories__error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-categories">
      <div className="admin-categories__container">
        <div className="admin-categories__header">
          <button
            className="admin-categories__back-button"
            onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
          >
            ← Назад
          </button>
          <h1 className="admin-categories__title">Категории</h1>
          <button
            className="admin-categories__add-button"
            onClick={handleCreateCategory}
          >
            + Создать категорию
          </button>
        </div>

        <div className="admin-categories__content">
          {categories.length === 0 ? (
            <p className="admin-categories__empty">Категории не найдены</p>
          ) : (
            <div className="admin-categories__tree-container">
              {renderCategoryTree(categories)}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно для создания категории */}
      <CategoryModal
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onSave={handleSaveCategory}
        category={null}
        categories={categories}
      />

      {/* Модальное окно для редактирования категории */}
      <CategoryModal
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        category={editingCategory}
        categories={categories}
      />
    </div>
  );
};

// Модальное окно для создания/редактирования категории
const CategoryModal = ({ open, onCancel, onSave, category, categories }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: null,
    description: '',
    imageUrl: '',
    displayOrder: 0,
    skuCode: '',
    skuAutoGenerate: false,
    listCombinationsSeparately: false,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        parentId: category.parentId || null,
        description: category.description || '',
        imageUrl: category.imageUrl || '',
        displayOrder: category.displayOrder ?? 0,
        skuCode: category.skuCode != null ? String(category.skuCode) : '',
        skuAutoGenerate: category.skuAutoGenerate === true,
        listCombinationsSeparately: category.listCombinationsSeparately === true,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        parentId: null,
        description: '',
        imageUrl: '',
        displayOrder: 0,
        skuCode: '',
        skuAutoGenerate: false,
        listCombinationsSeparately: false,
      });
    }
  }, [category, open]);

  const handleSubmit = () => {
    if (!formData.name || !formData.slug) {
      notification.warning({
        message: 'Заполните все обязательные поля',
        placement: 'topRight',
      });
      return;
    }

    const skuCodeNum = formData.skuCode === '' ? null : parseInt(formData.skuCode, 10);
    if (formData.skuCode !== '' && (isNaN(skuCodeNum) || skuCodeNum < 1 || skuCodeNum > 99)) {
      notification.warning({
        message: 'Код SKU должен быть числом от 1 до 99',
        placement: 'topRight',
      });
      return;
    }

    // Автоматически генерируем slug из названия, если не указан
    const slug = formData.slug || formData.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    onSave({
      name: formData.name,
      slug: slug,
      parentId: formData.parentId || null,
      description: formData.description || null,
      imageUrl: formData.imageUrl || null,
      displayOrder: parseInt(formData.displayOrder) || 0,
      skuCode: formData.skuCode === '' ? null : skuCodeNum,
      skuAutoGenerate: formData.skuAutoGenerate,
      listCombinationsSeparately: formData.listCombinationsSeparately,
    });
  };

  // Фильтруем категории для выбора родителя (исключаем текущую и её дочерние)
  const availableParents = categories.filter(cat => {
    if (!category) return true; // При создании можно выбрать любую
    if (cat.id === category.id) return false; // Нельзя выбрать саму себя
    // TODO: Проверить, что это не дочерняя категория
    return true;
  });

  return (
    <Modal
      title={category ? 'Редактировать категорию' : 'Создать категорию'}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="Сохранить"
      cancelText="Отмена"
      width={600}
    >
      <div className="admin-categories__modal-form">
        <div className="admin-categories__form-group">
          <label>Название *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Электроника"
          />
        </div>

        <div className="admin-categories__form-group">
          <label>Slug *</label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="electronics"
            disabled={!!category}
          />
          <small>Латинские буквы, дефисы (например: electronics, sports-shoes). Будет сгенерирован автоматически, если не указан.</small>
        </div>

        <div className="admin-categories__form-group">
          <label>Родительская категория</label>
          <Select
            value={formData.parentId}
            onChange={(value) => setFormData({ ...formData, parentId: value || null })}
            style={{ width: '100%' }}
            allowClear
            placeholder="Без родителя (корневая категория)"
          >
            {availableParents.map((cat) => (
              <Option key={cat.id} value={cat.id}>
                {cat.name}
              </Option>
            ))}
          </Select>
        </div>

        <div className="admin-categories__form-group">
          <label>Описание</label>
          <TextArea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Описание категории"
            rows={3}
          />
        </div>

        <div className="admin-categories__form-group">
          <label>URL изображения</label>
          <Input
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="admin-categories__form-group">
          <label>Порядок отображения</label>
          <Input
            type="number"
            value={formData.displayOrder}
            onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
            min={0}
          />
        </div>

        <div className="admin-categories__form-group">
          <label>Код SKU (1–99)</label>
          <Input
            type="number"
            value={formData.skuCode}
            onChange={(e) => setFormData({ ...formData, skuCode: e.target.value })}
            placeholder="Пусто — без автогенерации"
            min={1}
            max={99}
          />
          <small>Цифровой код категории для артикулов. Используется вместе с счётчиком: SKU = 6 цифр (код + номер).</small>
        </div>

        <div className="admin-categories__form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={formData.skuAutoGenerate}
              onChange={(e) => setFormData({ ...formData, skuAutoGenerate: e.target.checked })}
            />
            Автогенерация SKU для комплектаций
          </label>
          <small>Если включено и указан код SKU, при создании комплектаций товаров этой категории артикул будет подставляться автоматически.</small>
        </div>

        <div className="admin-categories__form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={formData.listCombinationsSeparately}
              onChange={(e) => setFormData({ ...formData, listCombinationsSeparately: e.target.checked })}
            />
            В каталоге показывать каждую комплектацию отдельно
          </label>
          <small>Если выключено, в списке товаров будет одна карточка на товар (варианты выбираются на странице товара). Если включено — отдельная карточка на каждую комплектацию (размер/цвет и т.д.).</small>
        </div>
      </div>
    </Modal>
  );
};

export default AdminCategories;

