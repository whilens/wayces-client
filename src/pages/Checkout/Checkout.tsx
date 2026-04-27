import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import {
  selectCartItems,
  selectCartTotalPrice,
} from '../../store/selectors/cartSelectors';
import { clearCart } from '../../store/slices/cartSlice';
import { openAuthModal, sendCode, setPhone } from '../../store/slices/userSlice';
import { ordersAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';
import { ROUTES } from '../../utils/constants';
import PhoneInput from '../../components/PhoneInput/PhoneInput';
import './Checkout.css';

type CheckoutForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  comment: string;
};
type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;
type CartItem = {
  id: number;
  itemKey?: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variants?: Record<string, string>;
  variantString?: string;
};
type UserInfo = { id?: number; firstName?: string; lastName?: string; phone?: string; email?: string } | null;
type UserState = { isAuthenticated: boolean; user: UserInfo; authModal: { isOpen: boolean } };
type ApiErr = { response?: { data?: { message?: string } } };

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems) as CartItem[];
  const totalPrice = useAppSelector(selectCartTotalPrice);
  const { isAuthenticated, user, authModal: globalAuthModal } = useAppSelector(
    (state) => state.user as UserState
  );

  const [formData, setFormData] = useState<CheckoutForm>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    street: '',
    house: '',
    apartment: '',
    comment: '',
  });

  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasAuthModalOpen, setWasAuthModalOpen] = useState(false);

  const formattedTotalPrice = useMemo(() => formatPrice(totalPrice), [totalPrice]);

  // Валидация телефона РФ (ожидаем только цифры)
  const validatePhone = (phone: string) => {
    // Проверяем, что это 11 цифр, начинающихся с 7
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 11 && cleanPhone[0] === '7';
  };

  // Валидация email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Валидация формы
  const validateForm = () => {
    const newErrors: CheckoutErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Имя обязательно для заполнения';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Фамилия обязательна для заполнения';
    }

    // Для отладки
    console.log('🔍 Валидация телефона:', {
      'formData.phone': formData.phone,
      'typeof': typeof formData.phone,
      'length': formData.phone?.length,
      'trim()': formData.phone?.trim(),
      'trim().length': formData.phone?.trim()?.length,
    });
    
    if (!formData.phone || !formData.phone.trim()) {
      console.log('❌ Телефон пустой');
      newErrors.phone = 'Телефон обязателен для заполнения';
    } else if (!validatePhone(formData.phone)) {
      console.log('❌ Телефон невалидный');
      newErrors.phone = 'Введите корректный номер телефона РФ';
    } else {
      console.log('✅ Телефон валидный');
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен для заполнения';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Введите корректный email';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Город обязателен для заполнения';
    }

    if (!formData.street.trim()) {
      newErrors.street = 'Улица обязательна для заполнения';
    }

    if (!formData.house.trim()) {
      newErrors.house = 'Дом обязателен для заполнения';
    }

    if (!formData.apartment.trim()) {
      newErrors.apartment = 'Квартира обязательна для заполнения';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработка изменения полей
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const field = name as keyof CheckoutForm;
    
    // Для отладки - логируем только телефон
    if (name === 'phone') {
      console.log('📝 handleChange phone:', { name, value, 'typeof value': typeof value });
    }
    
    setFormData((prev) => {
      const newData = {
        ...prev,
        [field]: value,
      };
      
      // Для отладки - логируем только телефон
      if (name === 'phone') {
        console.log('📦 formData после обновления:', { phone: newData.phone, 'typeof': typeof newData.phone });
      }
      
      return newData;
    });
    
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handlePhoneChange = (event: { target: { name?: string; value: string } }) => {
    handleChange({
      target: {
        name: event.target.name || 'phone',
        value: event.target.value,
      },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  // Отслеживание открытия модального окна авторизации
  useEffect(() => {
    if (globalAuthModal.isOpen) {
      setWasAuthModalOpen(true);
    }
  }, [globalAuthModal.isOpen]);

  // Сброс isSubmitting, если модальное окно закрыто без авторизации
  useEffect(() => {
    if (!globalAuthModal.isOpen && isSubmitting && !isAuthenticated) {
      setIsSubmitting(false);
      setWasAuthModalOpen(false);
    }
  }, [globalAuthModal.isOpen, isSubmitting, isAuthenticated]);

  // Повторная отправка заказа после авторизации
  useEffect(() => {
    // Отправляем заказ только если:
    // 1. Пользователь авторизован
    // 2. Заказ в процессе отправки
    // 3. Модальное окно было открыто (т.е. пользователь только что авторизовался)
    // 4. Модальное окно закрыто (авторизация завершена)
    if (isAuthenticated && isSubmitting && wasAuthModalOpen && !globalAuthModal.isOpen) {
      // После успешной авторизации автоматически отправляем заказ
      const submitOrder = async () => {
        if (!validateForm()) {
          setIsSubmitting(false);
          return;
        }

        try {
          // Нормализуем телефон перед отправкой (убираем все нецифры)
          const normalizedPhone = formData.phone.replace(/\D/g, '');
          
          const orderData = {
            ...formData,
            phone: normalizedPhone, // Отправляем нормализованный телефон
            items: items.map((item: CartItem) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              image: item.image,
              quantity: item.quantity,
              variants: item.variants,
              variantString: item.variantString,
            })),
            totalPrice,
            userId: user?.id || null,
          };

          await ordersAPI.create(orderData);

          dispatch(clearCart());

          notification.success({
            message: 'Заказ оформлен',
            description: 'Ваш заказ успешно отправлен. Мы свяжемся с вами в ближайшее время.',
            placement: 'topRight',
            duration: 4,
          });

          setTimeout(() => {
            navigate(ROUTES.HOME);
          }, 1500);
        } catch (error: unknown) {
          console.error('Ошибка оформления заказа:', error);
          notification.error({
            message: 'Ошибка',
            description:
              ((error as ApiErr).response?.data?.message as string) ||
              'Произошла ошибка при оформлении заказа. Попробуйте позже.',
            placement: 'topRight',
            duration: 5,
          });
        } finally {
          setIsSubmitting(false);
          setWasAuthModalOpen(false); // Сбрасываем флаг после отправки
        }
      };

      // Небольшая задержка, чтобы пользователь увидел успешную авторизацию
      const timer = setTimeout(() => {
        submitOrder();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isSubmitting, wasAuthModalOpen, globalAuthModal.isOpen, user, formData, items, totalPrice, dispatch, navigate]);

  // Заполнение формы данными пользователя, если авторизован
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        phone: user.phone || prev.phone,
        email: user.email || prev.email,
      }));
    }
  }, [isAuthenticated, user]);


  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (items.length === 0) {
      notification.error({
        message: 'Ошибка',
        description: 'Корзина пуста',
        placement: 'topRight',
      });
      return;
    }

    // Если пользователь не авторизован, но ввел телефон - показываем модалку авторизации
    if (!isAuthenticated) {
      // Убеждаемся, что phone всегда строка
      const phoneValue = String(formData.phone || '');
      const phoneDigits = phoneValue.replace(/\D/g, '');
      if (phoneDigits.length === 11 && phoneDigits[0] === '7') {
        // Устанавливаем флаг для автоматической отправки заказа после авторизации
        setIsSubmitting(true);
        // Открываем глобальное модальное окно авторизации
        dispatch(openAuthModal({ redirectTo: null }) as never);
        // Устанавливаем телефон в Redux state (важно для AuthModal)
        dispatch(setPhone(phoneDigits) as never);
        // Отправляем код
        const sendCodeThunk = sendCode as unknown as (phone: string) => unknown;
        dispatch(sendCodeThunk(phoneDigits) as never);
        notification.info({
          message: 'Требуется авторизация',
          description: 'Введите код из SMS для продолжения',
          placement: 'topRight',
        });
        return; // Не отправляем заказ, ждем авторизации
      }
    }

    setIsSubmitting(true);

    try {
      // Нормализуем телефон перед отправкой (убираем все нецифры)
      const normalizedPhone = formData.phone.replace(/\D/g, '');
      
      const orderData = {
        ...formData,
        phone: normalizedPhone, // Отправляем нормализованный телефон
        items: items.map((item: CartItem) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          variants: item.variants,
          variantString: item.variantString,
        })),
        totalPrice,
        userId: isAuthenticated && user ? user.id : null, // Добавляем userId, если авторизован
      };

      await ordersAPI.create(orderData);

      // Очищаем корзину
      dispatch(clearCart());

      // Показываем уведомление об успехе
      notification.success({
        message: 'Заказ оформлен',
        description: 'Ваш заказ успешно отправлен. Мы свяжемся с вами в ближайшее время.',
        placement: 'topRight',
        duration: 4,
      });

      // Редирект на главную
      setTimeout(() => {
        navigate(ROUTES.HOME);
      }, 1500);
    } catch (error: unknown) {
      console.error('Ошибка оформления заказа:', error);
      notification.error({
        message: 'Ошибка',
        description:
          ((error as ApiErr).response?.data?.message as string) ||
          'Произошла ошибка при оформлении заказа. Попробуйте позже.',
        placement: 'topRight',
        duration: 5,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Если корзина пуста, редиректим в корзину
  if (items.length === 0) {
    return (
      <div className="checkout checkout--empty">
        <div className="checkout__container">
          <h1 className="checkout__title">Корзина пуста</h1>
          <p className="checkout__empty-text">Добавьте товары в корзину для оформления заказа</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout">
      <div className="checkout__container">
        <h1 className="checkout__title">Оформление заказа</h1>
        <div className="checkout__content">
          <div className="checkout__form-wrapper">
            <form className="checkout__form" onSubmit={handleSubmit}>
              <div className="checkout__form-section">
                <h2 className="checkout__section-title">Контактная информация</h2>
                <div className="checkout__form-row">
                  <div className="checkout__form-group">
                    <label htmlFor="firstName" className="checkout__label">
                      Имя <span className="checkout__required">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handlePhoneChange}
                      className={`checkout__input ${errors.firstName ? 'checkout__input--error' : ''}`}
                      placeholder="Введите имя"
                    />
                    {errors.firstName && (
                      <span className="checkout__error">{errors.firstName}</span>
                    )}
                  </div>
                  <div className="checkout__form-group">
                    <label htmlFor="lastName" className="checkout__label">
                      Фамилия <span className="checkout__required">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`checkout__input ${errors.lastName ? 'checkout__input--error' : ''}`}
                      placeholder="Введите фамилию"
                    />
                    {errors.lastName && (
                      <span className="checkout__error">{errors.lastName}</span>
                    )}
                  </div>
                </div>
                <div className="checkout__form-row">
                  <div className="checkout__form-group">
                    <label htmlFor="phone" className="checkout__label">
                      Телефон <span className="checkout__required">*</span>
                    </label>
                    <PhoneInput
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="+7 (999) 123-45-67"
                      error={errors.phone}
                    />
                  </div>
                  <div className="checkout__form-group">
                    <label htmlFor="email" className="checkout__label">
                      Email <span className="checkout__required">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`checkout__input ${errors.email ? 'checkout__input--error' : ''}`}
                      placeholder="example@mail.com"
                    />
                    {errors.email && (
                      <span className="checkout__error">{errors.email}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="checkout__form-section">
                <h2 className="checkout__section-title">Адрес доставки</h2>
                <div className="checkout__form-group">
                  <label htmlFor="city" className="checkout__label">
                    Город <span className="checkout__required">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={`checkout__input ${errors.city ? 'checkout__input--error' : ''}`}
                    placeholder="Введите город"
                  />
                  {errors.city && (
                    <span className="checkout__error">{errors.city}</span>
                  )}
                </div>
                <div className="checkout__form-group">
                  <label htmlFor="street" className="checkout__label">
                    Улица <span className="checkout__required">*</span>
                  </label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    className={`checkout__input ${errors.street ? 'checkout__input--error' : ''}`}
                    placeholder="Введите улицу"
                  />
                  {errors.street && (
                    <span className="checkout__error">{errors.street}</span>
                  )}
                </div>
                <div className="checkout__form-row">
                  <div className="checkout__form-group">
                    <label htmlFor="house" className="checkout__label">
                      Дом <span className="checkout__required">*</span>
                    </label>
                    <input
                      type="text"
                      id="house"
                      name="house"
                      value={formData.house}
                      onChange={handleChange}
                      className={`checkout__input ${errors.house ? 'checkout__input--error' : ''}`}
                      placeholder="Введите номер дома"
                    />
                    {errors.house && (
                      <span className="checkout__error">{errors.house}</span>
                    )}
                  </div>
                  <div className="checkout__form-group">
                    <label htmlFor="apartment" className="checkout__label">
                      Квартира <span className="checkout__required">*</span>
                    </label>
                    <input
                      type="text"
                      id="apartment"
                      name="apartment"
                      value={formData.apartment}
                      onChange={handleChange}
                      className={`checkout__input ${errors.apartment ? 'checkout__input--error' : ''}`}
                      placeholder="Введите номер квартиры"
                    />
                    {errors.apartment && (
                      <span className="checkout__error">{errors.apartment}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="checkout__form-section">
                <h2 className="checkout__section-title">Комментарий к заказу</h2>
                <div className="checkout__form-group">
                  <textarea
                    id="comment"
                    name="comment"
                    value={formData.comment}
                    onChange={handleChange}
                    className="checkout__textarea"
                    placeholder="Дополнительная информация к заказу (необязательно)"
                    rows={4}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="checkout__submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Отправка...' : 'Оформить заказ'}
              </button>
            </form>
          </div>

          <div className="checkout__summary">
            <h2 className="checkout__summary-title">Ваш заказ</h2>
            <div className="checkout__summary-items">
              {items.map((item: CartItem) => (
                <div key={item.itemKey || item.id} className="checkout__summary-item">
                  <div className="checkout__summary-item-info">
                    <h3 className="checkout__summary-item-name">
                      {item.name}
                      {item.variantString && (
                        <span className="checkout__summary-item-variant">
                          {' '}
                          {item.variantString}
                        </span>
                      )}
                    </h3>
                    <p className="checkout__summary-item-quantity">
                      Количество: {item.quantity}
                    </p>
                  </div>
                  <div className="checkout__summary-item-price">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <div className="checkout__summary-total">
              <span className="checkout__summary-total-label">Итого:</span>
              <span className="checkout__summary-total-price">{formattedTotalPrice}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

