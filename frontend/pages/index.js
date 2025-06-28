import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BACKEND_URL } from '../utils/config';
import useChatbotInfo from '../utils/useChatbotInfo';

export default function Home() {
  // Chatbot state
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // {role: 'user'|'bot', text: string}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);
  const chatSectionRef = useRef(null); // NEW: ref for chat section
  const info = useChatbotInfo();

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

      <header className="fixed w-full top-0 bg-gradient-to-br from-brand-brown via-[#4E342E] to-brand-tan/80 backdrop-blur-lg z-50 flex justify-between items-center px-6 md:px-16 py-4 border-b border-brand-tan shadow-2xl animate-gradient-x">
        <a href="#" className="flex items-center gap-4 focus:outline-none focus:ring-2 focus:ring-brand-tan">
          <img src="/logo.jpg" className="h-14 w-14 rounded-full border-4 border-brand-tan shadow-xl animate-pulse" alt="ChopWise logo" />
          <span className="text-brand-tan font-futuristic text-3xl tracking-widest drop-shadow-lg">ChopWise</span>
        </a>
        <nav className="hidden md:flex gap-10 text-brand-tan text-lg font-semibold">
          <a href="#chat" className="nav-btn hover:text-brand-brown transition focus:outline-none focus:text-brand-brown">Chat</a>
          <a href="#insights" className="nav-btn hover:text-brand-brown transition focus:outline-none focus:text-brand-brown">Insights</a>
        </nav>
      </header>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="min-h-[80vh] flex flex-col justify-center items-center text-center bg-gradient-to-br from-brand-brown via-[#6D4C41] to-[#4E342E] text-white px-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="w-full h-full bg-gradient-to-tr from-brand-tan/10 via-transparent to-brand-tan/10 animate-pulse" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="relative z-10 text-5xl md:text-7xl font-extrabold font-futuristic text-brand-tan drop-shadow-2xl mb-4"
          >
            Plan Ahead, Eat Well
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 mt-4 max-w-2xl text-xl md:text-2xl text-brand-tan/90 mb-8"
          >
            Track daily essential food items across Nigeria. Discover the best places and times to buy, get price forecasts, and plan ahead with confidence—so you and your family can eat better, every day.
          </motion.p>
          <motion.button
            type="button"
            whileHover={{ scale: 1.09, boxShadow: '0 0 24px 6px #FFD700, 0 0 60px 10px #7C4F2A' }}
            whileTap={{ scale: 0.97 }}
            className="relative z-10 mt-6 btn-primary-glow text-lg shadow-xl focus:outline-none focus:ring-4 focus:ring-brand-tan/60 animate-bounce"
            onClick={() => {
              if (chatSectionRef.current) chatSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            aria-label="Scroll to chatbot section"
          >
            <span className="relative z-20">Start Exploring</span>
            <span className="absolute inset-0 z-10 rounded-xl pointer-events-none animate-glow-gradient" />
          </motion.button>
        </section>

        {/* Chat Section */}
        <section id="chat" ref={chatSectionRef} className="bg-brand-brown text-brand-tan py-20 px-4">
          <div className="max-w-4xl mx-auto glassmorphism shadow-2xl">
            <h2 className="text-3xl font-futuristic text-brand-tan text-center mb-8 drop-shadow-lg animate-fade-in">Chat with ChopWise</h2>
            <div className="flex flex-col items-center justify-center gap-4 bg-accent-deep rounded-2xl p-8 text-center text-brand-tan/80 shadow-lg border-2 border-brand-tan/30 animate-fade-in-up">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-tan/20 border-2 border-brand-tan mb-2 animate-pulse">
                <img src="/logo.jpg" alt="ChopWise logo" className="h-10 w-10 rounded-full" />
              </span>
              {/* Data source label - static and prominent */}
              <div className="w-full text-center mb-2">
                <span className="inline-block bg-brand-tan/20 text-brand-brown font-bold px-4 py-2 rounded-lg text-sm border border-brand-tan/40 shadow">Data source: Nigerian Food Price Tracking Dataset (NBS)</span>
              </div>
              <div className="w-full max-w-xl mx-auto flex flex-col gap-2 mb-4">
                <div className="h-64 overflow-y-auto bg-black/10 rounded-xl p-4 border border-brand-tan/20 shadow-inner" style={{ minHeight: 180 }}>
                  {messages.length === 0 && (
                    <div className="text-brand-tan/60 text-center">Ask about daily essential food prices, trends, or where and when to buy. E.g. <span className="italic">Where can I get the best deal on beans in Abuja this week?</span></div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`my-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-left whitespace-pre-line ${msg.role === 'user' ? 'bg-brand-tan text-black font-semibold' : 'bg-brand-brown text-brand-tan border border-brand-tan/30'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start my-2">
                      <div className="px-4 py-2 rounded-2xl bg-brand-brown text-brand-tan border border-brand-tan/30 animate-pulse">Thinking…</div>
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
                    placeholder="Ask about daily essentials, e.g. Where is rice cheapest this month?"
                    className="flex-1 rounded-l-xl px-4 py-3 text-brand-brown bg-white/90 focus:outline-none focus:ring-2 focus:ring-brand-tan text-lg shadow"
                    style={{ minWidth: 0 }}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="rounded-r-xl px-6 py-3 bg-brand-tan text-brand-brown font-bold text-lg shadow hover:bg-[#E0C097] transition disabled:opacity-60"
                    disabled={loading || !input.trim()}
                  >
                    {loading ? '...' : 'Send'}
                  </button>
                </form>
              </div>
              {/* Help/Instructions Section */}
              <div className="w-full max-w-xl mx-auto mt-6 p-4 rounded-xl bg-brand-tan/10 border border-brand-tan/20 text-left text-sm text-brand-tan/90 shadow animate-fade-in-up">
                <h3 className="font-bold text-brand-tan mb-2">How to use ChopWise</h3>
                <ul className="list-disc pl-5 mb-2">
                  <li>Ask about the price of any daily essential food in any Nigerian state. E.g. <span className="italic">Price of maize in Lagos</span></li>
                  <li>Get price forecasts: <span className="italic">Predict price of beans in Abuja 3 months</span></li>
                  <li>Find the cheapest states, LGAs, or outlets: <span className="italic">Where is rice cheapest?</span></li>
                  <li>Type <span className="font-mono">help</span> for more tips.</li>
                </ul>
                <div className="mb-2">
                  <span className="font-bold">Available food items:</span> <span className="italic">{info.foods && info.foods.length > 0 ? info.foods.join(', ') : 'Loading...'}</span>
                </div>
                <div className="mb-1">
                  <span className="font-bold">Data coverage:</span> <span className="italic">{info.date_range && info.date_range.start ? `${info.date_range.start} – ${info.date_range.end}` : 'Loading...'}</span>
                </div>
                <div className="mb-2">
                  <span className="font-bold">You can also ask:</span>
                  <ul className="list-disc pl-5 mt-1">
                    <li>"Cheapest LGA for {info.foods[0] || 'beans'} in {info.states[0] || 'Lagos'}"</li>
                    <li>"Best outlet for {info.foods[1] || 'rice'} in {info.states[1] || 'Abuja'}"</li>
                    <li>"Trend for {info.foods[2] || 'yam'} in {info.lgas[0] || 'Potiskum'}"</li>
                    <li>"Price of {info.foods[3] || 'garri'} at {info.outlets[0] || 'Market'} in {info.states[2] || 'Kano'}"</li>
                  </ul>
                </div>
                <div className="text-xs text-brand-tan/70">Powered by AI & real market data. For best results, be specific about food, state, LGA, outlet, and time.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Insights Section */}
        <section id="insights" className="py-20 px-4 bg-gradient-to-br from-brand-brown to-[#4E342E]">
          <h2 className="text-3xl font-futuristic text-center text-brand-tan mb-10 drop-shadow-lg">Market Data Insights</h2>
          <div className="max-w-5xl mx-auto glassmorphism shadow-2xl">
            <div id="viz" className="w-full aspect-[4/3] min-h-[400px] rounded-2xl overflow-hidden border-2 border-brand-tan/30 bg-black/40 flex items-center justify-center"></div>
          </div>
        </section>
      </main>

      <footer className="text-center py-8 bg-brand-brown text-brand-tan/70 border-t border-brand-tan mt-10 shadow-inner">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2">
          <span className="font-futuristic text-brand-tan">© {new Date().getFullYear()} ChopWise</span>
          <span className="hidden md:inline">·</span>
          <span>Plan ahead, eat well, and save more every day</span>
        </div>
      </footer>
    </>
  );
}
