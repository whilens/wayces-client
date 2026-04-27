/**
 * Строит FormData из объекта данных и файлов
 * @param {Object} data - Объект с данными для отправки
 * @param {Object} fileFields - Объект с полями для файлов { fieldName: file | file[] }
 * @returns {FormData} Готовая FormData для отправки
 */
type Primitive = string | number | boolean;
type DataValue = Primitive | Primitive[] | Record<string, unknown> | File | null | undefined;
type DataRecord = Record<string, DataValue>;
type FileLike = File | { file: File } | null | undefined;
type FileFields = Record<string, FileLike | FileLike[]>;

export const buildFormData = (data: DataRecord, fileFields: FileFields = {}) => {
  const formData = new FormData();

  // Добавляем обычные поля
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      const firstArrayItem = Array.isArray(value) ? (value[0] as unknown) : null;
      // Если это объект или массив (но не File), сериализуем в JSON
      if (typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (
        Array.isArray(value) &&
        value.length > 0 &&
        !(typeof firstArrayItem === 'object' && firstArrayItem !== null && firstArrayItem instanceof File)
      ) {
        // Массивы не-файлов тоже сериализуем
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });

  // Добавляем файлы
  Object.entries(fileFields).forEach(([key, files]) => {
    if (Array.isArray(files)) {
      files.forEach((file) => {
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

