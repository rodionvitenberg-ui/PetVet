'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { addToast } from "@heroui/toast";

// По умолчанию подключаемся к тому же хосту, с которого открыт сайт (same-origin).
// Это работает и локально (ws://localhost:3000 → nginx проксирует /ws/ на бэкенд),
// и на проде (wss://careyour.pet) — без необходимости задавать env-переменные.
// Явные значения NEXT_PUBLIC_WS_URL можно задать для нестандартных деплоев (например, Tauri).
const DEFAULT_WS_URL = typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    : 'ws://127.0.0.1:8000';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL;

const getToastColor = (category: string) => {
    switch (category) {
        case 'medical': return 'primary';
        case 'reminder': return 'warning';
        case 'action': return 'danger';
        case 'system': default: return 'default';
    }
};

// Генерация короткого звукового сигнала через Web Audio API.
// Файла /notification.mp3 в проекте нет, поэтому вместо 404-запроса
// синтезируем звук прямо в браузере.
let audioCtx: AudioContext | null = null;

function playNotificationSound() {
    try {
        if (typeof window === 'undefined') return;
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;

        if (!audioCtx) {
            audioCtx = new AudioCtx();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

        oscillator.connect(gain);
        gain.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        console.log("Notification sound blocked", e);
    }
}

export default function NotificationListener() {
    const { isAuth } = useAuth();
    const router = useRouter();
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

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

        const connect = () => {
            // JWT-токен обязателен: без него JwtAuthMiddleware ставит AnonymousUser
            // и NotificationConsumer закрывает соединение с кодом 403.
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const socketUrl = `${WS_URL}/ws/notifications/?token=${encodeURIComponent(token)}`;
            const socket = new WebSocket(socketUrl);
            socketRef.current = socket;

            socket.onopen = () => console.log("✅ WS Connected");

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // 1. ЗВУК (Если сервер прислал флаг play_sound=true)
                    if (data.play_sound) {
                        playNotificationSound();
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

            socket.onclose = (event) => {
                console.log("❌ WS Disconnected", event.code);
                // Переподключаемся, если закрытие не штатное (1000/1001)
                if (event.code !== 1000 && event.code !== 1001) {
                    reconnectTimerRef.current = setTimeout(connect, 3000);
                }
            };

            socket.onerror = () => {
                // onclose последует за onerror — переподключение обработает onclose
            };
        };

        connect();

        return () => {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            if (socketRef.current && socketRef.current.readyState === 1) {
                socketRef.current.close(1000);
            }
        };
    }, [isAuth, router]);

    return null;
}