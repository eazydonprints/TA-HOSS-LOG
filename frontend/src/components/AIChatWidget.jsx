import React, { useState, useRef, useEffect } from "react";
import { X, Send, Trash2, Copy, Check, RefreshCw, Bot } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./AIChatWidget.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://10.253.205.21:5000/api/v1";

const QUICK_SUGGESTIONS = [
  "How do I access community records?",
  "Tell me about the developer info.",
  "What features are available in TA-HOSS?",
];

export default function AIChatWidget() {
  const { token, isAuthenticated, loading: authLoading } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Hello! I am TA-HOSS AI. How can I assist you with community records or developer info today?",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const toggleChat = () => setIsOpen((prev) => !prev);

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: "Chat history cleared. How else can I help you with TA-HOSS?",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = async (textToSend) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput("");
    setLoading(true);

    try {
      const activeToken = token || localStorage.getItem("ta_hoss_token");

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          message: userMsg.content,
          history: updatedHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok && (data.answer || data.data)) {
        // Safe extraction of the string answer from data object or nested data object
        const aiResponse =
          typeof data.data === "object"
            ? data.data?.answer || JSON.stringify(data.data)
            : data.answer || data.data;

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: aiResponse,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            isError: true,
            content:
              data.message ||
              "Sorry, I encountered an issue processing your request.",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          isError: true,
          content:
            "Network error. Unable to reach TA-HOSS AI server. Please check your connection.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="taw-container">
      {/* AI CHATBOX WINDOW */}
      {isOpen && (
        <div className="taw-window">
          {/* Header */}
          <div className="taw-header">
            <div className="taw-header-left">
              <div className="taw-header-icon">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="taw-header-title">
                  TA-HOSS AI
                  <span className="taw-badge">v1.0</span>
                </h3>
                <span className="taw-status">
                  <span className="taw-status-dot"></span>
                  Online
                </span>
              </div>
            </div>

            <div className="taw-header-actions">
              <button
                type="button"
                onClick={clearChat}
                className="taw-icon-btn taw-clear"
                title="Clear conversation"
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={toggleChat}
                className="taw-icon-btn"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="taw-messages-body">
            {messages.map((msg) => (
              <div key={msg.id} className={`taw-msg-row ${msg.role}`}>
                <div className={`taw-msg-bubble ${msg.isError ? "error" : ""}`}>
                  {msg.content}

                  {msg.role === "assistant" && !msg.isError && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="taw-copy-btn"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check size={12} color="#059669" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  )}
                </div>

                <span className="taw-timestamp">{msg.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="taw-msg-row assistant">
                <div className="taw-typing">
                  <span className="taw-dot"></span>
                  <span className="taw-dot"></span>
                  <span className="taw-dot"></span>
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="taw-suggestions">
                <p className="taw-suggestions-title">Suggested Questions</p>
                {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="taw-suggestion-chip"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleFormSubmit} className="taw-input-form">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask TA-HOSS AI..."
              className="taw-input-field"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="taw-send-btn"
            >
              {loading ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </form>
        </div>
      )}

      {/* FLOATING TRIGGER BUTTON */}
      <button
        type="button"
        onClick={toggleChat}
        className="taw-trigger-btn"
        aria-label="Toggle AI Assistant"
      >
        {isOpen ? (
          <X size={18} />
        ) : (
          <>
            <Bot size={18} />
            <span>Ask AI</span>
          </>
        )}
      </button>
    </div>
  );
}