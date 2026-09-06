"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Types co-located — mockData import removed
type RiskLevel = "low" | "medium" | "high";
interface RoadSegment {
  id: number | string;
  osm_id?: string;
  name: string | null;
  coordinates: [number, number][];
  risk: RiskLevel;
  flood_risk?: RiskLevel;
  highway?: string;
  rainfall_mm?: number;
  flood_count?: number;
  is_flood_prone?: boolean;
  geometry?: { type: string; coordinates: number[][] } | null;
  lastReportedFlood?: string | null;
  [key: string]: any;
}
interface RouteInfo {
  id: string;
  type: "shortest" | "puddlex";
  segments: RoadSegment[];
  durationStr: string;
  distanceStr: string;
}

// Real Chennai center — no longer pulled from mockData
const CHENNAI_LAT = 13.0827;
const CHENNAI_LNG = 80.2707;

const getRoadStyle = (feature: any) => {
  console.log("Styling feature:", feature?.properties?.flood_risk);
  const risk = feature?.properties?.flood_risk || "low";
  if (risk === "high")   return { color: "#E0563C", weight: 5, opacity: 0.9 };
  if (risk === "medium") return { color: "#F0A93B", weight: 4, opacity: 0.85, dashArray: "6,4" };
  return                        { color: "#2FAE6B", weight: 3, opacity: 0.75 };
};

// Fix for default leaflet icons not showing in Next.js
const iconRetinaUrl = '/leaflet/marker-icon-2x.png';
const iconUrl = '/leaflet/marker-icon.png';
const shadowUrl = '/leaflet/marker-shadow.png';
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Custom origin and destination icons
const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// A small component to fly to a new center when routes change
const MapUpdater = ({ activeRoute, shortestRoute, originPos, destPos }: { activeRoute: RouteInfo | null, shortestRoute: RouteInfo | null, originPos?: [number, number], destPos?: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    const coords: [number, number][] = [];
    if (activeRoute && activeRoute.segments.length > 0) {
      coords.push(...activeRoute.segments.flatMap(s => s.coordinates as [number, number][]));
    }
    if (shortestRoute && shortestRoute.segments.length > 0) {
      coords.push(...shortestRoute.segments.flatMap(s => s.coordinates as [number, number][]));
    }
    if (originPos) coords.push(originPos);
    if (destPos) coords.push(destPos);
    
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    }
  }, [activeRoute, shortestRoute, originPos, destPos, map]);
  return null;
};

interface MapProps {
  allSegments: RoadSegment[];
  activeRoute: RouteInfo | null;
  shortestRoute: RouteInfo | null;
  originPos?: [number, number];
  destPos?: [number, number];
}

export default function Map({ allSegments, activeRoute, shortestRoute, originPos, destPos }: MapProps) {

  const roadGeoJSON = {
    type: "FeatureCollection" as const,
    features: allSegments
      .map(seg => {
        const geometry = typeof seg.geometry === "string"
          ? JSON.parse(seg.geometry)
          : seg.geometry;
        return {
          type: "Feature" as const,
          properties: {
            name:             seg.name,
            highway:          seg.highway,
            flood_risk:       seg.flood_risk,
            risk_probability: seg.risk_probability,
            rainfall_mm:      seg.rainfall_mm,
            flood_count:      seg.flood_count,
            is_flood_prone:   seg.is_flood_prone,
          },
          geometry: geometry
        };
      })
      .filter(feat => 
        feat.geometry?.coordinates?.length >= 2
      )
  };

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={[CHENNAI_LAT, CHENNAI_LNG]}
        zoom={13} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        {/* Road risk GeoJSON layer — fetched from backend /api/roads */}
        {roadGeoJSON.features.length > 0 && (
          <GeoJSON
            key={`geojson-roads-${allSegments.length}`}
            data={roadGeoJSON}
            style={(feature) => getRoadStyle(feature)}
            onEachFeature={(feature, layer) => {
              const props = feature.properties || {};
              const risk = props.flood_risk || "low";
              const riskColor = risk === "high" ? "#E0563C" : (risk === "medium" ? "#F0A93B" : "#2FAE6B");
              
              layer.bindPopup(`
                <div style="min-width:160px; font-family: inherit;">
                  <b>${props.name || props.highway || "Unnamed Road"}</b><br/>
                  Risk: <span style="color:${riskColor}"><b>${risk.toUpperCase()}</b></span><br/>
                  Rainfall: ${props.rainfall_mm ?? 0}mm<br/>
                  Past floods: ${props.flood_count ?? 0}
                </div>
              `);
            }}
          />
        )}

        {/* Render Shortest Route (Faded Red Dashed) */}
        {shortestRoute && shortestRoute.segments.map(segment => (
          <Polyline 
            key={`short-${segment.id}`} 
            positions={segment.coordinates} 
            color="#EF4444" // Faded red
            weight={6}
            opacity={0.6}
            dashArray="10, 10"
          >
             <Popup>Shortest Route (High Flood Risk)</Popup>
          </Polyline>
        ))}

        {/* Render PuddleX Safe Route */}
        {activeRoute && activeRoute.segments.map(segment => (
          <Polyline 
            key={`aqua-${segment.id}`} 
            positions={segment.coordinates} 
            color="#5FD6C4" // var(--accent) teal
            weight={8}
            className="puddlex-route-animation"
          />
        ))}

        {originPos && <Marker position={originPos} icon={originIcon} />}
        {destPos && <Marker position={destPos} icon={destIcon} />}

        <MapUpdater activeRoute={activeRoute} shortestRoute={shortestRoute} originPos={originPos} destPos={destPos} />
      </MapContainer>
      
      {/* CSS for animating the route */}
      <style dangerouslySetInnerHTML={{__html: `
        .puddlex-route-animation {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: drawRoute 3s ease-in-out forwards;
        }
        @keyframes drawRoute {
          to {
            stroke-dashoffset: 0;
          }
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}} />
    </div>
  );
}
