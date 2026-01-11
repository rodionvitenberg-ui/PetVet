'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'; // <--- 1. Импорт роутера
import { useAuth } from '@/components/providers/AuthProvider';
import { addToast } from "@heroui/toast";
import { Button } from "@heroui/react"; // Или твой ui button, или html button

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000';

const getToastColor = (category: string) => {
    switch (category) {
        case 'medical': return 'primary';
        case 'reminder': return 'warning';
        case 'action': return 'danger';
        case 'system': default: return 'default';
    }
};

export default function NotificationListener() {
    const { isAuth } = useAuth();
    const router = useRouter(); // <--- 2. Инициализация
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!isAuth) return;

        const socketUrl = `${WS_URL}/ws/notifications/`;
        const socket = new WebSocket(socketUrl);
        socketRef.current = socket;

        socket.onopen = () => console.log("✅ WS Connected");

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // 3. Формируем контент тоаста
                addToast({
                    title: data.title,
                    // В description можно передать JSX!
                    description: (
                        <div className="flex flex-col gap-2">
                            <p>{data.message}</p>
                            {data.link && (
                                <button
                                    onClick={() => router.push(data.link)}
                                    className="self-start text-xs font-bold underline bg-transparent border-none p-0 cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{ color: 'inherit' }} // Наследуем цвет текста тоаста
                                >
                                    Посмотреть ➔
                                </button>
                            )}
                        </div>
                    ),
                    color: getToastColor(data.category),
                    variant: "flat",
                    timeout: 5000,
                });

            } catch (e) {
                console.error("Ошибка парсинга уведомления:", e);
            }
        };

        socket.onclose = () => console.log("❌ WS Disconnected");

        return () => {
            if (socket.readyState === 1) socket.close();
        };
    }, [isAuth, router]); // Не забудь добавить router в зависимости

    return null;
}