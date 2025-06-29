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
        <section className="hero bg-gradient-to-br from-[#F6E7D7] via-[#E8A46B] to-[#6B4F2B] relative overflow-hidden">
          <div className="container z-10 relative">
            <h1 className="heading-1 mb-4 font-lora text-4xl md:text-5xl lg:text-6xl text-[#6B4F2B] drop-shadow-xl">Know what to buy. Know when to buy. Eat better every day.</h1>
            <p className="text-lg md:text-2xl font-inter text-[#4E342E] mb-8 max-w-2xl mx-auto font-medium drop-shadow-sm">Get real-time food prices across Nigeria. Plan smarter, shop with confidence, and stretch your budget without sacrificing nutrition.</p>
            <a href="#chat" className="btn text-xl mt-6 font-inter shadow-xl" style={{ minWidth: 220 }} onClick={e => { e.preventDefault(); const chatSection = document.getElementById('chat'); if (chatSection) chatSection.scrollIntoView({ behavior: 'smooth' }); }}>Find Your Best Price</a>
          </div>
          <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-tr from-[#E8A46B]/30 via-[#F6E7D7]/10 to-[#6B4F2B]/20" />
        </section>

        {/* Help/Instructions Section */}
        <section className="py-16 px-4 bg-gradient-to-br from-[#FFF7ED] via-[#F6E7D7] to-[#E8A46B]/20 flex flex-col items-center">
          <div className="max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Quick Start Card */}
            <div className="rounded-3xl bg-white/90 shadow-2xl p-8 flex flex-col gap-6 border border-[#E8A46B]/30">
              <div className="flex items-center gap-4 mb-2">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E8A46B] text-[#6B4F2B] text-3xl shadow-lg">
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="font-lora font-bold text-2xl text-[#6B4F2B] tracking-tight">Quick Start</span>
              </div>
              <ul className="space-y-5 text-[#4E342E] text-lg font-inter">
                <li className="flex items-start gap-3"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E8A46B]/30 text-[#6B4F2B] text-xl"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#E8A46B" strokeWidth="2.5"/><path d="M8 12l2 2 4-4" stroke="#6B4F2B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Ask me anything about food prices—like:<ul className="ml-4 mt-1 space-y-1 text-base font-normal"><li>“What’s the price of <span className='font-semibold'>rice in Lagos</span>?”</li><li>“Where is <span className='font-semibold'>maize cheapest in Kano</span>?”</li><li>“How much will <span className='font-semibold'>beans cost next week in Enugu</span>?”</li></ul></li>
                <li className="flex items-center gap-3"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E8A46B]/30 text-[#6B4F2B] text-xl"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="8" stroke="#E8A46B" strokeWidth="2.5"/><path d="M8 12h8" stroke="#6B4F2B" strokeWidth="2.5" strokeLinecap="round"/></svg></span>Type a general food name (like <span className="font-semibold">“rice”</span> or <span className="font-semibold">“maize”</span>) to see all available variants and their prices.</li>
                <li className="flex items-center gap-3"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E8A46B]/30 text-[#6B4F2B] text-xl"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 0v10l6 4" stroke="#E8A46B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Find the <span className="font-semibold">cheapest LGA or outlet</span> for any food in any state.</li>
                <li className="flex items-center gap-3"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E8A46B]/30 text-[#6B4F2B] text-xl"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9V7a5 5 0 0 1 10 0v2" stroke="#E8A46B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Get <span className="font-semibold">price trends and forecasts</span> for the future.</li>
                <li className="flex items-center gap-3"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E8A46B]/30 text-[#6B4F2B] text-xl"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M3 12h18M12 3v18" stroke="#E8A46B" strokeWidth="2.5" strokeLinecap="round"/></svg></span>Ask about <span className="font-semibold">outlet types</span> (e.g. market, shop) or <span className="font-semibold">LGA</span> for more precise info.</li>
                <li className="flex items-center gap-3"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E8A46B]/30 text-[#6B4F2B] text-xl"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#E8A46B" strokeWidth="2.5"/><path d="M12 8v4l3 3" stroke="#6B4F2B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Type <span className="font-semibold">help</span> at any time for more tips.</li>
              </ul>
            </div>
            {/* Coverage & Data Card */}
            <div className="rounded-3xl bg-[#6B4F2B]/95 shadow-2xl p-8 flex flex-col gap-6 border border-[#E8A46B]/20 text-[#FFF7ED]">
              <div className="flex items-center gap-4 mb-2">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E8A46B] text-[#6B4F2B] text-3xl shadow-lg">
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 0v10l6 4" stroke="#6B4F2B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="font-lora font-bold text-2xl text-[#FFF7ED] tracking-tight">Coverage & Data</span>
              </div>
              <ul className="space-y-5 text-[#FFF7ED] text-lg font-inter">
                <li className="flex items-center gap-3"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FFF7ED]/20 text-[#E8A46B] text-xl"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#E8A46B" strokeWidth="2.5"/><path d="M8 12l2 2 4-4" stroke="#E8A46B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Data covers all major <span className="font-semibold">states, LGAs, and outlet types</span> in Nigeria.</li>
                <li className="flex items-center gap-3"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FFF7ED]/20 text-[#E8A46B] text-xl"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="8" stroke="#E8A46B" strokeWidth="2.5"/><path d="M8 12h8" stroke="#E8A46B" strokeWidth="2.5" strokeLinecap="round"/></svg></span>Powered by real market data from the <span className="font-semibold">NBS</span>.</li>
                <li className="flex items-center gap-3"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FFF7ED]/20 text-[#E8A46B] text-xl"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 0v10l6 4" stroke="#E8A46B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>Latest data update: <span className="font-semibold">June 2025</span></li>
              </ul>
              <div className="flex items-center gap-3 mt-4">
                <img src="/logo.jpg" alt="ChopWise logo" className="h-12 w-12 rounded-full border-2 border-[#E8A46B] shadow" />
                <span className="font-lora text-2xl font-bold tracking-widest text-[#FFF7ED]">ChopWise</span>
              </div>
            </div>
          </div>
        </section>

        {/* Chatbot Section */}
        <section id="chat" className="py-16 px-4 bg-gradient-to-br from-[#FFF7ED] via-[#F6E7D7] to-[#E8A46B]/20 flex flex-col items-center" ref={chatSectionRef}>
          <div className="max-w-3xl w-full mx-auto bg-white/90 rounded-3xl shadow-2xl p-8 border border-[#E8A46B]/30">
            <div className="flex flex-col h-full">
              {/* Messages List */}
              <div className="flex-1 overflow-y-auto pr-3 mb-4">
                {messages.length === 0 && (
                  <p className="text-center text-[#4E342E] font-inter text-lg py-8">Ask me anything about food prices in Nigeria!</p>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block px-4 py-2 rounded-3xl max-w-xs ${msg.role === 'user' ? 'bg-[#E8A46B] text-[#6B4F2B]' : 'bg-[#6B4F2B] text-[#FFF7ED]'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-center mb-4">
                    <div className="loader" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* User Input Form */}
              <form onSubmit={handleChatSubmit} className="flex gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 px-4 py-2 text-lg rounded-3xl border border-[#E8A46B] focus:outline-none focus:ring-2 focus:ring-brand-tan transition"
                />
                <button
                  type="submit"
                  className="px-6 py-2 text-lg font-semibold rounded-3xl bg-[#6B4F2B] text-[#FFF7ED] shadow-md hover:bg-[#E8A46B] hover:text-[#6B4F2B] transition flex items-center gap-2"
                >
                  {loading ? (
                    <>Sending... <div className="loader-small" /></>
                  ) : (
                    <>Send <FaRobot className="text-xl" /></>
                  )}
                </button>
              </form>
              {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
            </div>
          </div>
        </section>

        {/* Insights Section (Tableau Embed) */}
        <section id="insights" className="py-16 px-4 bg-gradient-to-br from-[#FFF7ED] via-[#F6E7D7] to-[#E8A46B]/20 flex flex-col items-center">
          <div className="max-w-6xl w-full mx-auto">
            <div className="rounded-3xl bg-white/90 shadow-2xl p-8 border border-[#E8A46B]/30">
              <h2 className="text-3xl md:text-4xl font-lora text-[#6B4F2B] tracking-tight mb-6 text-center">Insights & Trends</h2>
              <div id="viz" className="w-full h-96 md:h-[600px] lg:h-[700px] xl:h-[800px] 2xl:h-[900px] mx-auto mb-8" />
              <div className="flex flex-col md:flex-row gap-4">
                <a href="#chat" className="btn text-lg font-semibold shadow-md bg-[#6B4F2B] text-[#FFF7ED] rounded-3xl px-6 py-3 hover:bg-[#E8A46B] hover:text-[#6B4F2B] transition flex items-center justify-center gap-2">
                  <FaUtensils className="text-xl" />
                  Get Food Prices Now
                </a>
                <a href="https://public.tableau.com/views/ChopWiseInsights/Dashboard1?:language=en-US&:display_count=n&:origin=viz_share_link" target="_blank" rel="noopener noreferrer" className="btn text-lg font-semibold shadow-md bg-[#E8A46B] text-[#6B4F2B] rounded-3xl px-6 py-3 hover:bg-[#6B4F2B] hover:text-[#E8A46B] transition flex items-center justify-center gap-2">
                  <FaInfoCircle className="text-xl" />
                  View Detailed Insights
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-4 bg-[#6B4F2B] text-[#FFF7ED] text-center">
        <div className="container mx-auto">
          <p className="text-sm md:text-base">&copy; {new Date().getFullYear()} ChopWise. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="text-[#E8A46B] hover:text-[#FFF7ED] transition">Privacy Policy</a>
            <a href="#" className="text-[#E8A46B] hover:text-[#FFF7ED] transition">Terms of Service</a>
          </div>
        </div>
      </footer>
    </>
  );
}
