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
        <section className="hero">
          <div className="container">
            <h1 className="heading-1 mb-4">Know what to buy. Know when to buy. Eat better every day.</h1>
            <p className="text-lg text-brand-brown/90 mb-8 max-w-2xl mx-auto">Get real-time food prices across Nigeria. Plan smarter, shop with confidence, and stretch your budget without sacrificing nutrition.</p>
            <a href="#chat" className="btn text-xl mt-6" style={{ minWidth: 220 }} onClick={e => { e.preventDefault(); const chatSection = document.getElementById('chat'); if (chatSection) chatSection.scrollIntoView({ behavior: 'smooth' }); }}>Find Your Best Price</a>
          </div>
        </section>

        {/* Help/Instructions Section */}
        <section className="py-12 px-4 bg-gradient-to-br from-brand-tan/80 to-brand-brown/10 flex flex-col items-center">
          <div className="max-w-3xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-3xl bg-white/80 shadow-xl p-6 flex flex-col gap-4 items-start border border-brand-brown/10">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-brown/90 text-brand-tan text-2xl shadow-lg">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="font-bold text-lg text-brand-brown">Quick Start</span>
              </div>
              <ul className="list-none space-y-2 text-brand-brown/90 text-base">
                <li className="flex items-center gap-2"><span className="inline-block w-6 h-6 text-brand-green"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#7C4F2A" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="#7C4F2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Ask for the price of any food item, e.g. <span className="font-semibold">"price of rice in Lagos"</span> or <span className="font-semibold">"maize in Kano"</span>.</li>
                <li className="flex items-center gap-2"><span className="inline-block w-6 h-6 text-brand-green"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="8" stroke="#7C4F2A" strokeWidth="2"/><path d="M8 12h8" stroke="#7C4F2A" strokeWidth="2" strokeLinecap="round"/></svg></span>Type a general food name (like <span className="font-semibold">"rice"</span> or <span className="font-semibold">"maize"</span>) to see all available variants and their prices.</li>
                <li className="flex items-center gap-2"><span className="inline-block w-6 h-6 text-brand-green"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 0v10l6 4" stroke="#7C4F2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Find the <span className="font-semibold">cheapest LGA or outlet</span> for any food in any state.</li>
                <li className="flex items-center gap-2"><span className="inline-block w-6 h-6 text-brand-green"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9V7a5 5 0 0 1 10 0v2" stroke="#7C4F2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Get <span className="font-semibold">price trends and forecasts</span> for the future.</li>
                <li className="flex items-center gap-2"><span className="inline-block w-6 h-6 text-brand-green"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M3 12h18M12 3v18" stroke="#7C4F2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Ask about <span className="font-semibold">outlet types</span> (e.g. market, shop) or <span className="font-semibold">LGA</span> for more precise info.</li>
                <li className="flex items-center gap-2"><span className="inline-block w-6 h-6 text-brand-green"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#7C4F2A" strokeWidth="2"/><path d="M12 8v4l3 3" stroke="#7C4F2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Type <span className="font-semibold">help</span> at any time for more tips.</li>
              </ul>
            </div>
            <div className="rounded-3xl bg-brand-brown/90 shadow-xl p-6 flex flex-col gap-4 items-start border border-tan/10 text-brand-tan">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-tan/90 text-brand-brown text-2xl shadow-lg">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 0v10l6 4" stroke="#7C4F2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="font-bold text-lg text-brand-tan">Coverage & Data</span>
              </div>
              <ul className="list-none space-y-2 text-brand-tan/90 text-base">
                <li className="flex items-center gap-2"><span className="inline-block w-6 h-6 text-brand-tan"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#E9D8C3" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="#E9D8C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Data covers all major <span className="font-semibold">states, LGAs, and outlet types</span> in Nigeria.</li>
                <li className="flex items-center gap-2"><span className="inline-block w-6 h-6 text-brand-tan"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="8" stroke="#E9D8C3" strokeWidth="2"/><path d="M8 12h8" stroke="#E9D8C3" strokeWidth="2" strokeLinecap="round"/></svg></span>Powered by real market data from the <span className="font-semibold">NBS</span>.</li>
                <li className="flex items-center gap-2"><span className="inline-block w-6 h-6 text-brand-tan"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 0v10l6 4" stroke="#E9D8C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Latest data update: <span className="font-semibold">June 2025</span></li>
              </ul>
              <div className="flex items-center gap-2 mt-4">
                <img src="/logo.jpg" alt="ChopWise logo" className="h-10 w-10 rounded-full border-2 border-brand-tan shadow" />
                <span className="font-futuristic text-xl font-bold tracking-widest text-brand-tan">ChopWise</span>
              </div>
            </div>
          </div>
        </section>

        {/* Chat Section */}
        <section id="chat" ref={chatSectionRef} className="bg-brand-brown text-brand-tan py-20 px-4">
          <div className="max-w-4xl mx-auto glassmorphism shadow-2xl">
            <h2 className="heading-2 text-center mb-8 drop-shadow-lg animate-fade-in">Chat with ChopWise</h2>
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
                    <div className="text-brand-tan/60 text-center">
                      Ask me anything about food prices—like:
                      <ul className="how-to-list mt-2">
                        <li>• What’s the price of rice in Lagos?</li>
                        <li>• Where is maize cheapest in Kano?</li>
                        <li>• How much will beans cost next week in Enugu?</li>
                      </ul>
                    </div>
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

      <footer className="text-center py-8 bg-brand-brown text-brand-tan/70 border-t border-brand-tan mt-10 shadow-inner">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2">
          <span className="font-futuristic text-brand-tan">© {new Date().getFullYear()} ChopWise</span>
          <span className="hidden md:inline">·</span>
          <span>Because good food shouldn’t cost a fortune.</span>
        </div>
      </footer>
    </>
  );
}
