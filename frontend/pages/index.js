import Head from 'next/head';
import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaTimes, FaLightbulb } from 'react-icons/fa';
import config from '../utils/config';

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [foods, setFoods] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedInput, setDebouncedInput] = useState("");
  const MAX_PROMPT_LEN = 280;

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const storedSessionId = localStorage.getItem('chopwise_session_id');
    if (storedSessionId) setSessionId(storedSessionId);
    setMessages([
      { role: 'bot', text: 'Welcome to the future of food price intelligence. How can I help you today?' }
    ]);
    // Fetch meta info for autocomplete
    (async () => {
      try {
        const res = await fetch(`${config.NEXT_PUBLIC_BACKEND_URL}/info`);
        if (res.ok) {
          const data = await res.json();
            setFoods(data.foods || []);
            setLgas(data.lgas || []);
        }
      } catch (e) {
        // Non-fatal; autocomplete just won't work
        console.warn('Failed to load info for autocomplete', e);
      }
    })();
  }, []);

  // Debounce user input for suggestions
  useEffect(() => {
    const t = setTimeout(() => setDebouncedInput(input.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [input]);

  const buildSuggestions = useCallback(() => {
    if (!debouncedInput) {
      // Provide helpful starter examples
      return [
        { label: 'Example: price of rice in Ikeja', fill: 'price of rice in Ikeja' },
        { label: 'Example: compare price of beans in Ikeja and Surulere', fill: 'compare price of beans in Ikeja and Surulere' },
        { label: 'Example: trend of maize in Kano', fill: 'trend of maize in Kano' }
      ];
    }
    const term = debouncedInput;
    const foodHits = foods
      .filter(f => f.toLowerCase().includes(term))
      .slice(0, 5)
      .map(f => ({ label: `Food: ${f}`, fill: f }));
    const lgaHits = lgas
      .filter(l => l.toLowerCase().includes(term))
      .slice(0, 5)
      .map(l => ({ label: `LGA: ${l}`, fill: l }));
    return [...foodHits, ...lgaHits];
  }, [debouncedInput, foods, lgas]);

  useEffect(() => {
    setSuggestions(buildSuggestions());
  }, [buildSuggestions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (input.length > MAX_PROMPT_LEN) {
      setError(`Prompt too long (>${MAX_PROMPT_LEN} chars). Please shorten it.`);
      return;
    }

    const newUserMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);
    setError("");

    try {
  const history = messages.map(msg => ({ user: msg.role === 'user' ? msg.text : '', bot: msg.role === 'bot' ? msg.text : '' }));
      history.push({ user: input, bot: '' });

      const res = await fetch(`${config.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, messages: history.slice(-5) })
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('Chat API error', res.status, res.statusText, body);
        setError(`API ${res.status}: ${body || res.statusText}`);
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem('chopwise_session_id', data.session_id);
      }

      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'bot', text: data.reply }]);
      } else {
        setError("Received an empty response from the server.");
      }
    } catch (err) {
      setError("Network error. Please check the backend URL and try again.");
      console.error('Network error', err);
    } finally {
      setLoading(false);
      setInput("");
      inputRef.current?.focus();
    }
  };

  const onSuggestionClick = (s) => {
    setInput(prev => {
      // If previous input empty or example, replace; else append smartly
      if (!prev.trim() || prev.startsWith('Example:')) return s.fill;
      // Avoid duplicate tokens
      if (prev.toLowerCase().includes(s.fill.toLowerCase())) return prev;
      return `${prev.trim()} ${s.fill}`.trim();
    });
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    // Delay hiding to allow click
    setTimeout(() => setShowSuggestions(false), 180);
  };

  return (
    <>
      <Head>
        <title>ChopWise | AI-Powered Market Intelligence</title>
        <meta name="description" content="An intelligent assistant for Nigerian food price information and predictions."/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="aurora-bg"></div>
      <div className="min-h-screen font-sans flex flex-col items-center justify-center p-4">
        <header className="w-full max-w-5xl mx-auto p-4 flex justify-between items-center fixed top-0 z-50">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" className="h-10 w-10 rounded-full border-2 border-cyan-400/50" alt="ChopWise Logo" />
            <span className="text-xl font-bold tracking-wider">ChopWise</span>
          </div>
        </header>

        <main className="w-full max-w-5xl mx-auto flex-grow flex flex-col md:flex-row items-center justify-center pt-20">
          <div className="w-full md:w-1/2 p-8 space-y-6 text-center md:text-left">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h1 className="text-5xl font-bold leading-tight">Market Intelligence, <span className="text-cyan-400">Reimagined.</span></h1>
              <p className="text-slate-400 mt-4 text-lg">Navigate Nigeria's food market with predictive insights and AI-driven analytics. Your strategic advantage starts here.</p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full md:w-1/2 h-[75vh] flex flex-col bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl shadow-cyan-500/10 border border-slate-500/20 overflow-hidden">
            
            <div className="flex-grow p-6 overflow-y-auto">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-2 rounded-lg max-w-xs md:max-w-md shadow-md ${msg.role === 'user' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-200'}`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && <div className="text-center text-slate-400">Thinking...</div>}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-slate-900/30 border-t border-slate-500/20">
              <form onSubmit={handleChatSubmit} className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Ask about prices, trends, comparisons..."
                    className="w-full p-3 pr-10 bg-slate-700/80 rounded-full border border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 transition text-white"
                    disabled={loading}
                    maxLength={400}
                  />
                  {!!input && !loading && (
                    <button
                      type="button"
                      aria-label="Clear"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      onClick={() => setInput("")}
                    >
                      <FaTimes />
                    </button>
                  )}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-slate-800/95 rounded-xl border border-slate-600/40 max-h-64 overflow-y-auto shadow-lg z-20 backdrop-blur">
                      {suggestions.map((s, i) => (
                        <button
                          type="button"
                          key={i}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => onSuggestionClick(s)}
                          className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700/60 flex items-center gap-2"
                        >
                          <FaLightbulb className="text-cyan-400" /> {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="absolute -bottom-6 left-2 text-xs text-slate-500 select-none">{input.length}/{MAX_PROMPT_LEN}</div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="submit"
                  className="p-3 rounded-full bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-600 transition-all duration-300 flex items-center justify-center"
                  disabled={loading || !input.trim()}>
                  <FaPaperPlane />
                </motion.button>
              </form>
              {error && <div className="text-red-400 text-center mt-2 text-sm">{error}</div>}
              {loading && (
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-400 animate-pulse">
                  <span className="w-2 h-2 bg-cyan-400/70 rounded-full animate-bounce"></span>
                  <span>Generating answer...</span>
                </div>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
}