"use client";

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default leaflet icons not showing in Next.js
const iconRetinaUrl = '/leaflet/marker-icon-2x.png';
const iconUrl = '/leaflet/marker-icon.png';
const shadowUrl = '/leaflet/marker-shadow.png';
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface LocationPickerProps {
  initialLat: number;
  initialLng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

function LocationMarker({ position, setPosition }: any) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function LocationPicker({ initialLat, initialLng, onLocationChange }: LocationPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(L.latLng(initialLat, initialLng));

  useEffect(() => {
    if (position) {
      onLocationChange(position.lat, position.lng);
    }
  }, [position, onLocationChange]);

  return (
    <div className="w-full h-48 rounded-xl overflow-hidden border border-card-border shadow-inner relative z-0">
      <MapContainer 
        center={[initialLat, initialLng]} 
        zoom={14} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
    </div>
  );
}
