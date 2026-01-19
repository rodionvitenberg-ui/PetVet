import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from '@/types/chat';

interface UseChatWebSocketProps {
  roomId: number | null;
  token: string | null;
  onNewMessage?: (msg: ChatMessage) => void;
}

export const useChatWebSocket = ({ roomId, token, onNewMessage }: UseChatWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Локальный стейт сообщений
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const onNewMessageRef = useRef(onNewMessage);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  // Очистка при смене комнаты
  useEffect(() => {
      setMessages([]);
  }, [roomId]);

  const connect = useCallback(() => {
    if (!roomId || !token) return;

    if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
        socketRef.current.close();
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_HOST || '127.0.0.1:8000';
    const wsUrl = `${protocol}//${host}/ws/chat/${roomId}/?token=${token}`;

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
            attachment: data.attachment, // Принимаем вложение
            created_at: data.created_at,
            is_read: false
        };
        
        setMessages((prev) => [...prev, message]);

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
      if (event.code !== 1000) { 
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error('WS Error', err);
      setError('WebSocket error');
    };

    socketRef.current = ws;
  
  }, [roomId, token]); 

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Поддержка вложений
  const sendMessage = (text: string, attachmentId?: number | string | null) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ 
          message: text,
          attachment_id: attachmentId 
      }));
    } else {
      console.warn('WS not connected');
    }
  };

  return { isConnected, error, sendMessage, messages, setMessages };
};