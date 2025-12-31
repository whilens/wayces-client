/**
 * Строит FormData из объекта данных и файлов
 * @param {Object} data - Объект с данными для отправки
 * @param {Object} fileFields - Объект с полями для файлов { fieldName: file | file[] }
 * @returns {FormData} Готовая FormData для отправки
 */
export const buildFormData = (data, fileFields = {}) => {
  const formData = new FormData();

  // Добавляем обычные поля
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      // Если это объект или массив (но не File), сериализуем в JSON
      if (typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (Array.isArray(value) && value.length > 0 && !(value[0] instanceof File)) {
        // Массивы не-файлов тоже сериализуем
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  });

  // Добавляем файлы
  Object.entries(fileFields).forEach(([key, files]) => {
    if (Array.isArray(files)) {
      files.forEach(file => {
        if (file && (file instanceof File || file.file)) {
          formData.append(key, file instanceof File ? file : file.file);
        }
      });
    } else if (files) {
      if (files instanceof File) {
        formData.append(key, files);
      } else if (files.file) {
        formData.append(key, files.file);
      }
    }
  });

  return formData;
};

