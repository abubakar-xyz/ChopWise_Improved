import Head from 'next/head';
import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaChartBar, FaMapMarkerAlt, FaUtensils, FaLightbulb, FaTimes, FaLinkedin, FaTwitter, FaGithub } from 'react-icons/fa';
import { FaMastodon } from 'react-icons/fa6';
import config from '../utils/config';
import { handleApiError, isValidSessionId, generateRequestId } from '../utils/errorHandler';

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

    // Cleanup
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
    if (messages.length > 0) {
      requestAnimationFrame(smoothScroll);
    }
    return () => {
      // noop cleanup for RAF (can't cancel without id)
    };
  }, [messages]);

  // No-op focus/blur handlers (suggestion system removed)
  const handleInputFocus = () => { inputRef.current?.focus(); };
  const handleInputBlur = () => {};

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

      // Add a timeout so requests don't hang indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const response = await fetch(`${config.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Request-ID': requestId,
          'X-Session-ID': sessionId || 'new'
        },
        body: JSON.stringify({
          session_id: sessionId || null,
          messages: [
            { user: userMessage, bot: "" }
          ]
        }),
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to get response');
        } else {
          const text = await response.text();
          throw new Error(`Server error: ${response.status} ${text || response.statusText}`);
        }
      }

      const responseData = await response.json();
      if (!responseData || (typeof responseData.reply !== 'string' && !responseData.session_id)) {
        throw new Error('Invalid response format from server');
      }

      if (responseData.session_id && !sessionId) {
        setSessionId(responseData.session_id);
        localStorage.setItem('chopwise_session_id', responseData.session_id);
      }

      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: responseData.reply,
        id: `${requestId}-response`
      }]);
    } catch (err) {
      if (err && (err.name === 'AbortError' || err.code === 'ERR_CANCELED')) {
        setError('Request timed out. Please try again.');
      } else {
      handleApiError(err, setError);
      }
      // Remove failed message from UI
      setMessages(prev => prev.filter(msg => msg.id !== requestId));
      console.error('Chat error:', { error: err, requestId, sessionId, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
      try { clearTimeout(timeoutId); } catch {}
    }
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
        {/* Fixed header with opaque/blurred background and divider for readability */}
        <header className="fixed top-0 left-0 w-full z-50 bg-slate-900/80 supports-[backdrop-filter]:bg-slate-900/60 backdrop-blur border-b border-slate-700/40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
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
            {/* keep any right-side actions if added later */}
          </div>
        </header>

  {/* Add larger top padding so hero never sits under header */}
  <main className="w-full max-w-6xl mx-auto flex-grow flex flex-col lg:flex-row items-center justify-center pt-28 md:pt-36 gap-10">
          <div className="w-full md:w-3/5 lg:w-7/12 p-6 md:p-8 space-y-6 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Reduce headline size for better hierarchy on all screens */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-200 drop-shadow-[0_2px_14px_rgba(34,211,238,0.12)]">
                Real-Time Food Prices. <br/>
                <span className="text-cyan-400">Instant Answers.</span>
              </h1>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="group rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-md hover:shadow-cyan-500/10 hover:border-cyan-500/40 transition-all">
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400/90 bg-cyan-500/10 p-2 rounded-xl">
                      <FaUtensils className="text-2xl" />
                    </span>
                    <div>
                      <h3 className="text-slate-100 font-semibold">Live Market Prices</h3>
                      <p className="text-slate-300/80 text-sm">Current prices across Nigeria's markets</p>
                    </div>
                  </div>
                </div>
                <div className="group rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-md hover:shadow-cyan-500/10 hover:border-cyan-500/40 transition-all">
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400/90 bg-cyan-500/10 p-2 rounded-xl">
                      <FaChartBar className="text-2xl" />
                    </span>
                    <div>
                      <h3 className="text-slate-100 font-semibold">Trends & Forecasts</h3>
                      <p className="text-slate-300/80 text-sm">See recent trends and simple forecasts</p>
                    </div>
                  </div>
                </div>
                <div className="group rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-md hover:shadow-cyan-500/10 hover:border-cyan-500/40 transition-all">
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400/90 bg-cyan-500/10 p-2 rounded-xl">
                      <FaMapMarkerAlt className="text-2xl" />
                    </span>
                    <div>
                      <h3 className="text-slate-100 font-semibold">Compare Locations</h3>
                      <p className="text-slate-300/80 text-sm">Quickly compare across LGAs</p>
                    </div>
                  </div>
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
            className="w-full md:w-2/5 lg:w-5/12 h-[58vh] lg:h-[62vh] md:ml-auto flex flex-col bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-xl shadow-cyan-500/10 border border-slate-700/40 overflow-hidden"
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
                    maxLength={MAX_PROMPT_LEN}
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
        
        <footer className="w-full mt-16 border-t border-slate-700/50 bg-slate-900/60 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center space-y-4">
              <p className="text-slate-300 text-sm md:text-base">
                Designed and built with love and passion by <a href="https://www.linkedin.com/in/abubakar-abdulfatah/" target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 underline underline-offset-4 decoration-cyan-700/60">Abubakar Abdulfatah</a> and GitHub Copilot :)
              </p>
              <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
                <a href="https://www.linkedin.com/in/abubakar-abdulfatah/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-800/80 transition">
                  <FaLinkedin /> <span className="text-sm">LinkedIn</span>
                </a>
                <a href="https://x.com/abubakar_xyz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-800/80 transition">
                  <FaTwitter /> <span className="text-sm">Twitter</span>
                </a>
                <a href="https://mstdn.business/@abubakar" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-800/80 transition">
                  <FaMastodon /> <span className="text-sm">Mastodon</span>
                </a>
                <a href="https://github.com/abubakar-xyz/ChopWise_Improved" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-800/80 transition">
                  <FaGithub /> <span className="text-sm">GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}