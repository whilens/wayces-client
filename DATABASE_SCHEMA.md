# Схема базы данных для интернет-магазина

## Таблицы для товаров и вариантов

### 1. Таблица `products` (Товары)

Основная информация о товаре (общие характеристики модели).

```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  category_id INT,
  description TEXT,
  specifications JSON, -- Общие характеристики модели
  default_image VARCHAR(500),
  rating DECIMAL(3, 2) DEFAULT 0,
  reviews_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

**Пример данных:**
- `name`: "Смартфон iPhone 15 Pro Max"
- `base_price`: 129999
- `specifications`: `{"display": "6.7\"", "processor": "A17 Pro", ...}`
- `default_image`: URL основного изображения

### 2. Таблица `product_variants` (Типы вариантов товара)

Определяет какие типы вариантов есть у товара (цвет, размер, память и т.д.).

```sql
CREATE TABLE product_variants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  variant_key VARCHAR(50) NOT NULL, -- 'color', 'size', 'storage', 'memory', 'ram'
  variant_name VARCHAR(100) NOT NULL, -- 'Цвет', 'Размер', 'Память'
  variant_type ENUM('color', 'button', 'select') NOT NULL, -- Тип отображения
  display_order INT DEFAULT 0, -- Порядок отображения
  is_required BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_variant (product_id, variant_key)
);
```

**Пример данных:**
- `product_id`: 1
- `variant_key`: "color"
- `variant_name`: "Цвет"
- `variant_type`: "color"

### 3. Таблица `product_variant_options` (Варианты товара)

Конкретные значения вариантов (черный, размер 42, 256 ГБ и т.д.).

```sql
CREATE TABLE product_variant_options (
  id INT PRIMARY KEY AUTO_INCREMENT,
  variant_id INT NOT NULL,
  option_key VARCHAR(100) NOT NULL, -- 'color-black', 'size-42', 'storage-256'
  option_value VARCHAR(255) NOT NULL, -- 'Черный', '42', '256 ГБ'
  color_code VARCHAR(7), -- HEX код для цветов (#000000)
  price_modifier DECIMAL(10, 2) DEFAULT 0, -- Доплата за этот вариант
  images JSON, -- Массив URL изображений для этого варианта
  is_default BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  stock_quantity INT DEFAULT 0, -- Количество на складе
  display_order INT DEFAULT 0,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  UNIQUE KEY unique_option (variant_id, option_key)
);
```

**Пример данных:**
- `variant_id`: 1 (цвет)
- `option_key`: "color-black"
- `option_value`: "Черный титан"
- `color_code`: "#1C1C1E"
- `price_modifier`: 0
- `images`: `["url1", "url2"]`

### 4. Таблица `product_combinations` (Комбинации вариантов)

Все возможные комбинации вариантов для отображения в каталоге.

```sql
CREATE TABLE product_combinations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  combination_key VARCHAR(255) NOT NULL, -- 'color-black_storage-256'
  price DECIMAL(10, 2) NOT NULL, -- Итоговая цена с учетом всех модификаторов
  stock_quantity INT DEFAULT 0,
  sku VARCHAR(100) UNIQUE, -- Артикул товара
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_combination (product_id, combination_key)
);
```

**Пример данных:**
- `product_id`: 1
- `combination_key`: "color-natural_storage-256"
- `price`: 129999
- `sku`: "IPHONE15PM-256-NAT"

### 5. Таблица `product_combination_options` (Связь комбинаций с вариантами)

Связывает комбинации с конкретными вариантами.

```sql
CREATE TABLE product_combination_options (
  id INT PRIMARY KEY AUTO_INCREMENT,
  combination_id INT NOT NULL,
  option_id INT NOT NULL,
  FOREIGN KEY (combination_id) REFERENCES product_combinations(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES product_variant_options(id) ON DELETE CASCADE,
  UNIQUE KEY unique_combination_option (combination_id, option_id)
);
```

### 6. Таблица `product_images` (Изображения товаров)

Дополнительные изображения товаров.

```sql
CREATE TABLE product_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT,
  combination_id INT, -- NULL если изображение общее для всех вариантов
  option_id INT, -- NULL если изображение общее
  image_url VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (combination_id) REFERENCES product_combinations(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES product_variant_options(id) ON DELETE CASCADE
);
```

### 7. Таблица `categories` (Категории)

```sql
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id INT NULL,
  description TEXT,
  image_url VARCHAR(500),
  display_order INT DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);
```

## Структура JSON для API

### Получение товара с вариантами

```json
{
  "id": 1,
  "name": "Смартфон iPhone 15 Pro Max",
  "slug": "iphone-15-pro-max",
  "basePrice": 129999,
  "category": {
    "id": 1,
    "name": "Электроника",
    "slug": "electronics"
  },
  "description": "Описание товара...",
  "specifications": {
    "display": "6.7\"",
    "processor": "A17 Pro",
    "camera": "48+12+12 МП"
  },
  "defaultImage": "https://...",
  "rating": 4.9,
  "reviewsCount": 89,
  "variants": {
    "color": {
      "id": 1,
      "name": "Цвет",
      "type": "color",
      "displayOrder": 1,
      "options": [
        {
          "id": 1,
          "key": "color-natural",
          "value": "Натуральный титан",
          "colorCode": "#8B7355",
          "priceModifier": 0,
          "images": ["url1", "url2"],
          "isDefault": true,
          "isAvailable": true,
          "stockQuantity": 10
        }
      ]
    },
    "storage": {
      "id": 2,
      "name": "Память",
      "type": "button",
      "displayOrder": 2,
      "options": [
        {
          "id": 5,
          "key": "storage-256",
          "value": "256 ГБ",
          "priceModifier": 0,
          "isDefault": true,
          "isAvailable": true,
          "stockQuantity": 15
        }
      ]
    }
  },
  "combinations": [
    {
      "id": 1,
      "key": "color-natural_storage-256",
      "price": 129999,
      "sku": "IPHONE15PM-256-NAT",
      "stockQuantity": 10,
      "isActive": true,
      "options": [
        {"variantKey": "color", "optionKey": "color-natural"},
        {"variantKey": "storage", "optionKey": "storage-256"}
      ]
    }
  ]
}
```

### Получение списка товаров (все комбинации)

```json
{
  "products": [
    {
      "id": 1,
      "productId": 1,
      "name": "Смартфон iPhone 15 Pro Max",
      "fullName": "Смартфон iPhone 15 Pro Max, 256 ГБ, Натуральный титан",
      "price": 129999,
      "image": "https://...",
      "category": "electronics",
      "combinationKey": "color-natural_storage-256",
      "variants": {
        "color": "color-natural",
        "storage": "storage-256"
      },
      "stockQuantity": 10,
      "isAvailable": true
    },
    {
      "id": 2,
      "productId": 1,
      "name": "Смартфон iPhone 15 Pro Max",
      "fullName": "Смартфон iPhone 15 Pro Max, 512 ГБ, Натуральный титан",
      "price": 149999,
      "image": "https://...",
      "category": "electronics",
      "combinationKey": "color-natural_storage-512",
      "variants": {
        "color": "color-natural",
        "storage": "storage-512"
      },
      "stockQuantity": 5,
      "isAvailable": true
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 12
}
```

## Процесс добавления товара через админ панель

### Шаг 1: Создание базового товара

```json
POST /api/admin/products
{
  "name": "Смартфон iPhone 15 Pro Max",
  "slug": "iphone-15-pro-max",
  "basePrice": 129999,
  "categoryId": 1,
  "description": "Описание...",
  "specifications": {
    "display": "6.7\"",
    "processor": "A17 Pro"
  },
  "defaultImage": "https://..."
}
```

### Шаг 2: Добавление типов вариантов

```json
POST /api/admin/products/1/variants
[
  {
    "variantKey": "color",
    "variantName": "Цвет",
    "variantType": "color",
    "displayOrder": 1
  },
  {
    "variantKey": "storage",
    "variantName": "Память",
    "variantType": "button",
    "displayOrder": 2
  }
]
```

### Шаг 3: Добавление значений вариантов

```json
POST /api/admin/products/1/variants/color/options
[
  {
    "optionKey": "color-natural",
    "optionValue": "Натуральный титан",
    "colorCode": "#8B7355",
    "priceModifier": 0,
    "images": ["url1", "url2"],
    "isDefault": true,
    "stockQuantity": 10
  },
  {
    "optionKey": "color-black",
    "optionValue": "Черный титан",
    "colorCode": "#1C1C1E",
    "priceModifier": 0,
    "images": ["url3", "url4"],
    "isDefault": false,
    "stockQuantity": 8
  }
]
```

### Шаг 4: Автоматическая генерация комбинаций

```json
POST /api/admin/products/1/generate-combinations
```

Система автоматически:
1. Генерирует все возможные комбинации вариантов
2. Вычисляет итоговую цену для каждой комбинации
3. Создает записи в `product_combinations`
4. Связывает комбинации с вариантами

**Результат:** Все комбинации доступны в каталоге как отдельные товары.

## API Endpoints для админ панели

```
POST   /api/admin/products                    - Создать товар
PUT    /api/admin/products/:id                - Обновить товар
DELETE /api/admin/products/:id                - Удалить товар

POST   /api/admin/products/:id/variants       - Добавить типы вариантов
PUT    /api/admin/products/:id/variants/:vid   - Обновить тип варианта
DELETE /api/admin/products/:id/variants/:vid - Удалить тип варианта

POST   /api/admin/variants/:vid/options       - Добавить значения вариантов
PUT    /api/admin/options/:oid                - Обновить значение варианта
DELETE /api/admin/options/:oid                - Удалить значение варианта

POST   /api/admin/products/:id/generate-combinations - Генерировать комбинации
PUT    /api/admin/combinations/:id             - Обновить комбинацию (цена, склад)
```

## Логика работы

1. **В каталоге** отображаются все комбинации из `product_combinations`
2. **При клике** на товар открывается страница с `product_id`, но с предустановленными вариантами из комбинации
3. **В корзине** сохраняется `combination_id` или `combination_key` для идентификации
4. **При заказе** используется `combination_id` для списания со склада

## Индексы для оптимизации

```sql
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_combinations_product ON product_combinations(product_id);
CREATE INDEX idx_combinations_active ON product_combinations(is_active);
CREATE INDEX idx_combinations_price ON product_combinations(price);
CREATE INDEX idx_variant_options_variant ON product_variant_options(variant_id);
```

