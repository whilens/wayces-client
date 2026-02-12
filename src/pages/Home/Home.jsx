import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProducts } from '../../store/slices/productsSlice';
import { selectProducts, selectProductsIsLoading } from '../../store/selectors/productsSelectors';
import ProductCard from '../../components/ProductCard/ProductCard';
import './Home.css';

const Home = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectProducts);
  const isLoading = useAppSelector(selectProductsIsLoading);

  // Загружаем первые 6 товаров для главной страницы
  useEffect(() => {
    dispatch(fetchProducts({ page: 1, limit: 6 }));
  }, [dispatch]);

  // Получаем рекомендуемые товары (первые 6)
  const featuredProducts = useMemo(() => {
    return items.slice(0, 6);
  }, [items]);

  return (
    <div className="home">
      <section className="home__hero">
        <div className="home__hero-content">
          <h1 className="home__hero-title">Добро пожаловать в Успех</h1>
          <p className="home__hero-subtitle">Лучшие товары по выгодным ценам</p>
          <Link to="/products" className="home__hero-button">
            Смотреть каталог
          </Link>
        </div>
      </section>

      <section className="home__featured">
        <div className="home__container">
          <h2 className="home__section-title">Рекомендуемые товары</h2>
          {isLoading ? (
            <div className="home__loading">
              <p>Загрузка товаров...</p>
            </div>
          ) : (
            <div className="home__products-grid">
              {featuredProducts.length > 0 ? (
                featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                <p className="home__empty">Товары не найдены</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;

