import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BACKEND_URL } from '../utils/config';

export default function Home() {
  // Chatbot state
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // {role: 'user'|'bot', text: string}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Tableau embed (responsive)
  useEffect(() => {
    const prev = document.getElementById('viz1750358814595');
    if (prev) prev.remove();
    const vizContainer = document.getElementById('viz');
    if (vizContainer) {
      const div = document.createElement('div');
      div.className = 'tableauPlaceholder w-full h-full';
      div.id = 'viz1750358814595';
      div.style.position = 'relative';
      div.innerHTML = `
        <noscript><a href='#'><img alt='HOMEPAGE ' src='https://public.tableau.com/static/images/46/463G55YGM/1_rss.png' style='border: none' /></a></noscript>
        <object class='tableauViz' style='width:100%;height:100%;min-height:400px;min-width:320px;'>
          <param name='host_url' value='https%3A%2F%2Fpublic.tableau.com%2F' />
          <param name='embed_code_version' value='3' />
          <param name='path' value='shared/463G55YGM' />
          <param name='toolbar' value='yes' />
          <param name='static_image' value='https://public.tableau.com/static/images/46/463G55YGM/1.png' />
          <param name='animate_transition' value='yes' />
          <param name='display_static_image' value='yes' />
          <param name='display_spinner' value='yes' />
          <param name='display_overlay' value='yes' />
          <param name='display_count' value='yes' />
          <param name='language' value='en-US' />
        </object>
      `;
      vizContainer.appendChild(div);
      const script = document.createElement('script');
      script.src = 'https://public.tableau.com/javascripts/api/viz_v1.js';
      script.async = true;
      div.appendChild(script);
    }
  }, []);

  // Chatbot submit handler
  async function handleChatSubmit(e) {
    e.preventDefault();
    setError("");
    if (!input.trim()) return;
    setMessages(msgs => [...msgs, { role: 'user', text: input }]);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      setMessages(msgs => [...msgs, { role: 'bot', text: data.reply }]);
    } catch (err) {
      setError('Sorry, something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  return (
    <>
      <Head>
        <title>ChopWise — AI for Nigerian Food Prices</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="fixed w-full top-0 bg-gradient-to-br from-black via-[#001F2E] to-brand-green/80 backdrop-blur-lg z-50 flex justify-between items-center px-6 md:px-16 py-4 border-b border-brand-green shadow-2xl animate-gradient-x">
        <a href="#" className="flex items-center gap-4 focus:outline-none focus:ring-2 focus:ring-brand-green">
          <img src="/logo.jpg" className="h-14 w-14 rounded-full border-4 border-brand-green shadow-xl animate-pulse" alt="ChopWise logo" />
          <span className="text-brand-green font-futuristic text-3xl tracking-widest drop-shadow-lg">ChopWise</span>
        </a>
        <nav className="hidden md:flex gap-10 text-brand-light text-lg font-semibold">
          <a href="#chat" className="hover:text-brand-green transition focus:outline-none focus:text-brand-green">Chat</a>
          <a href="#insights" className="hover:text-brand-green transition focus:outline-none focus:text-brand-green">Insights</a>
        </nav>
      </header>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="min-h-[80vh] flex flex-col justify-center items-center text-center bg-gradient-to-br from-brand-dark via-[#002A2A] to-[#001F2E] text-white px-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="w-full h-full bg-gradient-to-tr from-brand-green/10 via-transparent to-brand-green/10 animate-pulse" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="relative z-10 text-5xl md:text-7xl font-extrabold font-futuristic text-brand-green drop-shadow-2xl mb-4"
          >
            Shop Smarter, Eat Better
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 mt-4 max-w-2xl text-xl md:text-2xl text-brand-light/90 mb-8"
          >
            Discover the best places and times to buy your favorite food items across Nigeria. Get real-time prices, expert forecasts, and insider tips to help you save money and shop with confidence—wherever you are.
          </motion.p>
          <motion.a
            href="#chat"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.97 }}
            className="relative z-10 mt-6 btn-primary text-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-green animate-bounce"
          >
            Find the Best Deals
          </motion.a>
        </section>

        {/* Chat Section */}
        <section id="chat" className="bg-brand-dark text-brand-light py-20 px-4">
          <div className="max-w-4xl mx-auto glassmorphism shadow-2xl">
            <h2 className="text-3xl font-futuristic text-brand-green text-center mb-8 drop-shadow-lg animate-fade-in">Chat with ChopWise</h2>
            <div className="flex flex-col items-center justify-center gap-4 bg-accent-deep rounded-2xl p-8 text-center text-brand-light/80 shadow-lg border-2 border-brand-green/30 animate-fade-in-up">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-green/20 border-2 border-brand-green mb-2 animate-pulse">
                <img src="/logo.jpg" alt="ChopWise logo" className="h-10 w-10 rounded-full" />
              </span>
              <div className="w-full max-w-xl mx-auto flex flex-col gap-2 mb-4">
                <div className="h-64 overflow-y-auto bg-black/10 rounded-xl p-4 border border-brand-green/20 shadow-inner" style={{ minHeight: 180 }}>
                  {messages.length === 0 && (
                    <div className="text-brand-light/60 text-center">Ask about food prices, trends, or where and when to buy. E.g. <span className="italic">Where is the best place to buy rice in Lagos this week?</span></div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`my-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-left whitespace-pre-line ${msg.role === 'user' ? 'bg-brand-green text-black font-semibold' : 'bg-brand-dark text-brand-light border border-brand-green/30'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start my-2">
                      <div className="px-4 py-2 rounded-2xl bg-brand-dark text-brand-green border border-brand-green/30 animate-pulse">Thinking…</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                {error && <div className="text-red-400 text-sm text-center mt-2">{error}</div>}
                <form className="flex gap-2 mt-2" onSubmit={handleChatSubmit} autoComplete="off">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask about food prices, e.g. Where is the best place to buy rice in Lagos this week?"
                    className="flex-1 rounded-l-xl px-4 py-3 text-brand-dark bg-white/90 focus:outline-none focus:ring-2 focus:ring-brand-green text-lg shadow"
                    style={{ minWidth: 0 }}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="rounded-r-xl px-6 py-3 bg-brand-green text-white font-bold text-lg shadow hover:bg-emerald-600 transition disabled:opacity-60"
                    disabled={loading || !input.trim()}
                  >
                    {loading ? '...' : 'Send'}
                  </button>
                </form>
              </div>
              <span className="text-xs text-brand-light/60 mt-2">Powered by AI & real market data</span>
            </div>
          </div>
        </section>

        {/* Insights Section */}
        <section id="insights" className="py-20 px-4 bg-gradient-to-br from-black to-[#001F2E]">
          <h2 className="text-3xl font-futuristic text-center text-brand-green mb-10 drop-shadow-lg">Market Data Insights</h2>
          <div className="max-w-5xl mx-auto glassmorphism shadow-2xl">
            <div id="viz" className="w-full aspect-[4/3] min-h-[400px] rounded-2xl overflow-hidden border-2 border-brand-green/30 bg-black/40 flex items-center justify-center"></div>
          </div>
        </section>
      </main>

      <footer className="text-center py-8 bg-black text-brand-light/70 border-t border-brand-green mt-10 shadow-inner">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2">
          <span className="font-futuristic text-brand-green">© {new Date().getFullYear()} ChopWise</span>
          <span className="hidden md:inline">·</span>
          <span>Built for the 3MTT Monthly Knowledge Showcase</span>
        </div>
      </footer>
    </>
  );
}
