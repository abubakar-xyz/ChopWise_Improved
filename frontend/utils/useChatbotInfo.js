import { useEffect, useState } from 'react';
import config from './config';

export default function useChatbotInfo() {
  const [info, setInfo] = useState({ foods: [], states: [], lgas: [], outlets: [], date_range: { start: '', end: '' } });
  useEffect(() => {
    fetch(`${config.NEXT_PUBLIC_BACKEND_URL}/info`).then(r => r.json()).then(setInfo).catch(() => {});
  }, []);
  return info;
}
