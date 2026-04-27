import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { selectCartTotalQuantity } from '../../store/selectors/cartSelectors';
import { selectAuthAdmin } from '../../store/selectors/authSelectors';
import { toggleTheme } from '../../store/slices/uiSlice';
import { ROUTES } from '../../utils/constants';
import { throttle } from '../../utils/throttle';
import SearchBar from '../SearchBar/SearchBar';
import './Header.css';

const Header = React.memo(() => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const dispatch = useAppDispatch();
  const totalQuantity = useAppSelector(selectCartTotalQuantity);
  const admin = useAppSelector(selectAuthAdmin);
  const { isAuthenticated } = useAppSelector((state) => state.user);
  const theme = useAppSelector((state) => state.ui.theme);
  const headerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Throttled scroll handler для оптимизации производительности
  const handleScroll = useCallback(
    throttle(() => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    }, 100),
    []
  );

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Анимация только при первой загрузке
  useEffect(() => {
    if (!hasAnimated && headerRef.current) {
      setHasAnimated(true);
      headerRef.current.classList.add('header--animated');
    }
  }, [hasAnimated]);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  // Закрытие меню при изменении маршрута
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Закрытие меню при клике вне его
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Проверяем, что клик не внутри меню и не на кнопке бургера
      if (
        isMenuOpen &&
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Блокируем скролл при открытом меню
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const headerClassName = useMemo(
    () => `header ${isScrolled ? 'header--scrolled' : ''} ${hasAnimated ? 'header--animated' : ''} ${isMenuOpen ? 'header--menu-open' : ''}`,
    [isScrolled, hasAnimated, isMenuOpen]
  );

  return (
    <header 
      ref={headerRef}
      className={headerClassName}
    >
      <div className="header__container">
        <button 
          ref={menuButtonRef}
          className={`header__menu-button ${isMenuOpen ? 'header__menu-button--active' : ''}`}
          onClick={toggleMenu}
          aria-label="Меню"
          aria-expanded={isMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <Link to={ROUTES.HOME} className="header__logo">
          <span className="header__logo-text">Wayces</span>
        </Link>
        
        <nav className="header__nav">
          <Link 
            to={ROUTES.HOME} 
            className={`header__nav-link ${isActive(ROUTES.HOME) ? 'header__nav-link--active' : ''}`}
          >
            Главная
          </Link>
          <Link 
            to={ROUTES.PRODUCTS} 
            className={`header__nav-link ${isActive(ROUTES.PRODUCTS) ? 'header__nav-link--active' : ''}`}
          >
            Товары
          </Link>
          {admin && (
            <Link 
              to={ROUTES.ADMIN_DASHBOARD} 
              className={`header__nav-link ${isActive(ROUTES.ADMIN_DASHBOARD) ? 'header__nav-link--active' : ''}`}
            >
              Дашборд
            </Link>
          )}
        </nav>

        {!admin && <SearchBar />}

        <div className="header__actions">
          <button 
            className="header__theme-toggle"
            onClick={() => dispatch(toggleTheme())}
            aria-label={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
          >
            {theme === 'light' ? (
              <svg className="header__theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="header__theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
          {!admin && (
            <>
              {isAuthenticated && (
                <Link 
                  to="/account" 
                  className={`header__nav-link ${isActive('/account') ? 'header__nav-link--active' : ''}`}
                >
                  Личный кабинет
                </Link>
              )}
              <Link to={ROUTES.CART} className="header__cart-button">
                <svg className="header__cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {totalQuantity > 0 && (
                  <span className="header__cart-badge">{totalQuantity}</span>
                )}
              </Link>
            </>
          )}
        </div>

        {/* Мобильное меню */}
        <div 
          ref={menuRef}
          className={`header__mobile-menu ${isMenuOpen ? 'header__mobile-menu--open' : ''}`}
          onClick={(e) => {
            // Закрываем меню при клике на overlay (фон), но не на само меню
            if (e.target === e.currentTarget) {
              setIsMenuOpen(false);
            }
          }}
        >
          <nav className="header__mobile-nav">
            <Link 
              to={ROUTES.HOME} 
              className={`header__mobile-nav-link ${isActive(ROUTES.HOME) ? 'header__mobile-nav-link--active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Главная
            </Link>
            <Link 
              to={ROUTES.PRODUCTS} 
              className={`header__mobile-nav-link ${isActive(ROUTES.PRODUCTS) ? 'header__mobile-nav-link--active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Товары
            </Link>
            {admin ? (
              <Link 
                to={ROUTES.ADMIN_DASHBOARD} 
                className={`header__mobile-nav-link ${isActive(ROUTES.ADMIN_DASHBOARD) ? 'header__mobile-nav-link--active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Дашборд
              </Link>
            ) : (
              <>
                {isAuthenticated && (
                  <Link 
                    to="/account" 
                    className={`header__mobile-nav-link ${isActive('/account') ? 'header__mobile-nav-link--active' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Личный кабинет
                  </Link>
                )}
                <Link 
                  to={ROUTES.CART} 
                  className={`header__mobile-nav-link ${isActive(ROUTES.CART) ? 'header__mobile-nav-link--active' : ''}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Корзина {totalQuantity > 0 && `(${totalQuantity})`}
                </Link>
                <button 
                  className="header__mobile-nav-link header__mobile-theme-toggle"
                  onClick={() => {
                    dispatch(toggleTheme());
                    setIsMenuOpen(false);
                  }}
                >
                  {theme === 'light' ? '🌙 Тёмная тема' : '☀️ Светлая тема'}
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;

