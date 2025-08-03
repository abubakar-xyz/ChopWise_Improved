import Head from 'next/head';
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaInfoCircle, FaArrowUp, FaChevronDown } from 'react-icons/fa';

// --- Configuration ---
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// --- Main Component ---
export default function Home() {
  // --- State Management ---
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(true);

  // --- Refs ---
  const chatEndRef = useRef(null);
  const chatSectionRef = useRef(null);
  const insightsSectionRef = useRef(null);
  const inputRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    // Initialize session ID from localStorage
    const storedSessionId = localStorage.getItem('chopwise_session_id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
    // Scroll to top on initial load
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    // Auto-scroll to the latest message
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    // Show/hide scroll buttons based on scroll position
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 200);
      setShowScrollDown(window.scrollY < 150);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // --- Event Handlers ---
  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newUserMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);
    setError("");

    try {
      // Construct message history for the API request
      const history = messages.map(msg => ({
        user: msg.role === 'user' ? msg.text : '',
        bot: msg.role === 'bot' ? msg.text : ''
      }));
      history.push({ user: input, bot: '' });

      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, messages: history.slice(-4) })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
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
      setError("Failed to connect to the chatbot. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
      setInput("");
      inputRef.current?.focus();
    }
  };

  // --- Render ---
  return (
    <>
      <Head>
        <title>ChopWise - AI Assistant for Nigerian Food Prices</title>
        <meta name="description" content="Your intelligent guide to food prices across Nigeria."/>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="fixed w-full top-0 bg-gradient-to-r from-green-800 to-green-600 shadow-md z-50 flex justify-between items-center px-6 py-3">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" className="h-12 w-12 rounded-full border-2 border-white" alt="ChopWise Logo" />
          <span className="text-white text-2xl font-bold tracking-wide">ChopWise</span>
        </div>
        <nav className="hidden md:flex gap-8 text-white font-semibold">
          <button onClick={() => scrollToSection(chatSectionRef)} className="hover:text-yellow-300 transition">Chat</button>
          <button onClick={() => scrollToSection(insightsSectionRef)} className="hover:text-yellow-300 transition">Insights</button>
        </nav>
      </header>

      <main className="pt-24 bg-gray-50">
        <section className="text-center py-16 bg-green-100">
          <h1 className="text-4xl font-bold text-green-800 mb-4">Smarter Shopping Starts Here</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">Get real-time food price information and predictions across Nigeria with our intelligent AI assistant.</p>
        </section>

        <section id="chat" ref={chatSectionRef} className="py-16 px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col h-full">
              <div className="mb-4 p-3 bg-blue-100 rounded-lg text-center">
                <FaInfoCircle className="inline mr-2 text-blue-500" />
                <span>Our AI uses real market data to provide price estimates. Ask me something like: "What's the price of rice in Ikeja?"</span>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 h-96">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && <div className="text-center p-4">Thinking...</div>}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="flex gap-3 mt-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about food prices..."
                  className="flex-1 p-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-600 transition flex items-center gap-2"
                  disabled={loading}>
                  <FaRobot /> Send
                </button>
              </form>
              {error && <div className="text-red-500 text-center mt-3">{error}</div>}
            </div>
          </div>
        </section>

        <section id="insights" ref={insightsSectionRef} className="py-16 px-4 bg-gray-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-green-800 mb-6">Market Insights</h2>
            <div className="bg-white rounded-lg shadow-lg p-6">
              {/* Placeholder for Tableau visualization */}
              <div className="w-full h-96 bg-gray-200 flex items-center justify-center rounded-md">
                <p className="text-gray-500">Market trends visualization coming soon.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-green-800 text-white text-center py-6">
        <p>&copy; 2025 ChopWise. All Rights Reserved.</p>
        <p>Built with ❤️ by a passionate developer.</p>
      </footer>

      {/* Scroll Buttons */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition">
            <FaArrowUp />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}