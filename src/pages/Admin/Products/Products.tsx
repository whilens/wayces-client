import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminProductsAPI } from '../../../services/api';
import { ROUTES } from '../../../utils/constants';
import { formatPrice, calculateDiscountedPrice } from '../../../utils/helpers';
import { getImageUrl } from '../../../utils/imageUtils';
import { notification } from 'antd';
import './Products.css';

type AdminProduct = {
  id: number;
  name: string;
  defaultImage?: string;
  category?: { name?: string };
  basePrice: number;
  discountType?: 'percentage' | 'fixed' | null;
  discountValue?: number | null;
  isActive: boolean;
};
type PriceInfo = {
  hasDiscount: boolean;
  originalPrice: number;
  discountedPrice: number;
};

function getErrMsg(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
    return e.response?.data?.error || e.response?.data?.message || e.message || fallback;
  }
  return fallback;
}

const AdminProducts = () => {
  const calcDiscountedPrice = calculateDiscountedPrice as unknown as (
    basePrice: number,
    discountType: string | null | undefined,
    discountValue: number | null | undefined
  ) => PriceInfo;
  const navigate = useNavigate();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [page, search, categoryFilter, isActiveFilter]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = {
        page,
        limit: 20,
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        isActive: isActiveFilter || undefined,
      };
      const response = await adminProductsAPI.getAll(params);
      setProducts(response.data.products);
      setTotalPages(response.data.totalPages);
    } catch (err: unknown) {
      console.error('Ошибка загрузки товаров:', err);
      setError(getErrMsg(err, 'Ошибка загрузки товаров'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      return;
    }

    try {
      await adminProductsAPI.delete(id);
      notification.success({
        message: 'Товар удален',
        description: 'Товар успешно удален из базы данных',
        placement: 'topRight',
      });
      fetchProducts();
    } catch (err: unknown) {
      console.error('Ошибка удаления товара:', err);
      notification.error({
        message: 'Ошибка',
        description: getErrMsg(err, 'Не удалось удалить товар'),
        placement: 'topRight',
      });
    }
  };

  const handleSearch = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setPage(1);
      fetchProducts();
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const response = await adminProductsAPI.downloadImportTemplate();
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'products-import-template.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Ошибка скачивания шаблона CSV:', err);
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось скачать шаблон CSV',
        placement: 'topRight',
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleChooseCsv = () => {
    if (isImporting) return;
    fileInputRef.current?.click();
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      notification.error({
        message: 'Неверный формат',
        description: 'Выберите файл формата .csv',
        placement: 'topRight',
      });
      return;
    }

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', file);
      const response = await adminProductsAPI.importCsv(formData);
      const stats = response.data?.stats || {};
      notification.success({
        message: 'Импорт завершён',
        description: `Товаров: ${stats.products || 0}, вариантов: ${stats.variants || 0}, опций: ${stats.options || 0}, комплектаций: ${stats.combinations || 0}`,
        placement: 'topRight',
        duration: 6,
      });
      setPage(1);
      await fetchProducts();
    } catch (err: unknown) {
      console.error('Ошибка импорта CSV:', err);
      notification.error({
        message: 'Ошибка импорта',
        description:
          getErrMsg(err, 'Не удалось импортировать CSV'),
        placement: 'topRight',
        duration: 6,
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-products">
        <div className="admin-products__container">
          <p>Загрузка товаров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-products">
      <div className="admin-products__container">
        <div className="admin-products__header">
          <h1 className="admin-products__title">Товары</h1>
          <div className="admin-products__header-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="admin-products__hidden-file-input"
              onChange={handleImportCsv}
            />
            <button
              type="button"
              className="admin-products__template-button"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
            >
              {isDownloadingTemplate ? 'Скачивание...' : 'Скачать шаблон CSV'}
            </button>
            <button
              type="button"
              className="admin-products__import-button"
              onClick={handleChooseCsv}
              disabled={isImporting}
            >
              {isImporting ? 'Импорт...' : 'Импорт CSV'}
            </button>
            <Link to={ROUTES.ADMIN_PRODUCT_NEW} className="admin-products__add-button">
              + Добавить товар
            </Link>
          </div>
        </div>

        <div className="admin-products__filters">
          <form onSubmit={handleSearch} className="admin-products__search-form">
            <input
              type="text"
              className="admin-products__search-input"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button type="submit" className="admin-products__search-button">
              Найти
            </button>
          </form>

          <select
            className="admin-products__filter-select"
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Все товары</option>
            <option value="true">Активные</option>
            <option value="false">Неактивные</option>
          </select>
        </div>

        <div className="admin-products__table-wrapper">
          <table className="admin-products__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Изображение</th>
                <th>Название</th>
                <th>Категория</th>
                <th>Цена</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-products__empty">
                    Товары не найдены
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td>#{product.id}</td>
                    <td>
                      {product.defaultImage ? (
                        <img
                          src={getImageUrl(product.defaultImage)}
                          alt={product.name}
                          className="admin-products__image"
                        />
                      ) : (
                        <div className="admin-products__image-placeholder">Нет фото</div>
                      )}
                    </td>
                    <td>{product.name}</td>
                    <td>{product.category?.name || '-'}</td>
                    <td>
                      {(() => {
                        const priceInfo = calcDiscountedPrice(
                          product.basePrice,
                          product.discountType,
                          product.discountValue
                        );
                        if (priceInfo.hasDiscount) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ 
                                textDecoration: 'line-through', 
                                textDecorationThickness: '0.125rem',
                                textDecorationColor: '#000000',
                                color: '#a0aec0', 
                                fontSize: '0.875rem' 
                              }}>
                                {formatPrice(priceInfo.originalPrice)}
                              </span>
                              <span style={{ color: '#e53e3e', fontWeight: '600' }}>
                                {formatPrice(priceInfo.discountedPrice)}
                              </span>
                            </div>
                          );
                        }
                        return formatPrice(product.basePrice);
                      })()}
                    </td>
                    <td>
                      <span
                        className={`admin-products__status ${
                          product.isActive
                            ? 'admin-products__status--active'
                            : 'admin-products__status--inactive'
                        }`}
                      >
                        {product.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-products__actions">
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="admin-products__edit-button"
                        >
                          Редактировать
                        </Link>
                        <button
                          className="admin-products__delete-button"
                          onClick={() => handleDelete(product.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="admin-products__pagination">
            <button
              className="admin-products__pagination-button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Назад
            </button>
            <span className="admin-products__pagination-info">
              Страница {page} из {totalPages}
            </span>
            <button
              className="admin-products__pagination-button"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;

