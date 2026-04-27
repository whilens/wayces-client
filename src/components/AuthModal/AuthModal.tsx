import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  closeAuthModal,
  sendCode,
  verifyCode,
  registerUser,
  setPhone,
  clearError,
  openAuthModal,
} from '../../store/slices/userSlice';
import PhoneInput from '../PhoneInput/PhoneInput';
import { linkPushSubscription } from '../../utils/pushSubscriptionLinker';
import './AuthModal.css';

const AuthModal = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { authModal, isLoading, error, isAuthenticated } = useAppSelector((state) => state.user);
  const { isOpen, step, phone, registrationToken, redirectTo } = authModal;

  const [phoneInput, setPhoneInput] = useState('');
  const [codeInputs, setCodeInputs] = useState(['', '', '', '']);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const codeRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Закрытие по клику вне модалки
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Редирект после авторизации и привязка push-подписки
  useEffect(() => {
    if (isAuthenticated) {
      // Привязываем push-подписку к аккаунту (если есть)
      linkPushSubscription();
      
      if (redirectTo) {
        navigate(redirectTo);
      }
    }
  }, [isAuthenticated, redirectTo, navigate]);

  // Сброс формы при открытии
  useEffect(() => {
    if (isOpen) {
      setPhoneInput('');
      setCodeInputs(['', '', '', '']);
      setFirstName('');
      setLastName('');
    }
  }, [isOpen]);

  const handleClose = () => {
    dispatch(closeAuthModal());
  };

  const handlePhoneChange = (e: { target: { value: string } }) => {
    const cleanPhone = e.target.value; // PhoneInput уже возвращает только цифры
    setPhoneInput(cleanPhone);
  };

  const handleSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // phoneInput уже содержит только цифры
    if (phoneInput.length < 11) {
      return;
    }
    dispatch(setPhone(phoneInput));
    const sendCodeTyped = sendCode as unknown as (phoneValue: string) => unknown;
    dispatch(sendCodeTyped(phoneInput) as never);
  };

  // Обработка ввода кода
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCodeInputs = [...codeInputs];
    newCodeInputs[index] = value.slice(-1);
    setCodeInputs(newCodeInputs);

    // Автопереход к следующему полю
    if (value && index < 3) {
      codeRefs[index + 1].current?.focus();
    }

    // Автоотправка при заполнении
    if (newCodeInputs.every(c => c) && index === 3) {
      const code = newCodeInputs.join('');
      const verifyCodeTyped = verifyCode as unknown as (payload: { phone: string; code: string }) => unknown;
      dispatch(verifyCodeTyped({ phone, code }) as never);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeInputs[index] && index > 0) {
      codeRefs[index - 1].current?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setCodeInputs(pasted.split(''));
      codeRefs[3].current?.focus();
      const verifyCodeTyped = verifyCode as unknown as (payload: { phone: string; code: string }) => unknown;
      dispatch(verifyCodeTyped({ phone, code: pasted }) as never);
    }
  };

  const handleVerifyCode = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = codeInputs.join('');
    if (code.length === 4) {
      const verifyCodeTyped = verifyCode as unknown as (payload: { phone: string; code: string }) => unknown;
      dispatch(verifyCodeTyped({ phone, code }) as never);
    }
  };

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return;
    }
    const registerTyped = registerUser as unknown as (payload: {
      registrationToken: string | null;
      firstName: string;
      lastName: string;
    }) => unknown;
    dispatch(registerTyped({
      registrationToken,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    }) as never);
  };

  const handleBackToPhone = () => {
    dispatch(clearError());
    setCodeInputs(['', '', '', '']);
    dispatch(setPhone(''));
    // Возвращаемся к первому шагу через закрытие и открытие
    dispatch(closeAuthModal());
    setTimeout(() => {
      dispatch(openAuthModal({ redirectTo }) as never);
    }, 100);
  };

  // Форматирование телефона для отображения (phone содержит только цифры)
  const formatPhoneForDisplay = (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 11) return phoneNumber;
    return `+7 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 9)}-${phoneNumber.slice(9, 11)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal__overlay">
      <div className="auth-modal" ref={modalRef}>
        <button className="auth-modal__close" onClick={handleClose}>
          ×
        </button>

        {/* Шаг 1: Ввод телефона */}
        {step === 'phone' && (
          <form onSubmit={handleSendCode} className="auth-modal__form">
            <h2 className="auth-modal__title">Вход</h2>
            <p className="auth-modal__subtitle">
              Введите номер телефона для входа или регистрации
            </p>

            <div className="auth-modal__field">
              <PhoneInput
                value={phoneInput}
                onChange={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
                className="auth-modal__phone-input"
                autoFocus
                autoComplete="tel"
              />
            </div>

            {error && <p className="auth-modal__error">{error}</p>}

            <p className="auth-modal__agreement">
              Нажимая на кнопку "Продолжить", вы соглашаетесь с политикой конфиденциальности и пользовательским соглашением
            </p>

            <button
              type="submit"
              className="auth-modal__button"
              disabled={isLoading || phoneInput.length < 11}
            >
              {isLoading ? 'Отправка...' : 'Получить код'}
            </button>

            <p className="auth-modal__hint">
              Для тестирования используйте код: <strong>0000</strong>
            </p>
          </form>
        )}

        {/* Шаг 2: Ввод кода */}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="auth-modal__form">
            <h2 className="auth-modal__title">Код подтверждения</h2>
            <p className="auth-modal__subtitle">
              Введите код, отправленный на номер<br />
              <strong>{formatPhoneForDisplay(phone)}</strong>
            </p>

            <div className="auth-modal__code-inputs">
              {codeInputs.map((digit, index) => (
                <input
                  key={index}
                  ref={codeRefs[index]}
                  type="text"
                  inputMode="numeric"
                  className="auth-modal__code-input"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  onPaste={index === 0 ? handleCodePaste : undefined}
                  autoFocus={index === 0}
                  maxLength={1}
                />
              ))}
            </div>

            {error && <p className="auth-modal__error">{error}</p>}

            <p className="auth-modal__agreement">
              Нажимая на кнопку "Продолжить", вы соглашаетесь с политикой конфиденциальности и пользовательским соглашением
            </p>

            <button
              type="submit"
              className="auth-modal__button"
              disabled={isLoading || codeInputs.some(c => !c)}
            >
              {isLoading ? 'Проверка...' : 'Подтвердить'}
            </button>

            <button
              type="button"
              className="auth-modal__link"
              onClick={handleBackToPhone}
            >
              Изменить номер
            </button>
          </form>
        )}

        {/* Шаг 3: Регистрация */}
        {step === 'register' && (
          <form onSubmit={handleRegister} className="auth-modal__form">
            <h2 className="auth-modal__title">Регистрация</h2>
            <p className="auth-modal__subtitle">
              Заполните данные для завершения регистрации
            </p>

            <div className="auth-modal__field">
              <label className="auth-modal__label">Имя</label>
              <input
                type="text"
                className="auth-modal__input"
                placeholder="Введите имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="auth-modal__field">
              <label className="auth-modal__label">Фамилия</label>
              <input
                type="text"
                className="auth-modal__input"
                placeholder="Введите фамилию"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                minLength={2}
                maxLength={100}
              />
            </div>

            {error && <p className="auth-modal__error">{error}</p>}

            <p className="auth-modal__agreement">
              Нажимая на кнопку "Продолжить", вы соглашаетесь с политикой конфиденциальности и пользовательским соглашением
            </p>

            <button
              type="submit"
              className="auth-modal__button"
              disabled={isLoading || firstName.trim().length < 2 || lastName.trim().length < 2}
            >
              {isLoading ? 'Регистрация...' : 'Завершить регистрацию'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;

