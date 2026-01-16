'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation, MapPin } from 'lucide-react';

// === ЛЕЧИМ ИКОНКИ LEAFLET В NEXT.JS ===
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Кастомная иконка для Врача
const VetIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  className: "bg-transparent",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Кастомная иконка для Юзера
const UserIcon = L.divIcon({
  html: `<div class="relative flex h-4 w-4"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white"></span></div>`,
  className: "bg-transparent flex items-center justify-center",
  iconSize: [16, 16],
});

// === ТИПЫ ===
interface Clinic {
  id: number;
  lat: number;
  lon: number;
  name?: string;
  street?: string;
  housenumber?: string;
  phone?: string;
  website?: string;
}

// Компонент для перемещения карты
function RecenterAutomatically({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 14);
  }, [lat, lng, map]);
  return null;
}

export default function VetMap() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // 1. ПОЛУЧАЕМ ГЕОПОЗИЦИЮ
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Ваш браузер не поддерживает геолокацию");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        fetchNearbyVets(latitude, longitude);
      },
      (err) => {
        console.error(err);
        setPermissionDenied(true);
        setLoading(false);
      }
    );
  }, []);

  // 2. ИЩЕМ ВЕТЕРИНАРОВ (FIXED)
  const fetchNearbyVets = async (lat: number, lon: number) => {
    try {
      const radius = 5000;
      
      // [FIX] Используем более стабильное зеркало Kumi Systems
      const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter';
      
      // [FIX] Добавили [timeout:10] чтобы не висеть вечно
      const query = `
        [out:json][timeout:10];
        (
          node["amenity"="veterinary"](around:${radius},${lat},${lon});
          way["amenity"="veterinary"](around:${radius},${lat},${lon});
          relation["amenity"="veterinary"](around:${radius},${lat},${lon});
        );
        out center;
      `;
      
      const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`);

      // [FIX] Проверка на ошибки сервера (504, 500 и т.д.) перед парсингом JSON
      if (!response.ok) {
          throw new Error(`Ошибка сервера карт: ${response.status}`);
      }

      const data = await response.json();

      const formattedClinics: Clinic[] = data.elements.map((el: any) => ({
        id: el.id,
        lat: el.lat || el.center?.lat, 
        lon: el.lon || el.center?.lon,
        name: el.tags?.name || 'Ветеринарная клиника',
        street: el.tags?.['addr:street'],
        housenumber: el.tags?.['addr:housenumber'],
        phone: el.tags?.phone || el.tags?.['contact:phone'],
        website: el.tags?.website || el.tags?.['contact:website'],
      })).filter((c: any) => c.lat && c.lon); // Убираем сломанные координаты

      setClinics(formattedClinics);
    } catch (error) {
      console.error("Ошибка поиска клиник:", error);
      // Можно добавить тост или уведомление, что клиники не загрузились
    } finally {
      setLoading(false);
    }
  };

  if (permissionDenied) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-gray-50 rounded-3xl border border-gray-200">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                  <Navigation size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Доступ к геопозиции запрещен</h2>
              <p className="text-gray-500 mt-2 max-w-md">
                  Мы не можем найти ближайшие клиники, так как вы запретили доступ к местоположению.
              </p>
          </div>
      )
  }

  if (loading || !position) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50/50 rounded-3xl animate-pulse">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
        <p className="text-gray-400 font-medium">Определяем местоположение...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden shadow-xl border border-gray-200 relative z-0">
      <MapContainer center={position} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterAutomatically lat={position[0]} lng={position[1]} />

        <Marker position={position} icon={UserIcon}>
          <Popup>Вы здесь</Popup>
        </Marker>

        {clinics.map((clinic) => (
          <Marker 
            key={clinic.id} 
            position={[clinic.lat, clinic.lon]}
            icon={VetIcon}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[200px]">
                <h3 className="font-bold text-gray-900 text-sm mb-1">{clinic.name}</h3>
                {(clinic.street || clinic.housenumber) && (
                    <p className="text-xs text-gray-500 flex items-start gap-1 mb-2">
                        <MapPin size={12} className="mt-0.5 shrink-0" />
                        {clinic.street} {clinic.housenumber}
                    </p>
                )}
                
                {clinic.phone && (
                   <a href={`tel:${clinic.phone}`} className="block w-full text-center bg-blue-50 text-blue-600 text-xs font-bold py-1.5 rounded-lg hover:bg-blue-100 transition mb-1">
                      {clinic.phone}
                   </a>
                )}
                
                {clinic.website && (
                    <a href={clinic.website} target="_blank" rel="noopener noreferrer" className="block w-full text-center text-xs text-gray-400 hover:text-blue-500 hover:underline">
                        Перейти на сайт
                    </a>
                )}
                
                <a 
                   href={`https://yandex.ru/maps/?pt=${clinic.lon},${clinic.lat}&z=16&l=map`} 
                   target="_blank" 
                   rel="noreferrer"
                   className="mt-2 text-[10px] text-gray-400 block text-center border-t pt-1"
                >
                    Открыть в Навигаторе
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="absolute bottom-6 left-6 z-[400] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-gray-100 text-xs font-bold text-gray-700">
          Найдено клиник рядом: {clinics.length}
      </div>
    </div>
  );
}