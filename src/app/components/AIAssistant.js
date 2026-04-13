'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { aiAPI } from '@/services/api';

// ─── Simple markdown-like renderer (bold, newlines) ───────────────────────────
function RenderText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </span>
  );
}

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--primary)',
            animation: 'dot-bounce 1s infinite',
            animationDelay: `${delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AIAssistantWidget() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState('checking'); // 'ok' | 'disabled' | 'checking' | 'error'
  const [messages, setMessages] = useState([]);
  // history for multi-turn: [{role: 'user'|'model', text: '...'}]
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorRetry, setErrorRetry] = useState(null); 
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const t = {
    greeting: isAr
      ? 'مرحباً! أنا المساعد الذكي لـ FieldTrack. كيف يمكنني مساعدتك اليوم؟'
      : 'Hi! I am the FieldTrack AI Assistant. How can I help you today?',
    online: isAr ? 'متصل' : 'Online',
    offline: isAr ? 'غير متاح' : 'Unavailable',
    checking: isAr ? 'جاري الفحص...' : 'Checking...',
    placeholder: isAr ? 'اسألني أي شيء...' : 'Ask me anything...',
    suggested: isAr ? 'أسئلة مقترحة:' : 'Suggested questions:',
    clearChat: isAr ? 'مسح المحادثة' : 'Clear chat',
    retry: isAr ? 'إعادة المحاولة' : 'Retry',
    disabled: isAr
      ? '⚠️ خدمة الذكاء الاصطناعي غير مفعّلة حالياً. يرجى التواصل مع المسؤول.'
      : '⚠️ AI service is currently disabled. Please contact the administrator.',
    connError: isAr
      ? '⚠️ تعذّر الاتصال بالمساعد. يُرجى التحقق من الاتصال والمحاولة مرة أخرى.'
      : '⚠️ Could not reach the AI assistant. Please check your connection and try again.',
    timeout: isAr
      ? '⚠️ انتهت المهلة. يُرجى المحاولة مجدداً.'
      : '⚠️ Request timed out. Please try again.',
    quota: isAr
      ? '⚠️ تم استنفاد حصة الذكاء الاصطناعي مؤقتاً. يُرجى المحاولة بعد دقائق.'
      : '⚠️ AI quota temporarily exhausted. Please try again in a few minutes.',
  };


  const suggestions = isAr ? [
    'ما هي أدوار النظام؟',
    'ما مزايا المنصة؟',
    'كيف يمكنك مساعدتي؟',
    'ما هو FieldTrack؟',
    'ما هي ميزات الذكاء الاصطناعي؟',
  ] : [
    'What are the system roles?',
    'What are the platform features?',
    'How can you help me?',
    'What is FieldTrack?',
    'What are the AI features?',
  ];

  // ── Check AI health on mount ────────────────────────────────────────────────
  useEffect(() => {
    aiAPI.health()
      .then(res => {
        const s = res.data.status;
        setAiStatus(s === 'ok' || s === 'kb-only' ? 'ok' : 'disabled');
      })
      .catch(() => setAiStatus('ok')); // offline = use KB anyway, show as online
  }, []);

  // ── Set greeting once health is known ──────────────────────────────────────
  useEffect(() => {
    if (aiStatus === 'disabled') {
      setMessages([{ sender: 'ai', text: t.disabled, isError: true }]);
    } else if (aiStatus === 'ok' || aiStatus === 'error') {
      setMessages([{ sender: 'ai', text: t.greeting }]);
    }
  }, [aiStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to bottom on new messages ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // ── Focus input when chat opens ────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && aiStatus === 'ok') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, aiStatus]);

  // ── Clear chat ─────────────────────────────────────────────────────────────
  const handleClear = () => {
    setHistory([]);
    setMessages([{ sender: 'ai', text: t.greeting }]);
    setErrorRetry(null);
  };

  // ── Status dot color ───────────────────────────────────────────────────────
  const statusColor = {
    ok: 'var(--success, #22c55e)',
    disabled: 'var(--danger, #ef4444)',
    error: '#f59e0b',
    checking: '#94a3b8',
  }[aiStatus] || '#94a3b8';

  const statusLabel = {
    ok: t.online,
    disabled: t.offline,
    error: t.offline,
    checking: t.checking,
  }[aiStatus] || t.checking;

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const userMessage = textOverride || input.trim();
    if (!userMessage || isLoading) return;

    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    if (!textOverride) setInput('');
    setIsLoading(true);
    setErrorRetry(null);

    try {
      const res = await aiAPI.chat({
        message: userMessage,
        history,
        locale,
        context: { url: typeof window !== 'undefined' ? window.location.pathname : '' },
      });

      const reply = res.data.reply || '';
      const source = res.data.source || null; // 'kb' | 'ai' | 'cache' | 'fallback'

      // Update conversation history for multi-turn context
      setHistory(prev => [
        ...prev,
        { role: 'user', text: userMessage },
        { role: 'model', text: reply },
      ]);

      setMessages(prev => [...prev, { sender: 'ai', text: reply, source }]);
    } catch (error) {
      const status = error.response?.status;
      const serverMsg = error.response?.data?.message;

      let displayMsg;
      if (!error.response) {
        // Network error (server unreachable)
        displayMsg = t.connError;
      } else if (status === 429) {
        displayMsg = `⚠️ ${serverMsg || t.quota}`;
      } else if (status === 504) {
        displayMsg = t.timeout;
      } else if (status === 503) {
        displayMsg = `⚠️ ${serverMsg || t.connError}`;
        setAiStatus('error');
      } else {
        displayMsg = `⚠️ ${serverMsg || t.connError}`;
      }

      setMessages(prev => [...prev, { sender: 'ai', text: displayMsg, isError: true }]);
      // Allow retrying the last failed message
      setErrorRetry(userMessage);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, history, t]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <div
        id="ai-assistant-btn"
        onClick={() => setIsOpen(o => !o)}
        title={isAr ? 'المساعد الذكي' : 'AI Assistant'}
        style={{
          position: 'fixed',
          bottom: '2rem',
          [isAr ? 'left' : 'right']: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(99,102,241,0.4)',
          zIndex: 1000,
          color: '#fff',
          fontSize: '1.5rem',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(99,102,241,0.6)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(99,102,241,0.4)';
        }}
      >
        {isOpen ? '✕' : '✨'}
      </div>

      {/* Chat window */}
      {isOpen && (
        <div
          id="ai-assistant-window"
          className="glass fade-in"
          style={{
            position: 'fixed',
            bottom: '6rem',
            [isAr ? 'left' : 'right']: '2rem',
            width: '360px',
            height: '500px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            borderRadius: '1rem',
            direction: isAr ? 'rtl' : 'ltr',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="gradient-text">✨ FieldTrack AI</span>
              </h3>
              <span style={{ fontSize: '0.72rem', color: statusColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  display: 'inline-block', width: '6px', height: '6px',
                  borderRadius: '50%', background: statusColor
                }} />
                {statusLabel}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Clear chat button */}
              {history.length > 0 && (
                <button
                  onClick={handleClear}
                  title={t.clearChat}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '0.5rem',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  🗑 {t.clearChat}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                <div style={{
                  background: msg.sender === 'user'
                    ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
                    : msg.isError ? 'rgba(239,68,68,0.15)' : 'var(--bg-card2)',
                  border: msg.isError ? '1px solid rgba(239,68,68,0.3)' : 'none',
                  padding: '0.65rem 0.9rem',
                  borderRadius: msg.sender === 'user'
                    ? (isAr ? '1rem 1rem 1rem 0' : '1rem 1rem 0 1rem')
                    : '1rem 1rem 1rem 0',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  boxShadow: msg.sender === 'user' ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                }}>
                  <RenderText text={msg.text} />
                </div>
                {/* Source badge — shows whether answer came from KB or AI */}
                {msg.sender === 'ai' && !msg.isError && msg.source && (
                  <span style={{
                    fontSize: '0.65rem',
                    color: msg.source === 'ai' ? 'var(--success, #22c55e)' : 'var(--text-muted)',
                    marginTop: '3px',
                    display: 'block',
                    paddingLeft: '4px',
                  }}>
                    {msg.source === 'ai' ? '🤖 AI' : msg.source === 'kb' ? '📚 KB' : msg.source === 'cache' ? '⚡ cached' : ''}
                  </span>
                )}
              </div>
            ))}

            {/* Retry button on last error */}
            {errorRetry && !isLoading && (
              <button
                onClick={() => handleSend(null, errorRetry)}
                style={{
                  alignSelf: 'center',
                  background: 'rgba(99,102,241,0.15)',
                  color: 'var(--primary-light)',
                  border: '1px solid var(--primary)',
                  padding: '0.4rem 1rem',
                  borderRadius: '1.5rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                🔄 {t.retry}
              </button>
            )}

            {messages.length === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{t.suggested}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(null, s)}
                      disabled={isLoading}
                      style={{
                        background: 'rgba(99,102,241,0.08)',
                        color: 'var(--primary-light)',
                        border: '1px solid rgba(99,102,241,0.35)',
                        padding: '0.4rem 0.9rem',
                        borderRadius: '0.6rem',
                        fontSize: '0.8rem',
                        cursor: isLoading ? 'wait' : 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: isAr ? 'right' : 'left',
                        width: '100%',
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = 'rgba(99,102,241,0.25)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
                      }}
                    >
                      {isAr ? '◀ ' : '▶ '}{s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'var(--bg-card2)',
                padding: '0.6rem 1rem',
                borderRadius: '1rem 1rem 1rem 0',
              }}>
                <TypingDots />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '0.5rem',
              background: 'rgba(15, 23, 42, 0.95)',
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              id="ai-chat-input"
              type="text"
              className="form-input"
              placeholder={aiStatus !== 'ok' ? (isAr ? 'الخدمة غير متاحة' : 'Service unavailable') : t.placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading || aiStatus !== 'ok'}
              maxLength={1000}
              style={{ flex: 1, borderRadius: '2rem' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) handleSend(e);
              }}
            />
            <button
              id="ai-send-btn"
              type="submit"
              disabled={isLoading || !input.trim() || aiStatus !== 'ok'}
              style={{
                background: isLoading || !input.trim() || aiStatus !== 'ok'
                  ? 'rgba(99,102,241,0.3)'
                  : 'var(--primary)',
                color: 'white',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isLoading || !input.trim() || aiStatus !== 'ok' ? 'not-allowed' : 'pointer',
                transform: isAr ? 'scaleX(-1)' : 'none',
                transition: 'background 0.2s, transform 0.1s',
                flexShrink: 0,
              }}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
