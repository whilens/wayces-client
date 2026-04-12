# Мок данные

## Описание

Файл `mockProducts.json` содержит 15 товаров для тестирования и разработки интернет-магазина.

## Структура данных

Каждый товар содержит:
- `id` - уникальный идентификатор
- `name` - название товара
- `price` - цена в рублях
- `image` - URL изображения
- `description` - описание товара
- `category` - категория (electronics, sports, books, clothing, home-garden)
- `rating` - рейтинг (от 0 до 5)
- `reviews` - количество отзывов

## Использование

Мок данные используются автоматически через утилиту `mockData.js`:

```javascript
import { getMockProducts, getMockProductById, getFeaturedProducts } from '../utils/mockData';
```

### Переключение между мок данными и API

В файле `.env` можно установить:
```
VITE_USE_MOCK_DATA=true   # использовать мок данные (по умолчанию)
VITE_USE_MOCK_DATA=false  # использовать реальный API
```

## Категории товаров

- `electronics` - Электроника (8 товаров)
- `sports` - Спорт (2 товара)
- `books` - Книги (1 товар)
- `clothing` - Одежда (1 товар)
- `home-garden` - Дом и сад (3 товара)

