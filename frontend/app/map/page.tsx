"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
  Navigation, 
  Droplet, 
  Route, 
  CloudRain, 
  ShieldAlert, 
  MapPin, 
  ArrowDownUp, 
  Settings, 
  Search, 
  Layers, 
  Server, 
  Sparkles, 
  CheckCircle2, 
  Sliders, 
  Thermometer, 
  ArrowRight,
  Activity,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPreferences } from '@/lib/notifications';
import Loader from '@/components/Loader';
let L: any = null;
if (typeof window !== "undefined") {
  L = require("leaflet");
  require("leaflet/dist/leaflet.css");

  // Fix Leaflet default marker icons
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// Types
type RiskLevel = "low" | "medium" | "high";
interface RoadSegment {
  id: number | string;
  osm_id?: string;
  name: string | null;
  coordinates: [number, number][];
  risk: RiskLevel;
  flood_risk?: RiskLevel;
  highway?: string;
  surface?: string | null;
  lanes?: string | null;
  oneway?: string | null;
  bridge?: string | null;
  is_flood_prone?: boolean;
  flood_count?: number;
  centroid_lat?: number | null;
  centroid_lng?: number | null;
  risk_probability?: number;
  probabilities?: { low: number; medium: number; high: number };
  rainfall_mm?: number;
  avg_water_depth_cm?: number;
  geometry?: { type: string; coordinates: number[][] } | null;
  recentRainfall?: string;
  lastReportedFlood?: string | null;
  drainage_score?: number;
  road_length?: number;
  elevation_m?: number;
  dist_to_drain_m?: number;
  [key: string]: any;
}

interface RouteInfo {
  id: string;
  type: "shortest" | "puddlex";
  segments: RoadSegment[];
  durationStr: string;
  distanceStr: string;
}

// Dynamically import Map component with SSR disabled
const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <Loader text="Loading Interactive Map..." />
});

type Suggestion = { display_name: string; lat: string; lon: string };

export default function MapPage() {
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [navSearch, setNavSearch] = useState("");
  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [toCoords, setToCoords] = useState<[number, number] | null>(null);
  
  const [fromSuggestions, setFromSuggestions] = useState<Suggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<Suggestion[]>([]);

  const [activeRoute, setActiveRoute] = useState<RouteInfo | null>(null);
  const [shortestRoute, setShortestRoute] = useState<RouteInfo | null>(null);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [roads, setRoads] = useState<RoadSegment[]>([]);
  const setRoadSegments = setRoads;
  const [roadsLoading, setRoadsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [homeAlert, setHomeAlert] = useState<string | null>(null);

  // States for interactive features
  const [simulatedRainfall, setSimulatedRainfall] = useState<number | null>(null);
  const [riskFilter, setRiskFilter] = useState<"All" | "Safe" | "Moderate" | "High" | "Severe">("All");
  const [temperature, setTemperature] = useState<number | null>(29.5);

  useEffect(() => {
    const prefs = getPreferences();
    if (!prefs?.homeLat || !roads.length) return;

    const nearbyHigh = roads.filter(road => {
      if (road.flood_risk !== "high") return false;
      const dlat = Math.abs((road.centroid_lat || 0) - prefs.homeLat!);
      const dlng = Math.abs((road.centroid_lng || 0) - prefs.homeLng!);
      return dlat < 0.009 && dlng < 0.009;
    });

    if (nearbyHigh.length > 0) {
      setHomeAlert(
        `⚠ ${nearbyHigh.length} high-risk road${nearbyHigh.length > 1 ? "s" : ""} detected near your home`
      );
    }
  }, [roads]);

  const [areaSummary, setAreaSummary] = useState<{
    rainfall_mm: number | null;
    risk_level: string;
    drainage_status: string;
    drainage_pct: number;
    precipitation_probability: number;
  }>({
    rainfall_mm: null,
    risk_level: "low",
    drainage_status: "Loading...",
    drainage_pct: 0,
    precipitation_probability: 0
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(
          `${apiUrl}/api/weather/summary?lat=13.0827&lng=80.2707`
        );
        const data = await res.json();
        setAreaSummary(data);
      } catch (err) {
        console.error("Weather fetch failed:", err);
      }

      // Fetch temperature from Open-Meteo
      try {
        const meteoRes = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current_weather=true"
        );
        const meteoData = await meteoRes.json();
        if (meteoData?.current_weather?.temperature != null) {
          setTemperature(meteoData.current_weather.temperature);
        }
      } catch (_) {}
    };
    
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const warmupAndLoad = async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health`);
      } catch (_) {}

      try {
        setRoadsLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/roads`);
        const data = await res.json();
        setRoadSegments(data.roads || []);
      } catch (err) {
        console.error("Failed to fetch road segments:", err);
      } finally {
        setRoadsLoading(false);
      }
    };

    warmupAndLoad();
    const interval = setInterval(warmupAndLoad, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle shared route from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    const to = params.get("to");
    if (from && to) {
      setFromQuery(from);
      setToQuery(to);
      setTimeout(() => {
        handleGetRoute(from, to);
      }, 500);
    }
  }, []);

  // Autocomplete logic for From
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (fromQuery.length > 3 && fromQuery !== "Current Location" && !fromCoords) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fromQuery + ", Chennai, India")}&format=json&limit=5`);
          setFromSuggestions(await res.json());
        } catch(e) { console.error(e); }
      } else {
        setFromSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [fromQuery, fromCoords]);

  // Autocomplete logic for To
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (toQuery.length > 3 && !toCoords) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(toQuery + ", Chennai, India")}&format=json&limit=5`);
          setToSuggestions(await res.json());
        } catch(e) { console.error(e); }
      } else {
        setToSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [toQuery, toCoords]);

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFromCoords([pos.coords.latitude, pos.coords.longitude]);
        setFromQuery("Current Location");
        setFromSuggestions([]);
      });
    }
  };

  const handleSwap = () => {
    setFromQuery(toQuery);
    setToQuery(fromQuery);
    setFromCoords(toCoords);
    setToCoords(fromCoords);
    setFromSuggestions([]);
    setToSuggestions([]);
  };

  const [routeError, setRouteErrorState] = useState<string | null>(null);
  const setRouteError = (msg: string | null) => {
    setRouteErrorState(msg);
    setErrorMsg(msg || "");
  };

  const mapRef = React.useRef<any>(null);
  const safeRouteLayerRef = React.useRef<any>(null);
  const shortestRouteLayerRef = React.useRef<any>(null);

  const handleGetRoute = async (overrideFrom?: string, overrideTo?: string) => {
    const fromValue = overrideFrom || fromQuery;
    const toValue = overrideTo || toQuery;
    const userLat = fromCoords ? fromCoords[0] : null;
    const userLng = fromCoords ? fromCoords[1] : null;

    setRouteLoading(true);
    setRouteError(null);
    setRouteResult(null);

    try {
      const body: any = {};

      // Handle start location
      if (fromValue === "Current Location" || fromValue === "My Location") {
        if (!userLat || !userLng) {
          setRouteError("Could not get your location. Please enable GPS and try again.");
          return;
        }
        body.start_lat = userLat;
        body.start_lng = userLng;
      } else if (fromValue) {
        body.start_place = fromValue;
      } else {
        setRouteError("Please enter a starting location.");
        return;
      }

      // Handle destination
      if (toValue) {
        body.end_place = toValue;
      } else {
        setRouteError("Please enter a destination.");
        return;
      }

      console.log("Route request body:", JSON.stringify(body));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      console.log("Calling API:", apiUrl + "/api/route");

      const res = await fetch(`${apiUrl}/api/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      console.log("Response status:", res.status);

      const data = await res.json();
      console.log("Response data:", JSON.stringify(data).slice(0, 300));

      if (!res.ok) {
        setRouteError(data.detail || `Server error: ${res.status}`);
        return;
      }

      if (data.error) {
        setRouteError(data.error);
        return;
      }

      setRouteResult(data);

      // Draw routes on map
      if (mapRef.current && data.safe_route && data.shortest_route) {
        if (safeRouteLayerRef.current) mapRef.current.removeLayer(safeRouteLayerRef.current);
        if (shortestRouteLayerRef.current) mapRef.current.removeLayer(shortestRouteLayerRef.current);

        const shortestCoords = data.shortest_route.coordinates.map((c: number[]) => [c[1], c[0]]);
        const safeCoords = data.safe_route.coordinates.map((c: number[]) => [c[1], c[0]]);

        shortestRouteLayerRef.current = L.polyline(shortestCoords, {
          color: "#E0563C",
          weight: 4,
          opacity: 0.4,
          dashArray: "8,8",
        }).addTo(mapRef.current);

        safeRouteLayerRef.current = L.polyline(safeCoords, {
          color: "#5FD6C4",
          weight: 5,
          opacity: 0.9,
        }).addTo(mapRef.current);

        const allCoords = [...shortestCoords, ...safeCoords];
        mapRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] });
      }

      if (data.safe_route && data.shortest_route) {
        const safeCoords = data.safe_route.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const shortestCoords = data.shortest_route.coordinates.map((c: [number, number]) => [c[1], c[0]]);

        setActiveRoute({
          id: "safe-route",
          type: "puddlex",
          distanceStr: `${data.distance_km} km`,
          durationStr: `${data.duration_min} min`,
          segments: [{
            id: "safe-segment",
            name: "Safe Route",
            risk: "low",
            coordinates: safeCoords,
            recentRainfall: `${data.rainfall_mm || 0}mm`,
            lastReportedFlood: null,
          }],
        });

        setShortestRoute({
          id: "shortest-route",
          type: "shortest",
          distanceStr: `${data.distance_km} km`,
          durationStr: `${data.duration_min} min`,
          segments: [{
            id: "shortest-segment",
            name: "Shortest Route",
            risk: "high",
            coordinates: shortestCoords,
            recentRainfall: `${data.rainfall_mm || 0}mm`,
            lastReportedFlood: null,
          }],
        });

        if (safeCoords.length > 0) {
          setFromCoords(safeCoords[0]);
          setToCoords(safeCoords[safeCoords.length - 1]);
        }
      }

      // Update URL search parameters
      const url = new URL(window.location.href);
      url.searchParams.set("from", fromValue);
      url.searchParams.set("to", toValue);
      window.history.pushState({}, '', url.toString());

    } catch (err: any) {
      console.error("Route calculation error:", err);
      setRouteError(`Connection failed: ${err.message}. Is the backend running?`);
    } finally {
      setRouteLoading(false);
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGetRoute();
  };

  // Compute simulated roads based on simulation slider
  const effectiveRainfall = simulatedRainfall ?? (areaSummary.rainfall_mm || 0);

  const simulatedRoads = roads.map(r => {
    if (simulatedRainfall === null) return r;
    const rain = simulatedRainfall;
    let risk: RiskLevel = "low";
    let prob = (r.risk_probability || 0.1);

    if (rain >= 30 || (r.is_flood_prone && rain >= 18)) {
      risk = "high";
      prob = Math.min(0.96, Math.max(0.72, prob + (rain / 100) * 0.45));
    } else if (rain >= 10 || r.is_flood_prone) {
      risk = "medium";
      prob = Math.min(0.70, Math.max(0.35, prob + (rain / 100) * 0.3));
    } else {
      risk = "low";
      prob = Math.min(0.30, prob);
    }

    return {
      ...r,
      flood_risk: risk,
      risk_probability: Math.round(prob * 100) / 100,
      rainfall_mm: rain,
    };
  });

  // Risk filtering
  const filteredRoads = simulatedRoads.filter(r => {
    const risk = (r.flood_risk || r.risk || "low").toLowerCase();
    if (riskFilter === "All") return true;
    if (riskFilter === "Safe") return risk === "low";
    if (riskFilter === "Moderate") return risk === "medium";
    if (riskFilter === "High") return risk === "high" && (r.flood_count || 0) < 3;
    if (riskFilter === "Severe") return risk === "high" && (r.flood_count || 0) >= 3;
    return true;
  });

  // Calculate counts for legend & statistics
  const safeCount = simulatedRoads.filter(r => (r.flood_risk || r.risk) === "low").length;
  const modCount = simulatedRoads.filter(r => (r.flood_risk || r.risk) === "medium").length;
  const highCount = simulatedRoads.filter(r => (r.flood_risk || r.risk) === "high" && (r.flood_count || 0) < 3).length;
  const severeCount = simulatedRoads.filter(r => (r.flood_risk || r.risk) === "high" && (r.flood_count || 0) >= 3).length;
  const riskTotal = modCount + highCount + severeCount;
  const floodedCount = simulatedRoads.filter(r => (r.flood_count || 0) > 0 || r.is_flood_prone).length;
  const totalRoads = simulatedRoads.length || 1;

  // Percentage calculations for Donut
  const safePct = Math.round((safeCount / totalRoads) * 100);
  const modPct = Math.round((modCount / totalRoads) * 100);
  const highPct = Math.round((highCount / totalRoads) * 100);
  const sevPct = Math.max(0, 100 - (safePct + modPct + highPct));

  // Compute estimated total road network km
  const totalKm = (simulatedRoads.reduce((acc, r) => acc + (r.road_length || 500), 0) / 1000).toFixed(0);

  // Weather status description label
  const weatherLabel = effectiveRainfall >= 30 ? "Heavy Rain" : effectiveRainfall >= 10 ? "Moderate Rain" : effectiveRainfall > 0 ? "Light Rain" : "Clear Sky";

  return (
    // 1. OVERALL LAYOUT — fixed full-screen layout
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-slate-50">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-16 left-1/2 z-[1100] bg-slate-900 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-medium flex items-center gap-2 pointer-events-none"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. NAVBAR */}
      <header className="flex-none h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 font-bold shadow-inner">
              <Droplet className="w-5 h-5 text-teal-600" />
            </div>
            <span className="font-heading font-extrabold text-lg text-slate-900 tracking-tight">
              Puddle<span className="text-teal-600">X</span>
            </span>
          </Link>
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-md border border-slate-200">
            Chennai Live
          </span>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search location or destination..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && navSearch.trim()) {
                  setToQuery(navSearch.trim());
                  setNavSearch("");
                }
              }}
              className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs text-slate-800 rounded-full pl-9 pr-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>
      </header>

      {/* 3. MAIN CONTENT AREA below navbar */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 4. LEFT SIDEBAR */}
        <aside className="w-72 flex-none bg-white border-r border-slate-200 overflow-y-auto z-10 flex flex-col">
          
          {/* Section 1: Route Planner */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
            {/* Loading Banner */}
            {roadsLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                <p className="text-xs text-blue-700 animate-pulse font-medium">
                  ⏳ Connecting to flood data server...
                </p>
              </div>
            )}

            {/* Home Alert if any */}
            {homeAlert && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-red-700 font-medium">{homeAlert}</p>
                <button
                  type="button"
                  onClick={() => setHomeAlert(null)}
                  className="text-red-400 hover:text-red-600 ml-2 text-sm"
                >✕</button>
              </div>
            )}

            <div className="flex items-center gap-2 text-slate-900 font-heading font-bold text-sm">
              <Compass className="w-4 h-4 text-teal-600" />
              <span>Route Planner</span>
            </div>

            <form onSubmit={onSearchSubmit} className="flex flex-col gap-2.5 relative">
              {/* From Input */}
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <MapPin className="w-4 h-4 text-teal-600" />
                </div>
                <input
                  value={fromQuery}
                  onChange={(e) => { setFromQuery(e.target.value); setFromCoords(null); }}
                  placeholder="Enter starting location"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:bg-white"
                />
                {fromSuggestions.length > 0 && (
                  <ul className="absolute z-[100] w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                    {fromSuggestions.map((s, i) => (
                      <li 
                        key={i} 
                        onClick={() => { 
                          setFromQuery(s.display_name.split(',')[0]); 
                          setFromCoords([parseFloat(s.lat), parseFloat(s.lon)]); 
                          setFromSuggestions([]); 
                        }} 
                        className="p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-xs text-slate-700"
                      >
                        {s.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors shadow-xs"
                  title="Swap locations"
                >
                  <ArrowDownUp className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* To Input */}
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <MapPin className="w-4 h-4 text-rose-500" />
                </div>
                <input
                  value={toQuery}
                  onChange={(e) => { setToQuery(e.target.value); setToCoords(null); }}
                  placeholder="Enter destination"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:bg-white"
                />
                {toSuggestions.length > 0 && (
                  <ul className="absolute z-[100] w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                    {toSuggestions.map((s, i) => (
                      <li 
                        key={i} 
                        onClick={() => { 
                          setToQuery(s.display_name.split(',')[0]); 
                          setToCoords([parseFloat(s.lat), parseFloat(s.lon)]); 
                          setToSuggestions([]); 
                        }} 
                        className="p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-xs text-slate-700"
                      >
                        {s.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Use My Location Link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleUseLocation}
                  className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                >
                  <Navigation className="w-3 h-3" />
                  Use My Location
                </button>
              </div>

              {/* Find Safest Route Button */}
              <button
                type="submit"
                disabled={routeLoading}
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded-xl text-xs font-bold shadow hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{routeLoading ? "Calculating..." : "Find Safest Route"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Loader & Errors */}
            {isCalculating && (
              <div className="flex justify-center p-2">
                <Loader text="Calculating safest route..." />
              </div>
            )}

            {errorMsg && !isCalculating && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-red-700 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Route Result Card */}
            {routeResult && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-teal-900">Safe Route Found</span>
                  <span className="text-[10px] text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full font-semibold">
                    +{routeResult.time_diff_minutes} mins safer
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {routeResult.distance_km} km · {routeResult.duration_min} min
                </p>

                {routeResult.avoided_segments && routeResult.avoided_segments.length > 0 && (
                  <div className="mt-1 pt-2 border-t border-teal-200/60">
                    <p className="text-[10px] font-bold text-slate-700 mb-1">
                      Avoided Hazards:
                    </p>
                    {routeResult.avoided_segments.slice(0, 3).map((seg: any, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-600 mt-0.5">
                        <span className="text-red-500 font-bold">✕</span>
                        <span className="font-medium">{seg.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    const url = `${window.location.origin}/map?from=${encodeURIComponent(fromQuery)}&to=${encodeURIComponent(toQuery)}`;
                    navigator.clipboard.writeText(url);
                    setToastMsg("Route link copied!");
                    setTimeout(() => setToastMsg(""), 3000);
                  }}
                  className="mt-1 w-full text-[11px] text-teal-800 border border-teal-300 rounded-lg py-1 hover:bg-teal-100/80 transition font-semibold"
                >
                  Share Route
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Weather Conditions */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-900 font-heading font-bold text-sm">
                <CloudRain className="w-4 h-4 text-blue-500" />
                <span>Weather Conditions</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                effectiveRainfall >= 20 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                {weatherLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rainfall</span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {effectiveRainfall} <span className="text-xs font-normal text-slate-600">mm</span>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Temperature</span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                  {temperature !== null ? `${temperature}°C` : "29°C"}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Map Legend */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-slate-900 font-heading font-bold text-sm">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Map Legend</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700">
              <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Safe ({safeCount})</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>Moderate ({modCount})</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                <span>High Risk ({highCount})</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span>Severe ({severeCount})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-700 mt-1 px-1">
              <div className="w-6 h-1.5 bg-teal-400 rounded-full" />
              <span className="font-semibold text-teal-800 text-[11px]">Recommended Route</span>
            </div>
          </div>

        </aside>

        {/* 5. MAP CENTER */}
        <main className="flex-1 relative">
          <div className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            <MapComponent 
              allSegments={filteredRoads} 
              activeRoute={activeRoute} 
              shortestRoute={shortestRoute}
              originPos={fromCoords || undefined}
              destPos={toCoords || undefined}
            />
          </div>

          {/* Floating Data Attribution */}
          <div className="absolute bottom-3 right-3 z-[400] bg-white/90 backdrop-blur-md border border-slate-200 px-2.5 py-1 rounded-md shadow-xs pointer-events-none">
            <p className="text-[10px] text-slate-600 font-medium flex items-center gap-1.5">
              <span>Open-Meteo</span>
              <span>&bull;</span>
              <span>OSM</span>
              <span>&bull;</span>
              <span className="text-teal-700 font-bold">PuddleX Engine</span>
            </p>
          </div>
        </main>

        {/* 6. RIGHT SIDEBAR */}
        <aside className="w-72 flex-none bg-white border-l border-slate-200 overflow-y-auto z-10 flex flex-col">
          
          {/* Section 1: AI Flood Intelligence */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-900 font-heading font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Flood Intelligence</span>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                Accuracy: 73.4%
              </span>
            </div>

            {/* 4 stat boxes in 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Roads</span>
                <p className="text-sm font-extrabold text-slate-900">{totalRoads}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Safe</span>
                <p className="text-sm font-extrabold text-emerald-700">{safeCount}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-2">
                <span className="text-[10px] font-bold text-red-700 uppercase">Risk</span>
                <p className="text-sm font-extrabold text-red-700">{riskTotal}</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2">
                <span className="text-[10px] font-bold text-rose-700 uppercase">Flooded</span>
                <p className="text-sm font-extrabold text-rose-700">{floodedCount}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
              <span>Prediction Latency</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-500" />
                12 ms
              </span>
            </div>
          </div>

          {/* Section 2: Simulate Rainfall Impact */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-1.5 font-heading font-bold text-sm">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Simulate Rainfall</span>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {effectiveRainfall} mm
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={effectiveRainfall}
              onChange={(e) => setSimulatedRainfall(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2"
            />

            <div className="flex justify-between text-[10px] font-bold text-slate-400 px-0.5">
              <span>Dry (0mm)</span>
              <span>Heavy Monsoon (100mm)</span>
            </div>

            {simulatedRainfall !== null && (
              <button
                type="button"
                onClick={() => setSimulatedRainfall(null)}
                className="text-[10px] font-medium text-slate-500 hover:text-slate-800 text-left underline mt-0.5"
              >
                Reset to live weather
              </button>
            )}
          </div>

          {/* Section 3: Risk Filter */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-slate-900 font-heading font-bold text-sm">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Risk Filter</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(["All", "Safe", "Moderate", "High", "Severe"] as const).map((filter) => {
                const isActive = riskFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setRiskFilter(filter)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Risk Summary & Donut Chart */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-slate-900 font-heading font-bold text-sm">
              <span>Risk Summary</span>
            </div>

            {/* 7. Donut Chart with explicit small dimensions */}
            <div className="w-40 h-40 mx-auto relative flex items-center justify-center my-1">
              <svg width="140" height="140" viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                {/* Safe Segment */}
                <circle
                  cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="12"
                  strokeDasharray={`${(safePct / 100) * 238.7} 238.7`}
                  strokeDashoffset="0"
                />
                {/* Moderate Segment */}
                <circle
                  cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="12"
                  strokeDasharray={`${(modPct / 100) * 238.7} 238.7`}
                  strokeDashoffset={`${-((safePct) / 100) * 238.7}`}
                />
                {/* High Segment */}
                <circle
                  cx="50" cy="50" r="38" fill="transparent" stroke="#f97316" strokeWidth="12"
                  strokeDasharray={`${(highPct / 100) * 238.7} 238.7`}
                  strokeDashoffset={`${-((safePct + modPct) / 100) * 238.7}`}
                />
                {/* Severe Segment */}
                <circle
                  cx="50" cy="50" r="38" fill="transparent" stroke="#ef4444" strokeWidth="12"
                  strokeDasharray={`${(sevPct / 100) * 238.7} 238.7`}
                  strokeDashoffset={`${-((safePct + modPct + highPct) / 100) * 238.7}`}
                />
              </svg>
              {/* Donut Center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-slate-900">{totalKm} km</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Total Network</span>
              </div>
            </div>

            {/* Legend with percentages */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-medium text-slate-600 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Safe: <b className="text-slate-800">{safePct}%</b></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Moderate: <b className="text-slate-800">{modPct}%</b></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>High: <b className="text-slate-800">{highPct}%</b></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Severe: <b className="text-slate-800">{sevPct}%</b></span>
              </div>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}
