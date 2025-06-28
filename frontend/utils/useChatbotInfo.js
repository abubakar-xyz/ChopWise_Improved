import { useEffect, useState } from 'react';
import { BACKEND_URL } from './config';

export default function useChatbotInfo() {
  const [info, setInfo] = useState({ foods: [], states: [], lgas: [], outlets: [], date_range: { start: '', end: '' } });
  useEffect(() => {
    fetch(`${BACKEND_URL}/info`).then(r => r.json()).then(setInfo).catch(() => {});
  }, []);
  return info;
}
