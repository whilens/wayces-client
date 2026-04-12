import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FloatButton, Drawer, Input, Button, Spin, Typography, Empty } from 'antd';
import { Link, useLocation, useMatch, useSearchParams } from 'react-router-dom';
import { chatConsultAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';
import { getImageUrl } from '../../utils/imageUtils';
import './ChatConsultantWidget.css';

const { Text, Paragraph } = Typography;

/** Путь в карточку товара с предвыбором комплектации (если бэкенд передал linkCombinationId / linkCombinationKey) */
function productDetailPath(p) {
  const id = p.id;
  if (p.linkCombinationId != null && String(p.linkCombinationId).trim() !== '') {
    return `/products/${id}?combinationId=${encodeURIComponent(String(p.linkCombinationId))}`;
  }
  if (p.linkCombinationKey) {
    return `/products/${id}?combination=${encodeURIComponent(p.linkCombinationKey)}`;
  }
  return `/products/${id}`;
}

function combinationDetailPath(productId, c) {
  const n = c.id != null ? Number(c.id) : NaN;
  if (Number.isFinite(n) && n > 0) {
    return `/products/${productId}?combinationId=${encodeURIComponent(String(n))}`;
  }
  if (c.combinationKey) {
    return `/products/${productId}?combination=${encodeURIComponent(c.combinationKey)}`;
  }
  return `/products/${productId}`;
}

const ChatConsultantWidget = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const matchProduct = useMatch('/products/:id');

  const productId =
    matchProduct?.params?.id && /^\d+$/.test(matchProduct.params.id)
      ? matchProduct.params.id
      : undefined;

  const categoryIdRaw = searchParams.get('categoryId');
  const categoryId =
    categoryIdRaw && /^\d+$/.test(categoryIdRaw) ? categoryIdRaw : undefined;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const listEndRef = useRef(null);

  const scrollToBottom = () => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const payload = {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
      };
      if (productId) payload.productId = Number(productId);
      if (categoryId) payload.categoryId = Number(categoryId);

      const { data } = await chatConsultAPI.consult(payload);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          products: data.products,
          model: data.model,
        },
      ]);
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.message ||
        'Не удалось получить ответ. Попробуйте позже.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: String(msg), isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, productId, categoryId]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <FloatButton
        icon={<span aria-hidden>💬</span>}
        type="primary"
        tooltip="Консультант магазина"
        onClick={() => setOpen(true)}
        className="chat-consultant-widget__fab"
      />
      <Drawer
        title="Консультант"
        placement="right"
        width={Math.min(420, typeof window !== 'undefined' ? window.innerWidth - 16 : 420)}
        onClose={() => setOpen(false)}
        open={open}
        destroyOnClose={false}
        className="chat-consultant-widget__drawer"
      >
        <div className="chat-consultant-widget__hint">
          {productId ? (
            <Text type="secondary">Контекст: карточка товара #{productId}</Text>
          ) : categoryId ? (
            <Text type="secondary">Контекст: категория (фильтр каталога)</Text>
          ) : (
            <Text type="secondary">
              Напишите, что ищете (название или тема) — подберём товары из каталога.
            </Text>
          )}
        </div>

        <div className="chat-consultant-widget__messages">
          {messages.length === 0 && !loading && (
            <Empty description="Задайте вопрос о товарах" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`chat-consultant-widget__bubble chat-consultant-widget__bubble--${m.role}`}
            >
              <Paragraph
                className={
                  m.isError ? 'chat-consultant-widget__text chat-consultant-widget__text--error' : 'chat-consultant-widget__text'
                }
              >
                {m.content}
              </Paragraph>
              {m.role === 'assistant' && m.products?.length > 0 && (
                <ul className="chat-consultant-widget__products">
                  {m.products.map((p) => {
                    const thumb = p.defaultImage ? getImageUrl(p.defaultImage) : '';
                    const toProduct = productDetailPath(p);
                    return (
                      <li key={p.id}>
                        {thumb ? (
                          <Link
                            to={toProduct}
                            onClick={() => setOpen(false)}
                            className="chat-consultant-widget__product-thumb-wrap"
                          >
                            <img
                              src={thumb}
                              alt=""
                              className="chat-consultant-widget__product-thumb"
                            />
                          </Link>
                        ) : null}
                        <div className="chat-consultant-widget__product-line">
                          <Link
                            to={toProduct}
                            onClick={() => setOpen(false)}
                          >
                            {p.name}
                          </Link>
                          <span className="chat-consultant-widget__price">
                            {' '}
                            · {formatPrice(p.basePrice)}
                          </span>
                        </div>
                        {p.combinations?.length > 0 && (
                          <ul className="chat-consultant-widget__combinations">
                            {p.combinations.map((c) => (
                              <li key={`${p.id}-${c.id ?? c.combinationKey}`}>
                                <Link
                                  to={combinationDetailPath(p.id, c)}
                                  onClick={() => setOpen(false)}
                                  className="chat-consultant-widget__combination-link"
                                >
                                  {c.label || c.combinationKey || 'Комплектация'}
                                </Link>
                                <span className="chat-consultant-widget__combination-meta">
                                  {c.price != null && !Number.isNaN(Number(c.price))
                                    ? ` · ${formatPrice(Number(c.price))}`
                                    : ''}
                                  {typeof c.stockQuantity === 'number'
                                    ? ` · ост. ${c.stockQuantity}`
                                    : ''}
                                  {c.sku ? ` · ${c.sku}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-consultant-widget__loading">
              <Spin size="small" /> <Text type="secondary">Ответ…</Text>
            </div>
          )}
          <div ref={listEndRef} />
        </div>

        <div className="chat-consultant-widget__input-row">
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Сообщение…"
            autoSize={{ minRows: 2, maxRows: 6 }}
            disabled={loading}
          />
          <Button
            type="primary"
            onClick={send}
            loading={loading}
            disabled={!input.trim()}
            className="chat-consultant-widget__send"
          >
            Отправить
          </Button>
        </div>
      </Drawer>
    </>
  );
};

export default ChatConsultantWidget;
