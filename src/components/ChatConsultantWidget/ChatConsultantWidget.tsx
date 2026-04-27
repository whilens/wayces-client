import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FloatButton, Drawer, Input, Button, Spin, Typography, Empty } from 'antd';
import { Link, useLocation, useMatch, useSearchParams } from 'react-router-dom';
import { chatConsultAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';
import { getImageUrl } from '../../utils/imageUtils';
import './ChatConsultantWidget.css';

const { Text, Paragraph } = Typography;
const CHAT_STORAGE_PREFIX = 'chat_consult_history_v1';
const CHAT_SESSION_PREFIX = 'chat_consult_session_v1';
const MAX_LOCAL_MESSAGES = 50;

type ChatCombination = {
  id?: number | string;
  combinationKey?: string | null;
  label?: string;
  price?: number | null;
  stockQuantity?: number;
  sku?: string | null;
};

type ChatProduct = {
  id: number;
  name: string;
  basePrice: number;
  defaultImage?: string | null;
  linkCombinationId?: number | string | null;
  linkCombinationKey?: string | null;
  combinations?: ChatCombination[];
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  products?: ChatProduct[];
  model?: string;
};

type ConsultPayload = {
  messages: { role: 'user' | 'assistant'; content: string }[];
  clientSessionId?: string;
  productId?: number;
  categoryId?: number;
};

/** Путь в карточку товара с предвыбором комплектации (если бэкенд передал linkCombinationId / linkCombinationKey) */
function productDetailPath(p: ChatProduct) {
  const id = p.id;
  if (p.linkCombinationId != null && String(p.linkCombinationId).trim() !== '') {
    return `/products/${id}?combinationId=${encodeURIComponent(String(p.linkCombinationId))}`;
  }
  if (p.linkCombinationKey) {
    return `/products/${id}?combination=${encodeURIComponent(p.linkCombinationKey)}`;
  }
  return `/products/${id}`;
}

function combinationDetailPath(productId: number, c: ChatCombination) {
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState('');
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const contextKey = productId ? `p:${productId}` : categoryId ? `c:${categoryId}` : 'global';
  const storageKey = `${CHAT_STORAGE_PREFIX}:${contextKey}`;
  const sessionStorageKey = `${CHAT_SESSION_PREFIX}:${contextKey}`;

  const scrollToBottom = () => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, open]);

  useEffect(() => {
    let storedSession = localStorage.getItem(sessionStorageKey);
    if (!storedSession) {
      storedSession =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(sessionStorageKey, storedSession);
    }
    setSessionId(storedSession);

    const raw = localStorage.getItem(storageKey);
    let localMessages: ChatMessage[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) localMessages = parsed as ChatMessage[];
      } catch {
        localMessages = [];
      }
    }
    setMessages(localMessages);

    let cancelled = false;
    chatConsultAPI
      .history(storedSession)
      .then(({ data }) => {
        if (cancelled) return;
        const serverMessages = Array.isArray(data?.messages) ? (data.messages as ChatMessage[]) : [];
        if (localMessages.length === 0 && serverMessages.length > 0) {
          setMessages(serverMessages);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [storageKey, sessionStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_LOCAL_MESSAGES)));
    } catch {
      // ignore localStorage quota errors
    }
  }, [messages, storageKey]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextMessages: ChatMessage[] = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const payload: ConsultPayload = {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        clientSessionId: sessionId || undefined,
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
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Не удалось получить ответ. Попробуйте позже.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: String(msg), isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, productId, categoryId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
              {m.role === 'assistant' && Array.isArray(m.products) && m.products.length > 0 && (
                <ul className="chat-consultant-widget__products">
                  {m.products.map((p: ChatProduct) => {
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
                        {Array.isArray(p.combinations) && p.combinations.length > 0 && (
                          <ul className="chat-consultant-widget__combinations">
                            {p.combinations.map((c: ChatCombination) => (
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
