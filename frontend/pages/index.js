import Head from 'next/head';
import { useRef, useEffect, useState } from 'react';
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
  const chatSectionRef = useRef(null);
  const insightsSectionRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to top on initial load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

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

  // Scroll to section with offset for fixed header, using scrollIntoView for accessibility
  const scrollToSection = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Chatbot submit handler
  async function handleChatSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
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
      // Keep focus in the input after sending
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
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
          <button className="nav-btn hover:text-brand-brown transition focus:outline-none focus:text-brand-brown" onClick={() => scrollToSection(chatSectionRef)} aria-label="Go to Chatbot">Chat</button>
          <button className="nav-btn hover:text-brand-brown transition focus:outline-none focus:text-brand-brown" onClick={() => scrollToSection(insightsSectionRef)} aria-label="Go to Insights">Insights</button>
        </nav>
      </header>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="hero bg-gradient-to-br from-[#F6E7D7] via-[#E8A46B] to-[#6B4F2B] relative overflow-hidden">
          <div className="container z-10 relative">
            <h1 className="heading-1 mb-4 font-lora text-4xl md:text-5xl lg:text-6xl text-[#6B4F2B] drop-shadow-xl">Know what to buy. Know when to buy. Eat better every day.</h1>
            <p className="text-lg md:text-2xl font-inter text-[#4E342E] mb-8 max-w-2xl mx-auto font-medium drop-shadow-sm">Real-time food prices across Nigeria—so you plan smarter and save without skimping on nutrition.</p>
            <button className="btn text-xl mt-6 font-inter shadow-xl" style={{ minWidth: 220 }} onClick={() => scrollToSection(chatSectionRef)} aria-label="Open chat">Find Your Best Price</button>
          </div>
          <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-tr from-[#E8A46B]/30 via-[#F6E7D7]/10 to-[#6B4F2B]/20" />
        </section>

        {/* Quick Start / Help Section */}
        <section className="py-12 px-4 bg-gradient-to-br from-[#FFF7ED] via-[#F6E7D7] to-[#E8A46B]/20 flex flex-col items-center" id="quickstart">
          <div className="max-w-3xl w-full mx-auto grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
            <div className="rounded-3xl bg-white/95 shadow-xl p-6 flex flex-col gap-4 border border-[#E8A46B]/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#E8A46B] text-[#6B4F2B] text-2xl shadow-lg">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="font-lora font-bold text-xl text-[#6B4F2B] tracking-tight">Quick Start</span>
              </div>
              <ul className="how-to-list space-y-4 text-[#4E342E] text-base font-inter">
                <li className="flex items-start gap-3"><span className="icon-tip">💬</span><span>Ask about food prices:<br className="md:hidden" /><span className="block ml-7 mt-1 text-sm font-normal">“What’s the price of <b>rice in Lagos</b>?”</span></span></li>
                <li className="flex items-start gap-3"><span className="icon-tip">📊</span><span>See all variants:<br className="md:hidden" /><span className="block ml-7 mt-1 text-sm font-normal">Type <b>“rice”</b> or <b>“maize”</b> to see all available types and prices.</span></span></li>
                <li className="flex items-start gap-3"><span className="icon-tip">📍</span><span>Find the cheapest LGA or outlet:<br className="md:hidden" /><span className="block ml-7 mt-1 text-sm font-normal">“Where is <b>maize</b> cheapest in Kano?”</span></span></li>
                <li className="flex items-start gap-3"><span className="icon-tip">📈</span><span>Get price trends & forecasts:<br className="md:hidden" /><span className="block ml-7 mt-1 text-sm font-normal">“How much will <b>beans</b> cost next week in Enugu?”</span></span></li>
                <li className="flex items-start gap-3"><span className="icon-tip">🛒</span><span>Ask about outlet types or LGA:<br className="md:hidden" /><span className="block ml-7 mt-1 text-sm font-normal">“Show <b>market</b> prices for <b>yam</b> in Ibadan.”</span></span></li>
                <li className="flex items-start gap-3"><span className="icon-tip">❓</span><span>Type <b>help</b> at any time for more tips.</span></li>
              </ul>
            </div>
            <div className="rounded-3xl bg-[#6B4F2B]/95 shadow-xl p-6 flex flex-col gap-4 border border-[#E8A46L]/20 text-[#FFF7ED]">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#E8A46B] text-[#6B4F2B] text-2xl shadow-lg">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 0v10l6 4" stroke="#6B4F2B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="font-lora font-bold text-xl text-[#FFF7ED] tracking-tight">Coverage & Data</span>
              </div>
              <ul className="space-y-4 text-[#FFF7ED] text-base font-inter">
                <li className="flex items-start gap-3"><span className="icon-tip">🌍</span><span>Data covers all major <b>states, LGAs, and outlet types</b> in Nigeria.</span></li>
                <li className="flex items-start gap-3"><span className="icon-tip">📑</span><span>Powered by real market data from the <b>NBS</b>.</span></li>
                <li className="flex items-start gap-3"><span className="icon-tip">🗓️</span><span>Latest data update: <b>June 2025</b></span></li>
              </ul>
              <div className="flex items-center gap-3 mt-4">
                <img src="/logo.jpg" alt="ChopWise logo" className="h-10 w-10 rounded-full border-2 border-[#E8A46B] shadow" />
                <span className="font-lora text-xl font-bold tracking-widest text-[#FFF7ED]">ChopWise</span>
              </div>
            </div>
          </div>
        </section>

        {/* Chatbot Section */}
        <section id="chat" ref={chatSectionRef} className="py-16 px-4 bg-gradient-to-br from-[#FFF7ED] via-[#F6E7D7] to-[#E8A46B]/20 flex flex-col items-center">
          <div className="max-w-3xl w-full mx-auto bg-white/90 rounded-3xl shadow-2xl p-8 border border-[#E8A46B]/30">
            <div className="flex flex-col h-full">
              <div className="mb-6 text-center text-[#6B4F2B] font-lora text-lg md:text-xl bg-[#FFF7ED]/80 rounded-2xl px-4 py-3 shadow-sm">
                <FaInfoCircle className="inline mr-2 text-[#E8A46B] text-xl align-text-bottom" />
                <span>For best results, check the <a href="#quickstart" className="underline hover:text-[#E8A46B] transition">Quick Start</a> section above before chatting!</span>
              </div>
              {/* Messages List */}
              <div className="flex-1 overflow-y-auto pr-3 mb-4" role="log" aria-live="polite" aria-label="Chat messages">
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
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 px-4 py-2 text-lg rounded-3xl border border-[#E8A46B] focus:outline-none focus:ring-2 focus:ring-brand-tan transition"
                  aria-label="Type your message to the chatbot"
                />
                <button
                  type="submit"
                  className="px-6 py-2 text-lg font-semibold rounded-3xl bg-[#6B4F2B] text-[#FFF7ED] shadow-md hover:bg-[#E8A46B] hover:text-[#6B4F2B] transition flex items-center gap-2"
                  aria-label="Send message"
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

        {/* Insights Section */}
        <section id="insights" ref={insightsSectionRef} className="py-16 px-4 bg-gradient-to-br from-[#FFF7ED] via-[#F6E7D7] to-[#E8A46B]/20 flex flex-col items-center">
          <div className="max-w-6xl w-full mx-auto">
            <div className="rounded-3xl bg-white/90 shadow-2xl p-8 border border-[#E8A46L]/30">
              <h2 className="font-lora text-3xl font-bold text-[#6B4F2B] mb-6 text-center">Insights &amp; Trends</h2>
              <div id="viz" className="w-full aspect-[4/3] min-h-[400px] rounded-2xl overflow-hidden border-2 border-[#E8A46L]/30 bg-black/10 flex items-center justify-center"></div>
            </div>
          </div>
        </section>
      </main>

      {/* Creative Footer */}
      <footer className="w-full bg-gradient-to-br from-[#FFF7ED] via-[#E8A46B] to-[#6B4F2B] py-10 px-4 flex flex-col items-center justify-center relative overflow-hidden mt-16">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-center z-10">
          <span className="flex items-center gap-2 text-lg md:text-xl font-lora text-[#6B4F2B] font-semibold animate-pulse">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E8A46B]/80 shadow-lg animate-bounce" aria-label="Crafted with passion">
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </span>
            Crafted with passion by
            <a href="https://www.linkedin.com/in/abubakar-abdulfatah/" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#E8A46B] transition font-bold">Abubakar Abdulfatah</a>
            <span className="hidden md:inline">·</span>
            <span className="inline-flex items-center gap-1">
              <a href="https://github.com/abubakar-xyz" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile" className="ml-1 hover:text-[#E8A46B]">
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85.004 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"/></svg>
              </a>
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 mt-4 text-base md:text-lg text-[#4E342E] font-inter">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#E8A46B]/80 shadow animate-spin-slow" aria-label="GitHub Copilot">
            <svg width="20" height="20" fill="none" viewBox="0 0 32 32" aria-label="GitHub Copilot logo"><circle cx="16" cy="16" r="16" fill="#24292F"/><path d="M10.5 16a5.5 5.5 0 1 1 11 0v2.5a2.5 2.5 0 0 1-5 0v-2.5a.5.5 0 0 0-1 0v2.5a2.5 2.5 0 0 1-5 0V16z" fill="#A5D6F9"/><circle cx="12.5" cy="16.5" r="1.5" fill="#fff"/><circle cx="19.5" cy="16.5" r="1.5" fill="#fff"/></svg>
          </span>
          <span className="ml-1">Made possible in record time with the assistance of <span className="font-bold" title="GitHub Copilot: AI pair programmer">GitHub Copilot</span>.</span>
        </div>
        <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-tr from-[#E8A46B]/20 via-[#F6E7D7]/10 to-[#6B4F2B]/10" />
      </footer>

      {/* Rotating Footer Message Component */}
      <style jsx>{`
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 1s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
    </>
  );
}

// RotatingFooterMessage component
function RotatingFooterMessage() {
  const messages = [
    "Keep learning, keep building.",
    "Great things are built with great tools.",
    "Empowering Nigeria, one meal at a time.",
    "Open source makes the world go round.",
    "Eat well, live well, code well!"
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setIdx(i => (i + 1) % messages.length), 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="mt-4 text-[#FFF7ED]/70 text-base font-inter text-center w-full block min-h-[1.5em] transition-all" aria-live="polite">
      {messages[idx]}
    </span>
  );
}
