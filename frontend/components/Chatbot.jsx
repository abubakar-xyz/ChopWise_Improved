import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Determine endpoint
    let url = `${BACKEND_URL}/chat`;
    if (/predict|forecast|future/i.test(input)) url = `${BACKEND_URL}/predict`;
    try {
      const res = await axios.post(url, { message: input });
      setMessages(prev => [...prev, { from: 'bot', text: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: '⚠️ Service unavailable.' }]);
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-4 shadow rounded">
      <div className="h-80 overflow-y-auto mb-4">
        {messages.map((m, i) => (
          <div key={i} className={m.from === 'user' ? 'text-right' : 'text-left'}>
            <span className={m.from === 'user' ? 'inline-block bg-green-100 p-2 rounded' : 'inline-block bg-gray-100 p-2 rounded'}>
              {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex">
        <input
          className="flex-grow border p-2 rounded-l"
          value={input}
          placeholder="Type your question, e.g. price of maize in Kano"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4 rounded-r">Send</button>
      </div>
    </div>
  );
}