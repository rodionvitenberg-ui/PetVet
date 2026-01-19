'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { addToast } from "@heroui/toast";
// Для Tauri нужно будет установить пакет: npm install @tauri-apps/api
// Пока используем dynamic import или проверку window, чтобы не ломать веб-сборку

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
    const router = useRouter();
    const socketRef = useRef<WebSocket | null>(null);

    // Функция отправки нативного уведомления (Tauri)
    const sendNativeNotification = async (title: string, body: string) => {
        // @ts-ignore
        if (window.__TAURI__) {
            try {
                // Динамический импорт, чтобы веб не ругался
                const { sendNotification, isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
                let permissionGranted = await isPermissionGranted();
                if (!permissionGranted) {
                    const permission = await requestPermission();
                    permissionGranted = permission === 'granted';
                }
                if (permissionGranted) {
                    sendNotification({ title, body });
                }
            } catch (e) {
                console.error("Tauri notification failed", e);
            }
        }
    };

    useEffect(() => {
        if (!isAuth) return;

        const socketUrl = `${WS_URL}/ws/notifications/`;
        const socket = new WebSocket(socketUrl);
        socketRef.current = socket;

        socket.onopen = () => console.log("✅ WS Connected");

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // 1. ЗВУК (Если сервер прислал флаг play_sound=true)
                if (data.play_sound) {
                    const audio = new Audio('/notification.mp3');
                    audio.play().catch(e => console.log("Audio blocked", e));
                }

                // 2. DESKTOP (Native)
                // @ts-ignore
                if (window.__TAURI__) {
                    sendNativeNotification(data.title, data.message);
                } 
                
                // 3. WEB (In-App Toast) - Показываем всегда внутри интерфейса
                addToast({
                    title: data.title,
                    description: (
                        <div className="flex flex-col gap-2">
                            <p>{data.message}</p>
                            {(data.link || data.metadata?.link) && (
                                <button
                                    onClick={() => router.push(data.link || data.metadata?.link)}
                                    className="self-start text-xs font-bold underline bg-transparent border-none p-0 cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{ color: 'inherit' }}
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
    }, [isAuth, router]);

    return null;
}