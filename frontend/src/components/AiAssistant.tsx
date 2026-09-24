import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sidebar } from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, CheckCircle2, ArrowRight, Zap, RefreshCw } from 'lucide-react';

export const AiAssistant: React.FC = () => {
  const { chatMessages, sendChatMessage, setCurrentScreen } = useApp();
  const [inputVal, setInputVal] = useState('');

  const quickPrompts = [
    'Refactor Hero section with gradient text',
    'Add an interactive contact modal',
    'Optimize animations with Framer Motion spring physics',
    'Inject Three.js 3D particles into background'
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendChatMessage(inputVal);
    setInputVal('');
  };

  const handleQuickPrompt = (prompt: string) => {
    sendChatMessage(prompt);
  };

  return (
    <div className="app-shell">
      <Sidebar activeScreen="ai-assistant" />

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <motion.div
          className="ai-assistant-container"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="ai-assistant-header">
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#141414',
                color: '#FFFFFF',
                border: '1px solid #27272A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={18} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>AI Assistant</h2>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid #27272A' }}>
                  Model: GPT-4o Code
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#A1A1AA', marginTop: '2px' }}>
                Ask questions, request component refactoring, or generate full code modules.
              </p>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div style={{ display: 'flex', gap: '8px', padding: '10px 1.5rem', background: '#080808', borderBottom: '1px solid #1F1F1F', overflowX: 'auto' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#71717A', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={12} /> SUGGESTIONS:
            </span>
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickPrompt(qp)}
                style={{
                  background: '#121212',
                  border: '1px solid #222222',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  color: '#A1A1AA',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#FFFFFF';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#222222';
                  e.currentTarget.style.color = '#A1A1AA';
                }}
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Chat Stream with Framer Motion entry animations */}
          <div className="ai-chat-stream">
            <AnimatePresence>
              {chatMessages.map(msg => (
                <motion.div
                  key={msg.id}
                  className={msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {msg.sender === 'ai' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem' }}>
                      <Sparkles size={14} />
                      <span style={{ fontFamily: 'var(--font-heading)' }}>CraftAi Assistant</span>
                      <span style={{ fontSize: '0.7rem', color: '#71717A', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                        {msg.timestamp}
                      </span>
                    </div>
                  )}

                  <p style={{ lineHeight: 1.6 }}>{msg.text}</p>

                  {msg.changes && msg.changes.length > 0 && (
                    <>
                      <ul className="ai-changes-list">
                        {msg.changes.map((ch, idx) => (
                          <li key={idx} className="ai-change-item" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                            <CheckCircle2 size={15} color="#FFFFFF" />
                            <span>{ch}</span>
                          </li>
                        ))}
                      </ul>

                      <motion.button
                        className="btn-outline"
                        onClick={() => setCurrentScreen('workspace')}
                        style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem', gap: '6px' }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span>View Changes in Workspace</span>
                        <ArrowRight size={13} />
                      </motion.button>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Bottom Chat Input */}
          <form onSubmit={handleSend} className="ai-chat-input-bar">
            <textarea
              className="ai-chat-textarea"
              rows={2}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Ask CraftAi to refactor components, rewrite styling, or generate code..."
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <motion.button
              type="submit"
              className="btn-primary"
              style={{ padding: '12px 20px', borderRadius: '8px' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send size={16} />
            </motion.button>
          </form>
        </motion.div>
      </main>
    </div>
  );
};
