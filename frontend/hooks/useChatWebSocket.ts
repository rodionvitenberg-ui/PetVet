import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from '@/types/chat';

interface UseChatWebSocketProps {
  roomId: number | null;
  token: string | null;
  onNewMessage?: (msg: ChatMessage) => void;
}

export const useChatWebSocket = ({ roomId, token, onNewMessage }: UseChatWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Храним колбек в рефе, чтобы его обновление не триггерило реконнект
  const onNewMessageRef = useRef(onNewMessage);

  // Обновляем реф при каждом рендере
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  const connect = useCallback(() => {
    if (!roomId || !token) return;

    // Очищаем старые таймеры перед новым подключением
    if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
    }

    // Закрываем старый сокет, если он есть
    if (socketRef.current) {
        socketRef.current.close();
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_HOST || '127.0.0.1:8000';
    const wsUrl = `${protocol}//${host}/ws/chat/${roomId}/?token=${token}`;

    console.log('Connecting to WS:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WS Connected');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const message: ChatMessage = {
            id: data.id || Date.now(),
            room: roomId,
            sender: data.sender_id,
            sender_name: data.sender_name,
            text: data.message,
            created_at: data.created_at,
            is_read: false
        };
        
        // Вызываем функцию из рефа - это безопасно и не требует пересоздания сокета
        if (onNewMessageRef.current) {
            onNewMessageRef.current(message);
        }
      } catch (err) {
        console.error('WS Parse Error', err);
      }
    };

    ws.onclose = (event) => {
      console.log('WS Closed', event.code);
      setIsConnected(false);
      // Если закрытие не штатное (не 1000) и мы все еще на той же комнате
      if (event.code !== 1000) { 
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error('WS Error', err);
      setError('WebSocket error');
      // Не закрываем вручную тут, onclose сработает сам
    };

    socketRef.current = ws;
  
  // УБРАЛИ onNewMessage из зависимостей! Теперь реконнект только при смене комнаты или токена.
  }, [roomId, token]); 

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000); // 1000 = Normal Closure
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendMessage = (text: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ message: text }));
    } else {
      console.warn('WS not connected');
    }
  };

  return { isConnected, error, sendMessage };
};