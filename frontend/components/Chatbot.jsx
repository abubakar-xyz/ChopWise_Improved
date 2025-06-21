import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { BACKEND_URL } from '../utils/config';

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg = { from: 'user', text: input };
    setMessages(m => [...m, userMsg]);
    setInput('');

    const isPredict = /predict|forecast|future/i.test(input);
    const url = isPredict ? `${BACKEND_URL}/predict` : `${BACKEND_URL}/chat`;

    try {
      const res = await axios.post(url, { message: input });
      setMessages(m => [...m, { from: 'bot', text: res.data.reply }]);
    } catch {
      setMessages(m => [...m, { from: 'bot', text: '⚠️ Service unavailable.' }]);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg flex flex-col">
      {/* Chat Header */}
      <div className="bg-teal-700 text-white text-lg font-semibold p-4 rounded-t-xl">
        ChopWise Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  m.from === 'user'
                    ? 'bg-teal-100 text-teal-900 rounded-br-none'
                    : 'bg-slate-100 text-slate-900 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 flex">
        <input
          className="flex-grow border border-slate-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          value={input}
          placeholder="E.g. “price of garri in Kano” or “help”"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-teal-600 text-white px-4 py-2 rounded-r-lg hover:bg-teal-700"
        >
          Send
        </button>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 p-2">
        Powered by ChopWise
      </div>
    </div>
  );
}
