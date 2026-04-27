import React, { useState, useEffect } from 'react';
import './PhoneInput.css';

type PhoneChangeEvent = {
  target: {
    name?: string;
    value: string;
  };
};

type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'onBlur'
> & {
  value: string;
  onChange?: (event: PhoneChangeEvent) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  placeholder?: string;
  className?: string;
  error?: string;
};

const PhoneInput = ({ value, onChange, onBlur, placeholder, className, error, ...props }: PhoneInputProps) => {
  const [displayValue, setDisplayValue] = useState('');

  // Инициализация при изменении value извне
  useEffect(() => {
    if (value) {
      const formatted = formatPhone(value);
      setDisplayValue(formatted);
    } else {
      setDisplayValue('');
    }
  }, [value]);

  // Форматирование телефона
  const formatPhone = (inputValue: string) => {
    // Убираем все нецифры
    const numbers = inputValue.replace(/\D/g, '');
    
    // Если пусто - возвращаем пустую строку
    if (!numbers) return '';

    // Если начинается с 9, добавляем 7 в начало
    let normalizedNumbers = numbers;
    if (numbers[0] === '9') {
      normalizedNumbers = '7' + numbers;
    }
    // Если начинается с 8, заменяем на 7
    else if (numbers[0] === '8') {
      normalizedNumbers = '7' + numbers.slice(1);
    }
    // Если не начинается с 7, добавляем 7
    else if (numbers[0] !== '7' && numbers.length > 0) {
      normalizedNumbers = '7' + numbers;
    }

    // Ограничиваем до 11 цифр (7 + 10 цифр)
    normalizedNumbers = normalizedNumbers.slice(0, 11);

    // Форматируем по маске +7 (___) ___-__-__
    if (normalizedNumbers.length === 0) return '';
    if (normalizedNumbers.length === 1) return `+${normalizedNumbers}`;
    if (normalizedNumbers.length <= 4) {
      return `+${normalizedNumbers.slice(0, 1)} (${normalizedNumbers.slice(1)}`;
    }
    if (normalizedNumbers.length <= 7) {
      return `+${normalizedNumbers.slice(0, 1)} (${normalizedNumbers.slice(1, 4)}) ${normalizedNumbers.slice(4)}`;
    }
    if (normalizedNumbers.length <= 9) {
      return `+${normalizedNumbers.slice(0, 1)} (${normalizedNumbers.slice(1, 4)}) ${normalizedNumbers.slice(4, 7)}-${normalizedNumbers.slice(7)}`;
    }
    return `+${normalizedNumbers.slice(0, 1)} (${normalizedNumbers.slice(1, 4)}) ${normalizedNumbers.slice(4, 7)}-${normalizedNumbers.slice(7, 9)}-${normalizedNumbers.slice(9, 11)}`;
  };

  // Обработка изменения
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatPhone(inputValue);
    setDisplayValue(formatted);
    
    // Извлекаем только цифры для передачи в onChange
    const cleanValue = formatted.replace(/\D/g, '');
    
    console.log('📱 PhoneInput handleChange:', {
      'props.name': props.name,
      'e.target.name': e.target.name,
      'cleanValue': cleanValue,
      'cleanValue.length': cleanValue.length,
    });
    
    // Вызываем onChange с чистыми цифрами
    if (onChange) {
      // Важно: передаем name из props, а не из e.target
      const syntheticEvent: PhoneChangeEvent = {
        target: {
          name: props.name || e.currentTarget.name,
          value: cleanValue,
        },
      };
      console.log('📱 PhoneInput - вызываю onChange с:', syntheticEvent);
      onChange(syntheticEvent);
    }
  };

  // Обработка вставки
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const formatted = formatPhone(pasted);
    setDisplayValue(formatted);
    
    const cleanValue = formatted.replace(/\D/g, '');
    if (onChange) {
      const syntheticEvent: PhoneChangeEvent = {
        target: {
          name: props.name || e.currentTarget.name,
          value: cleanValue,
        },
      };
      onChange(syntheticEvent);
    }
  };

  // Извлекаем name из props, чтобы гарантированно передать его в input
  const { name, id, ...restProps } = props;
  
  return (
    <div className={`phone-input ${className || ''}`}>
      <input
        type="tel"
        id={id}
        name={name}
        value={displayValue}
        onChange={handleChange}
        onPaste={handlePaste}
        onBlur={onBlur}
        placeholder={placeholder || '+7 (___) ___-__-__'}
        className={`phone-input__field ${error ? 'phone-input__field--error' : ''}`}
        {...restProps}
      />
      {error && <span className="phone-input__error">{error}</span>}
    </div>
  );
};

export default PhoneInput;

