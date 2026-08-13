import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import "./AIAssistantPage.css";

/* ============================================================
   QUICK QUESTIONS
============================================================ */

const QUICK_QUESTIONS = [
  {
    title: "Community overview",
    question: "Give me a current overview of Ta-hoss Community.",
    icon: "📊",
  },
  {
    title: "Residents",
    question: "How many residents are currently registered and verified?",
    icon: "👥",
  },
  {
    title: "Households",
    question: "Give me the current household statistics.",
    icon: "🏠",
  },
  {
    title: "Verification",
    question: "Are there any residents currently awaiting verification?",
    icon: "✓",
  },
  {
    title: "GPS coverage",
    question:
      "How many households have been GPS mapped and how many remain unmapped?",
    icon: "📍",
  },
  {
    title: "Data quality",
    question:
      "Based on the current database snapshot, identify any obvious data-quality or operational concerns.",
    icon: "🔎",
  },
];

/* ============================================================
   MESSAGE HELPERS
============================================================ */

const createMessage = (role, content, extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
  timestamp: new Date(),
  ...extra,
});

const formatTime = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

/* ============================================================
   INLINE TEXT FORMATTER
============================================================ */

const formatInlineText = (text) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

/* ============================================================
   ANSWER FORMATTER
============================================================ */

const formatAnswer = (text) => {
  if (!text) return null;

  const lines = text.split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={index} className="ai-answer-spacer" />;
    }

    if (
      trimmed.startsWith("### ") ||
      trimmed.startsWith("## ") ||
      trimmed.startsWith("# ")
    ) {
      const heading = trimmed.replace(/^#{1,3}\s/, "");
      return (
        <div key={index} className="ai-answer-heading">
          {formatInlineText(heading)}
        </div>
      );
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <div key={index} className="ai-answer-bullet">
          <span className="ai-bullet-dot">•</span>
          <span>{formatInlineText(trimmed.slice(2))}</span>
        </div>
      );
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      return (
        <div key={index} className="ai-answer-numbered">
          <span className="ai-number-prefix">{numberedMatch[1]}.</span>
          <span>{formatInlineText(numberedMatch[2])}</span>
        </div>
      );
    }

    return (
      <div key={index} className="ai-answer-line">
        {formatInlineText(trimmed)}
      </div>
    );
  });
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AIAssistantPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const hasMessages = messages.length > 0;

  const conversationHistory = useMemo(() => {
    return messages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .slice(-12)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
  }, [messages]);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await api.get("/ai/health");
      if (response.data?.success) {
        setHealth(response.data.data);
      } else {
        setHealth({ configured: false, status: "unavailable" });
      }
    } catch (err) {
      console.error("TA-HOSS AI health check failed:", err);
      setHealth({ configured: false, status: "unavailable" });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    const scrollContainer = chatScrollRef.current;
    if (!scrollContainer) return;

    requestAnimationFrame(() => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, loading]);

  const sendMessage = async (messageOverride = null) => {
    const message = (
      messageOverride !== null ? messageOverride : input
    ).trim();

    if (!message || loading) return;

    setError("");
    setLoading(true);

    const userMessage = createMessage("user", message);
    const history = conversationHistory;

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await api.post("/ai/chat", { message, history });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "TA-HOSS AI could not process your request."
        );
      }

      const data = response.data.data;
      const assistantMessage = createMessage(
        "assistant",
        data?.answer || "I was unable to generate a response.",
        {
          responseId: data?.responseId,
          context: data?.context,
        }
      );

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("TA-HOSS AI chat error:", err);
      const serverMessage =
        err.response?.data?.message ||
        err.message ||
        "Unable to connect to TA-HOSS AI.";

      setError(serverMessage);
      setMessages((prev) => [
        ...prev,
        createMessage(
          "assistant",
          "I could not process that request. Please check the AI service connection and try again.",
          { isError: true }
        ),
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sendMessage();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  };

  const handleQuickQuestion = (question) => {
    setSidebarOpen(false);
    sendMessage(question);
  };

  const startNewConversation = () => {
    setMessages([]);
    setInput("");
    setError("");

    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const aiStatus = healthLoading
    ? "Checking AI..."
    : health?.configured
    ? "AI service online"
    : "AI service unavailable";

  return (
    <div className="ai-root">
      <div className="ai-shell">
        {/* HEADER */}
        <header className="ai-header">
          <div className="ai-header-left">
            <button
              type="button"
              className="ai-mobile-menu-btn"
              onClick={() => setSidebarOpen((val) => !val)}
              aria-label="Toggle AI assistant sidebar"
            >
              ☰
            </button>

            <div className="ai-brand-mark">
              <span>✦</span>
            </div>

            <div className="ai-brand-text">
              <div className="ai-title-row">
                <h1>TA-HOSS AI</h1>
                <span
                  className={`ai-status-badge ${
                    health?.configured ? "online" : "offline"
                  }`}
                >
                  <span className="ai-status-dot" />
                  {aiStatus}
                </span>
              </div>
              <p>Intelligent community operations assistant</p>
            </div>
          </div>

          <div className="ai-header-actions">
            <button
              type="button"
              className="ai-btn-new-chat"
              onClick={startNewConversation}
              disabled={loading}
            >
              <span className="ai-btn-icon">＋</span>
              <span className="ai-btn-text">New conversation</span>
            </button>
          </div>
        </header>

        {/* BODY */}
        <div className="ai-body">
          {/* ISOLATED AI SIDEBAR */}
          <aside
            className={`ai-sidebar-inner ${
              sidebarOpen ? "ai-sidebar-open" : ""
            }`}
          >
            <div className="ai-sidebar-section">
              <div className="ai-sidebar-heading">Assistant</div>
              <div className="ai-capability-card">
                <div className="ai-capability-icon">✦</div>
                <div className="ai-capability-text">
                  <strong>Community Intelligence</strong>
                  <p>
                    Ask questions about the current TA-HOSS database, residents,
                    households, verification and field operations.
                  </p>
                </div>
              </div>
            </div>

            <div className="ai-sidebar-section">
              <div className="ai-sidebar-heading">Quick questions</div>
              <div className="ai-quick-list">
                {QUICK_QUESTIONS.map((item) => (
                  <button
                    type="button"
                    key={item.title}
                    className="ai-quick-item"
                    onClick={() => handleQuickQuestion(item.question)}
                    disabled={loading}
                  >
                    <span className="ai-quick-icon">{item.icon}</span>
                    <span className="ai-quick-title">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="ai-sidebar-footer">
              <div className="ai-readonly-badge">
                <span>🔒</span> Read-only intelligence
              </div>
              <p>
                Note that TA-HOSS AI provides administrative assistance but
                does not directly modify community records.
              </p>
            </div>
          </aside>

          {/* OVERLAY FOR MOBILE */}
          {sidebarOpen && (
            <button
              type="button"
              className="ai-sidebar-overlay"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar overlay"
            />
          )}

          {/* CHAT MAIN AREA */}
          <main className="ai-chat-main">
            {/* ONLY THIS SECTION SCROLLS */}
            <div className="ai-chat-scroll" ref={chatScrollRef}>
              {!hasMessages ? (
                /* WELCOME SCREEN */
                <div className="ai-welcome">
                  <div className="ai-welcome-icon">✦</div>
                  <h2>
                    How can I help with
                    <br />
                    TA-HOSS today?
                  </h2>
                  <p>
                    Ask me about residents, households, verification, GPS
                    coverage, community statistics, data quality or TA-HOSS
                    operations.
                  </p>

                  <div className="ai-welcome-grid">
                    {QUICK_QUESTIONS.map((item) => (
                      <button
                        type="button"
                        className="ai-welcome-card"
                        key={item.title}
                        onClick={() => handleQuickQuestion(item.question)}
                        disabled={loading}
                      >
                        <span className="ai-card-icon">{item.icon}</span>
                        <div className="ai-card-text">
                          <strong>{item.title}</strong>
                          <small>{item.question}</small>
                        </div>
                        <span className="ai-card-arrow">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* MESSAGES STREAM */
                <div className="ai-messages-container">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`ai-message-row ${
                        message.role === "user"
                          ? "user-message"
                          : "assistant-message"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="ai-avatar">✦</div>
                      )}

                      <div className="ai-message-content">
                        <div className="ai-message-label">
                          {message.role === "user" ? "You" : "TA-HOSS AI"}
                          <span>{formatTime(message.timestamp)}</span>
                        </div>

                        <div
                          className={`ai-message-bubble ${
                            message.isError ? "message-error" : ""
                          }`}
                        >
                          {formatAnswer(message.content)}
                        </div>

                        {message.context && (
                          <div className="ai-context-note">
                            <span className="ai-context-dot">●</span>
                            Live TA-HOSS database context used
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="ai-message-row assistant-message">
                      <div className="ai-avatar">✦</div>
                      <div className="ai-message-content">
                        <div className="ai-message-label">TA-HOSS AI</div>
                        <div className="ai-message-bubble ai-typing">
                          <span />
                          <span />
                          <span />
                          <em>Analysing TA-HOSS data...</em>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {error && (
                <div className="ai-error-banner">
                  <span className="ai-error-icon">⚠</span>
                  <div className="ai-error-text">
                    <strong>AI request failed</strong>
                    <p>{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* STRICTLY PINNED COMPOSER AT BOTTOM */}
            <div className="ai-composer-wrapper">
              <div className="ai-composer-inner">
                <form className="ai-input-wrapper" onSubmit={handleSubmit}>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask TA-HOSS AI anything about the community..."
                    rows={1}
                    maxLength={6000}
                    disabled={loading}
                  />

                  <div className="ai-input-bottom">
                    <div className="ai-input-hint">
                      <span>Enter to send</span>
                      <span>•</span>
                      <span>Shift + Enter for new line</span>
                    </div>

                    <div className="ai-input-actions">
                      {input.length > 0 && (
                        <span className="ai-character-count">
                          {input.length}/6000
                        </span>
                      )}

                      <button
                        type="submit"
                        className="ai-send-button"
                        disabled={loading || !input.trim()}
                        aria-label="Send message"
                      >
                        {loading ? (
                          <span className="ai-send-spinner" />
                        ) : (
                          "↑"
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="ai-disclaimer">
                  TA-HOSS AI uses live read-only database context. Always verify
                  critical administrative information against system records.
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;