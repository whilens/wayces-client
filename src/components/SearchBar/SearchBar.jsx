import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../../services/api';
import { debounce } from '../../utils/debounce';
import { getImageUrl } from '../../utils/imageUtils';
import { formatPrice, calculateDiscountedPrice } from '../../utils/helpers';
import './SearchBar.css';

const SearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestionsStyle, setSuggestionsStyle] = useState({});
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Debounced поиск подсказок
  const fetchSuggestions = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await searchAPI.getSuggestions(searchQuery);
        setSuggestions(response.data.suggestions || []);
        setIsOpen(response.data.suggestions?.length > 0);
      } catch (error) {
        console.error('Ошибка загрузки подсказок:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // Обработка изменения запроса
  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    fetchSuggestions(value);
  };

  // Обработка отправки формы
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setIsOpen(false);
    }
  };

  // Обработка выбора подсказки
  const handleSuggestionClick = (suggestion) => {
    navigate(suggestion.url);
    setQuery('');
    setIsOpen(false);
  };

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Закрытие при нажатии Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Вычисление позиции для результатов поиска в мобильной версии
  useEffect(() => {
    const updateSuggestionsPosition = () => {
      if (searchRef.current && window.innerWidth <= 768) {
        const rect = searchRef.current.getBoundingClientRect();
        setSuggestionsStyle({
          left: `${-rect.left}px`,
          width: '100vw',
        });
      } else {
        setSuggestionsStyle({});
      }
    };

    if (isOpen) {
      updateSuggestionsPosition();
      window.addEventListener('resize', updateSuggestionsPosition);
      window.addEventListener('scroll', updateSuggestionsPosition, true);
    }

    return () => {
      window.removeEventListener('resize', updateSuggestionsPosition);
      window.removeEventListener('scroll', updateSuggestionsPosition, true);
    };
  }, [isOpen]);

  return (
    <div className="search-bar" ref={searchRef}>
      <form className="search-bar__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-bar__input"
          placeholder="Поиск товаров..."
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
        />
        <button type="submit" className="search-bar__button" aria-label="Поиск">
          <svg
            className="search-bar__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </form>

      {/* Выпадающий список подсказок */}
      {isOpen && (query.length >= 2 || suggestions.length > 0) && (
        <div 
          className="search-bar__suggestions" 
          ref={suggestionsRef}
          style={suggestionsStyle}
        >
          {isLoading ? (
            <div className="search-bar__suggestion-item search-bar__suggestion-item--loading">
              Поиск...
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${suggestion.id}-${index}`}
                  className="search-bar__suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.type === 'product' ? (
                    <>
                      <img
                        src={suggestion.image ? getImageUrl(suggestion.image) : '/placeholder.png'}
                        alt={suggestion.name}
                        className="search-bar__suggestion-image"
                        onError={(e) => {
                          if (e.target.src !== '/placeholder.png') {
                            e.target.src = '/placeholder.png';
                          }
                        }}
                      />
                      <div className="search-bar__suggestion-content">
                        <div className="search-bar__suggestion-name">{suggestion.name}</div>
                        {suggestion.category && (
                          <div className="search-bar__suggestion-category">{suggestion.category}</div>
                        )}
                        <div className="search-bar__suggestion-price">
                          {(() => {
                            const priceInfo = calculateDiscountedPrice(
                              suggestion.price || 0,
                              suggestion.discountType || null,
                              suggestion.discountValue || null
                            );
                            if (priceInfo.hasDiscount) {
                              return (
                                <div className="search-bar__suggestion-price-container">
                                  <span className="search-bar__suggestion-price-original">
                                    {formatPrice(priceInfo.originalPrice)}
                                  </span>
                                  <span className="search-bar__suggestion-price-discounted">
                                    {formatPrice(priceInfo.discountedPrice)}
                                  </span>
                                </div>
                              );
                            }
                            return formatPrice(suggestion.price || 0);
                          })()}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="search-bar__suggestion-icon">📁</div>
                      <div className="search-bar__suggestion-content">
                        <div className="search-bar__suggestion-name">{suggestion.name}</div>
                        <div className="search-bar__suggestion-category">Категория</div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {query.trim() && (
                <div
                  className="search-bar__suggestion-item search-bar__suggestion-item--action"
                  onClick={handleSubmit}
                >
                  <div className="search-bar__suggestion-icon">🔍</div>
                  <div className="search-bar__suggestion-content">
                    <div className="search-bar__suggestion-name">
                      Искать "{query.trim()}"
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : query.length >= 2 ? (
            <div className="search-bar__suggestion-item search-bar__suggestion-item--empty">
              Ничего не найдено
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;

