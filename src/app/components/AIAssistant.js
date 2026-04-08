'use client';
import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { aiAPI } from '@/services/api';

export default function AIAssistantWidget() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: isAr ? 'مرحباً! أنا المساعد الذكي لـ FieldTrack. كيف يمكنني مساعدتك اليوم؟' : 'Hi! I am the FieldTrack AI Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const suggestions = isAr ? [
    "كيف يمكنك مساعدتي؟",
    "التوصية بفرص تدريب",
    "اشرح لي أدوار النظام"
  ] : [
    "How can you help me?",
    "Suggest internships for me",
    "Explain the platform roles"
  ];

  const handleSend = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const userMessage = textOverride || input.trim();
    if (!userMessage) return;

    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    if (!textOverride) setInput('');
    setIsLoading(true);

    try {
      const res = await aiAPI.chat({
        message: userMessage,
        context: { url: window.location.pathname }
      });

      setMessages(prev => [...prev, { sender: 'ai', text: res.data.reply || 'I could not process that request.' }]);
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Error connecting to AI Assistant.';
      setMessages(prev => [...prev, { sender: 'ai', text: `⚠️ ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div 
        onClick={toggleChat}
        className="pulse-glow"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          color: '#fff',
          fontSize: '1.5rem',
        }}
      >
        ✨
      </div>

      {isOpen && (
        <div 
          className="glass fade-in"
          style={{
            position: 'fixed',
            bottom: '6rem',
            right: '2rem',
            width: '350px',
            height: '450px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          <div style={{
            background: 'rgba(30, 41, 59, 0.9)',
            padding: '1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="gradient-text">✨ FieldTrack AI</span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>● {isAr ? 'متصل' : 'Online'}</span>
            </div>
            <button onClick={toggleChat} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>
              &times;
            </button>
          </div>

          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-card2)',
                padding: '0.75rem 1rem',
                borderRadius: msg.sender === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                fontSize: '0.9rem',
                lineHeight: '1.4',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.text}
              </div>
            ))}
            {messages.length === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isAr ? 'أسئلة مقترحة:' : 'Suggested questions:'}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSend(null, s)}
                      disabled={isLoading}
                      style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--primary-light)',
                        border: '1px solid var(--primary)',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '1.5rem',
                        fontSize: '0.8rem',
                        cursor: isLoading ? 'wait' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--primary)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg-card2)', padding: '0.75rem 1rem', borderRadius: '1rem 1rem 1rem 0', fontSize: '0.9rem' }}>
                <span className="pulse-glow" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginRight: '4px' }}></span>
                <span className="pulse-glow" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animationDelay: '0.2s', marginRight: '4px' }}></span>
                <span className="pulse-glow" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animationDelay: '0.4s' }}></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} style={{
            padding: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '0.5rem',
            background: 'rgba(30, 41, 59, 0.9)'
          }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder={isAr ? "اسألني أي شيء..." : "Ask me anything..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              style={{ flex: 1, borderRadius: '2rem' }}
            />
            <button type="submit" disabled={isLoading} style={{
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transform: isAr ? 'scaleX(-1)' : 'none'
            }}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
