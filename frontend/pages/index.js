import Head from 'next/head';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaChartBar, FaMapMarkerAlt, FaUtensils, FaLightbulb, FaTimes } from 'react-icons/fa';
import config from '../utils/config';
import { sanitizeErrorMessage, handleApiError, isValidSessionId, generateRequestId } from '../utils/errorHandler';

// Example queries shown in rotation
const EXAMPLE_QUERIES = [
  "What's the price of rice in Ikeja?",
  "Compare yam prices in Surulere and Ikorodu",
  "Price trend of beans in Kano",
  "Cost of garri in Port Harcourt"
];

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [currentExample, setCurrentExample] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const MAX_PROMPT_LEN = 280;

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-rotate example queries
  // Memoize welcome message
  const welcomeMessage = useMemo(() => ({
    role: 'bot',
    text: "Welcome to ChopWise, your real-time food price assistant. Ask me about current prices, compare costs across locations, or check price trends.",
    id: 'welcome'
  }), []);

  // Example query rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentExample(prev => (prev + 1) % EXAMPLE_QUERIES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Initialize session and messages
  useEffect(() => {
    const storedSessionId = localStorage.getItem('chopwise_session_id');
    if (storedSessionId && isValidSessionId(storedSessionId)) {
      setSessionId(storedSessionId);
    }
    setMessages([welcomeMessage]);

    // Cleanup function to prevent memory leaks
    return () => {
      setMessages([]);
      setInput('');
      setError('');
    };
  }, [welcomeMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!chatEndRef.current) return;
    
    const smoothScroll = () => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Use requestAnimationFrame for smoother scrolling
    if (messages.length > 0) {
      requestAnimationFrame(smoothScroll);
    }

    return () => {
      // Cancel any pending animation frame
      cancelAnimationFrame(smoothScroll);
    };
  }, [messages]);

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
    
    // Basic validation
    if (!input.trim() || loading) return;
    if (input.length > MAX_PROMPT_LEN) {
      setError(`Message too long. Please keep it under ${MAX_PROMPT_LEN} characters.`);
      return;
    }

    // Prepare request
    const userMessage = input.trim();
    const requestId = generateRequestId();
    
    // Update UI state
    setInput("");
    setError("");
    setLoading(true);
    setShowGuide(false);
    setMessages(prev => [...prev, { role: 'user', text: userMessage, id: requestId }]);

    try {
      // Validate session ID if present
      if (sessionId && !isValidSessionId(sessionId)) {
        console.warn('Invalid session ID detected, clearing...');
        localStorage.removeItem('chopwise_session_id');
        setSessionId(null);
      }

      const response = await fetch(`${config.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Request-ID': requestId,
          'X-Session-ID': sessionId || 'new'
        },
        body: JSON.stringify({ 
          message: userMessage,
          session_id: sessionId || undefined
        }),
      });

      let errorData;
      const contentType = response.headers.get("content-type");
      
      // Handle non-OK responses
      if (!response.ok) {
        if (contentType?.includes("application/json")) {
          errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to get response');
        } else {
          const text = await response.text();
          throw new Error(`Server error: ${response.status} ${text || response.statusText}`);
        }
      }

      // Validate response format
      const data = await response.json();
      if (!data || (typeof data.response !== 'string' && !data.session_id)) {
        throw new Error('Invalid response format from server');
      }

      const responseData = await response.json();
      
      // Validate response format
      if (!responseData || (typeof responseData.response !== 'string' && !responseData.session_id)) {
        throw new Error('Invalid response format from server');
      }

      if (responseData.session_id && !sessionId) {
        setSessionId(responseData.session_id);
        localStorage.setItem('chopwise_session_id', responseData.session_id);
      }

      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: responseData.response,
        id: `${requestId}-response`
      }]);
    } catch (err) {
      handleApiError(err, setError);
      
      // Remove failed message from UI
      setMessages(prev => prev.filter(msg => msg.id !== requestId));
      
      // Log error for monitoring
      console.error('Chat error:', {
        error: err,
        requestId,
        sessionId,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
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
        <title>ChopWise - Real-time Food Price Intelligence</title>
        <meta name="description" content="Get instant access to food prices across Nigeria's markets with AI-powered insights." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta property="og:title" content="ChopWise - Real-time Food Price Intelligence" />
        <meta property="og:description" content="Get instant access to food prices across Nigeria's markets with AI-powered insights." />
        <meta property="og:type" content="website" />
        <meta name="theme-color" content="#0891b2" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen font-sans flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <header className="w-full max-w-5xl mx-auto p-4 flex justify-between items-center fixed top-0 z-50">
          <div className="flex items-center gap-3">
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              src="/logo.jpg"
              className="h-12 w-12 rounded-xl border-2 border-cyan-400/50 shadow-lg"
              alt="ChopWise Logo"
            />
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col"
            >
              <span className="text-2xl font-bold tracking-wider text-white">ChopWise</span>
              <span className="text-xs text-cyan-400/80">Food Price Intelligence</span>
            </motion.div>
          </div>
        </header>

        <main className="w-full max-w-6xl mx-auto flex-grow flex flex-col lg:flex-row items-center justify-center pt-20 gap-8">
          <div className="w-full md:w-1/2 p-8 space-y-6 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-200">
                Real-Time Food Prices. <br/>
                <span className="text-cyan-400">Instant Answers.</span>
              </h1>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-slate-300">
                  <FaUtensils className="text-cyan-400" />
                  <p>Current prices across Nigeria's markets</p>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <FaChartBar className="text-cyan-400" />
                  <p>Price trends and forecasts</p>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <FaMapMarkerAlt className="text-cyan-400" />
                  <p>Compare prices across locations</p>
                </div>
              </div>

              <motion.p 
                className="mt-6 text-slate-400 text-lg leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Your intelligent companion for navigating Nigeria's food market prices. Ask me anything.
              </motion.p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }} 
            className="w-full md:w-1/2 h-[75vh] flex flex-col bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl shadow-cyan-500/10 border border-slate-700/50 overflow-hidden"
          >
            
            <div className="flex-grow p-6 overflow-y-auto" id="chat-scroll">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`px-4 py-3 rounded-2xl shadow-lg max-w-xs md:max-w-md 
                        ${msg.role === 'user' 
                          ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white' 
                          : 'bg-slate-700/80 text-slate-200'
                        }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                {showGuide && messages.length === 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-4 p-4 rounded-xl bg-slate-700/50 border border-slate-600/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FaLightbulb className="text-cyan-400" />
                      <span className="text-slate-200 font-medium">Try asking:</span>
                    </div>
                    <motion.p 
                      key={currentExample}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-slate-300 italic"
                    >
                      "{EXAMPLE_QUERIES[currentExample]}"
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-slate-900/50 border-t border-slate-600/20">
              <form onSubmit={handleChatSubmit} className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => { 
                      setInput(e.target.value);
                      setShowGuide(false);
                    }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={loading ? "Getting your answer..." : "Ask about food prices..."}
                    className="w-full p-3 pr-10 bg-slate-700/80 rounded-full border border-slate-600/50 
                             focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent 
                             transition-all duration-200 text-white placeholder-slate-400"
                    disabled={loading}
                    maxLength={400}
                  />
                  {!!input && !loading && (
                    <button
                      type="button"
                      aria-label="Clear input"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 
                               hover:text-slate-200 focus:outline-none focus:text-cyan-400
                               focus:ring-2 focus:ring-cyan-500/50 rounded-full p-1
                               transition-colors duration-200"
                      onClick={() => setInput("")}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setInput("");
                        }
                      }}
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="submit"
                  className={`p-3 rounded-full flex items-center justify-center transition-all duration-300
                    ${loading 
                      ? 'bg-slate-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg'
                    }`}
                  disabled={loading || !input.trim()}>
                  <FaPaperPlane />
                </motion.button>
              </form>
              
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    role="alert"
                    aria-live="polite"
                    className="text-red-400 text-center mt-3 text-sm bg-red-500/10 p-2 rounded-lg"
                  >
                    <span className="sr-only">Error: </span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <AnimatePresence mode="wait">
                {loading && !error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 flex items-center justify-center gap-3"
                  >
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <motion.span
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: i * 0.1
                          }}
                          className="w-2 h-2 bg-cyan-400/70 rounded-full"
                        />
                      ))}
                    </div>
                    <span className="text-sm text-slate-400">Finding prices...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </main>
        
        <footer className="w-full text-center p-4 text-slate-500 text-sm">
          <p>Powered by real-time market data and AI price predictions</p>
        </footer>
      </div>
    </>
  );
}