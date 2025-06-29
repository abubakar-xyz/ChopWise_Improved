import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BACKEND_URL } from '../utils/config';
import useChatbotInfo from '../utils/useChatbotInfo';
import { FaUtensils, FaMapMarkerAlt, FaRobot, FaInfoCircle } from 'react-icons/fa';

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

        {/* Help/Instructions Section */}
        <section className="max-w-4xl mx-auto soft-card mb-12 mt-[-3rem] z-20 relative shadow-xl border-2 border-yellow-400/30">
          <h2 className="text-3xl md:text-4xl font-futuristic text-brand-brown mb-4 flex items-center gap-3"><FaInfoCircle className="text-yellow-400 text-2xl" /> How to Use ChopWise</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-brand-brown mb-2 flex items-center gap-2"><FaRobot className="text-brand-green" /> Example Prompts</h3>
              <ul className="space-y-2 text-lg text-brand-dark/90">
                <li className="flex items-center gap-2"><FaUtensils className="text-yellow-400" /> "Price of <b>maize white</b> in Lagos"</li>
                <li className="flex items-center gap-2"><FaMapMarkerAlt className="text-brand-green" /> "Cheapest LGA for <b>beans</b> in Kano"</li>
                <li className="flex items-center gap-2"><FaRobot className="text-brand-brown" /> "Forecast price of <b>rice</b> in Abuja 2 months"</li>
                <li className="flex items-center gap-2"><FaUtensils className="text-yellow-400" /> "Best outlet for <b>yam</b> in Ibadan"</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-brand-brown mb-2 flex items-center gap-2"><FaUtensils className="text-yellow-400" /> Available Foods</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {info.foods && info.foods.length > 0 ? info.foods.map((food, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-brand-brown text-sm font-semibold border border-yellow-400/40 shadow-sm"><FaUtensils className="text-brand-green" /> {food}</span>
                )) : <span className="text-brand-brown/60">Loading…</span>}
              </div>
              <div className="mt-2 text-xs text-brand-brown/60">Data covers {info.date_range?.start} to {info.date_range?.end}</div>
            </div>
          </div>
        </section>

        {/* Chat Section */}
        <section id="chat" ref={chatSectionRef} className="bg-brand-brown text-brand-tan py-20 px-4">
          <div className="max-w-4xl mx-auto glassmorphism shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-futuristic text-yellow-400 text-center mb-8 drop-shadow-lg animate-fade-in flex items-center gap-2 justify-center"><FaRobot className="text-yellow-400" /> Chat with ChopWise</h2>
            {/* Help/Instructions Section */}
            <div className="mb-6 p-6 rounded-2xl bg-tan/80 border-2 border-brand-brown/30 shadow-lg animate-fade-in-up">
              <h3 className="text-xl font-bold text-brand-brown mb-2">How to use the chatbot</h3>
              <ul className="list-disc pl-6 text-brand-brown/90 text-base mb-2">
                <li>Ask for the price of any food item, e.g. <b>"price of rice in Lagos"</b> or <b>"maize in Kano"</b>.</li>
                <li>Type a general food name (like <b>"rice"</b> or <b>"maize"</b>) to see all available variants and their prices.</li>
                <li>Find the <b>cheapest LGA or outlet</b> for any food in any state.</li>
                <li>Get <b>price trends</b> and <b>forecasts</b> for the future.</li>
                <li>Ask about <b>outlet types</b> (e.g. market, shop) or <b>LGA</b> for more precise info.</li>
                <li>Type <b>help</b> at any time for more tips.</li>
              </ul>
              <div className="text-sm text-brand-brown/70">Data covers all major states, LGAs, and outlet types in Nigeria. Powered by real market data from the NBS.</div>
            </div>
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

      <footer className="text-center py-8 bg-brand-brown text-yellow-400/80 border-t border-yellow-400 mt-10 shadow-inner font-futuristic text-lg">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2">
          <span className="font-futuristic text-yellow-400 text-xl">© {new Date().getFullYear()} ChopWise</span>
          <span className="hidden md:inline">·</span>
          <span>Plan ahead, eat well, and save more every day</span>
        </div>
      </footer>
    </>
  );
}
