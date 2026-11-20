import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, ExternalLink, RefreshCw } from 'lucide-react';
import { apiFetch, requestAccountReactivation } from '../services/authService';

const SESSION_KEY = 'dobbypay_music_auth_chat_session';

function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `authchat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `authchat_${Date.now()}`;
  }
}

/** Use Express API base (public tunnel on APK) — never relative /api alone on Capacitor. */
async function chatApi(action, extra = {}) {
  try {
    const res = await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ action, session_id: getSessionId(), ...extra })
    });
    const data = await res.json();
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid response' };
    }
    return data;
  } catch (err) {
    return { success: false, error: err?.message || 'Invalid response' };
  }
}

const DEFAULT_GREETING =
  '👋 Hello! Welcome to DobbyPay Music Support.\n\nPlease type your registered email or username so I can fetch your approval status.';

/**
 * Auth-screen only support chat:
 * asks email/username → shows Admin/Super Admin status → WhatsApp intimation
 */
export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [lastStatus, setLastStatus] = useState(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    chatApi('get_status').then((data) => {
      if (data?.success) setEnabled(data.enabled !== false);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const data = await chatApi('load_history');
      if (cancelled) return;
      if (data?.success && Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        setMessages([{
          sender: 'bot',
          message: DEFAULT_GREETING,
          created_at: new Date().toISOString()
        }]);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, typing, open, lastStatus]);

  const applyStatusPayload = (payload) => {
    if (!payload) return;
    setLastStatus(payload);
    if (payload.reply) {
      setMessages((prev) => [...prev, {
        sender: 'bot',
        message: payload.reply,
        created_at: new Date().toISOString()
      }]);
    }
  };

  const send = async () => {
    const msg = text.trim();
    if (!msg || sending || !enabled) return;
    setSending(true);
    setText('');
    setMessages((prev) => [...prev, { sender: 'customer', message: msg, created_at: new Date().toISOString() }]);
    setTyping(true);
    try {
      const data = await chatApi('send_message', { message: msg });
      if (data?.status) {
        setLastStatus(data.status);
      }
      if (data?.success && data.reply) {
        setMessages((prev) => [...prev, {
          sender: 'bot',
          message: data.reply,
          created_at: new Date().toISOString()
        }]);
      } else {
        setMessages((prev) => [...prev, {
          sender: 'bot',
          message: data?.error || 'Could not send. Please try again.',
          created_at: new Date().toISOString()
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        sender: 'bot',
        message: 'Support is temporarily unavailable. Please try again.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setTyping(false);
      setSending(false);
    }
  };

  const refreshStatus = async () => {
    const id = lastStatus?.user?.email || lastStatus?.user?.name || text.trim();
    if (!id) {
      setMessages((prev) => [...prev, {
        sender: 'bot',
        message: 'Please type your email or username first, then I can refresh the status.',
        created_at: new Date().toISOString()
      }]);
      return;
    }
    setTyping(true);
    try {
      const data = await chatApi('lookup_status', { identifier: id });
      if (data?.success) applyStatusPayload(data);
      else {
        setMessages((prev) => [...prev, {
          sender: 'bot',
          message: data?.error || 'Could not refresh status.',
          created_at: new Date().toISOString()
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        sender: 'bot',
        message: 'Could not refresh status right now.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setTyping(false);
    }
  };

  const openWhatsApp = () => {
    if (lastStatus?.whatsappUrl) {
      window.open(lastStatus.whatsappUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setMessages((prev) => [...prev, {
      sender: 'bot',
      message: 'Send your email/username first so I can prepare the WhatsApp approval message for Admin.',
      created_at: new Date().toISOString()
    }]);
  };

  const requestReactivation = async () => {
    const user = lastStatus?.user;
    if (!user) return;
    setTyping(true);
    try {
      const data = await requestAccountReactivation(user);
      setLastStatus((prev) => ({
        ...prev,
        canRequestReactivation: false,
        reactivationRequested: true,
        statusLabel: '⏸ Suspended — Reactivation Requested'
      }));
      setMessages((prev) => [...prev, {
        sender: 'bot',
        message: data.message || 'Reactivation request sent to Super Admin. They will see it under Reactivation Requests.',
        created_at: new Date().toISOString()
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        sender: 'bot',
        message: err.message || 'Could not send reactivation request.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="dobby-chat-root dobby-chat-root--auth" aria-live="polite">
      {open && (
        <div className="dobby-chat-window" role="dialog" aria-label="DobbyPay Support">
          <div className="dobby-chat-header">
            <div className="dobby-chat-header-title">
              <span className="dobby-chat-dot" />
              ⚡ DobbyPay Support
            </div>
            <button type="button" className="dobby-chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>
          <div className="dobby-chat-body" ref={bodyRef} role="log">
            {messages.map((m, i) => (
              <div key={`${m.created_at}-${i}`} className={`dobby-chat-msg ${m.sender === 'customer' ? 'customer' : 'bot'}`}>
                {m.message}
              </div>
            ))}
            {typing && (
              <div className="dobby-chat-typing">
                <span /><span /><span />
              </div>
            )}
          </div>

          {lastStatus?.found && (
            <div className="dobby-chat-status-bar">
              <div className="dobby-chat-status-label">
                Current status: <strong>{lastStatus.statusLabel}</strong>
              </div>
              <div className="dobby-chat-status-actions">
                {lastStatus.canRequestReactivation && (
                  <button type="button" className="dobby-chat-refresh-btn" onClick={requestReactivation}>
                    <RefreshCw size={14} />
                    Request Reactivation
                  </button>
                )}
                {!lastStatus.canLogin && lastStatus.whatsappUrl && (
                  <button type="button" className="dobby-chat-wa-btn" onClick={openWhatsApp}>
                    <MessageCircle size={14} />
                    Send WhatsApp Intimation
                    <ExternalLink size={12} />
                  </button>
                )}
                <button type="button" className="dobby-chat-refresh-btn" onClick={refreshStatus}>
                  Refresh status
                </button>
              </div>
            </div>
          )}

          <div className="dobby-chat-input-bar">
            <input
              type="text"
              value={text}
              maxLength={2000}
              placeholder={enabled ? 'Email or username...' : 'Chat disabled by admin'}
              disabled={!enabled || sending}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            />
            <button type="button" className="dobby-chat-send" onClick={send} disabled={!enabled || sending || !text.trim()}>
              <Send size={14} />
              Send
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="dobby-chat-bubble"
        title="Check approval status / WhatsApp Admin"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open support chat"
      >
        {open ? <X size={26} /> : <MessageCircle size={26} />}
      </button>
    </div>
  );
}
