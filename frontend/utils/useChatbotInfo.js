import { useEffect, useState } from 'react';
import config from './config';

export default function useChatbotInfo() {
  const [info, setInfo] = useState({ foods: [], states: [], lgas: [], outlets: [], date_range: { start: '', end: '' } });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    fetch(`${config.NEXT_PUBLIC_BACKEND_URL}/info`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setInfo)
      .catch(() => {})
      .finally(() => { try { clearTimeout(timer); } catch {} });
    return () => {
      try { controller.abort(); } catch {}
      try { clearTimeout(timer); } catch {}
    };
  }, []);
  return info;
}
