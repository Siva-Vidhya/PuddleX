"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Navigation, Droplet, AlertTriangle, Route, CloudRain, ShieldAlert, MapPin, ArrowDownUp, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPreferences } from '@/lib/notifications';
// Types migrated from mockData — no longer importing mock values
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
  recentRainfall: string;
  lastReportedFlood: string | null;
  drainage_score?: number;
}
interface RouteInfo {
  id: string;
  type: "shortest" | "puddlex";
  segments: RoadSegment[];
  durationStr: string;
  distanceStr: string;
}
import Loader from '@/components/Loader';

// Dynamically import Map component with SSR disabled
const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <Loader text="Loading Interactive Map..." />
});

type Suggestion = { display_name: string; lat: string; lon: string };

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

export default function MapPage() {
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
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
  const [roadsLoading, setRoadsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [homeAlert, setHomeAlert] = useState<string | null>(null);

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
    };
    
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load road risk segments from backend — refresh every 15 minutes
  useEffect(() => {
    const fetchRoads = async () => {
      try {
        setRoadsLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/roads`);
        const data = await res.json();
        const roadSegments = data.roads || [];
        setRoads(roadSegments);
        console.log("Road segments loaded:", roadSegments.length);
        console.log("First segment:", JSON.stringify(roadSegments[0]));
      } catch (err) {
        console.error("Failed to fetch road segments:", err);
      } finally {
        setRoadsLoading(false);
      }
    };
    fetchRoads();
    const interval = setInterval(fetchRoads, 15 * 60 * 1000);
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

  const handleGetRoute = async (overrideFrom?: string, overrideTo?: string) => {
    setRouteLoading(true);
    const fromVal = overrideFrom || fromQuery;
    const toVal = overrideTo || toQuery;
    if (!fromVal || !toVal) {
      setRouteLoading(false);
      return;
    }

    setIsCalculating(true);
    setErrorMsg("");
    setRouteResult(null);
    setActiveRoute(null);
    setShortestRoute(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_place: fromVal,
          end_place:   toVal
        })
      });

      if (!res.ok) throw new Error("Route calculation failed");
      const data = await res.json();
      setRouteResult(data);

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
          recentRainfall: `${data.rainfall_mm}mm`,
          coordinates: safeCoords,
          lastReportedFlood: null
        }]
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
          recentRainfall: `${data.rainfall_mm}mm`,
          coordinates: shortestCoords,
          lastReportedFlood: null
        }]
      });

      if (safeCoords.length > 0) {
        setFromCoords(safeCoords[0]);
        setToCoords(safeCoords[safeCoords.length - 1]);
      }

      // Update URL search parameters
      const url = new URL(window.location.href);
      url.searchParams.set("from", fromVal);
      url.searchParams.set("to", toVal);
      window.history.pushState({}, '', url.toString());

    } catch (err) {
      console.error("Route error:", err);
      setErrorMsg("Could not calculate route. Please try again.");
    } finally {
      setIsCalculating(false);
      setRouteLoading(false);
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGetRoute();
  };

  // Compute nearbyHazards from roads state
  const nearbyHazards = roads
    .filter(seg => seg.flood_risk === "high" || seg.flood_risk === "medium")
    .sort((a, b) => (b.risk_probability || 0) - (a.risk_probability || 0))
    .slice(0, 5);

  return (
    <div className="flex flex-col-reverse md:flex-row-reverse h-screen w-full bg-bg-primary overflow-hidden relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="absolute top-6 left-1/2 z-[1000] bg-brand-dark text-white px-4 py-2 rounded-full shadow-hover text-sm font-medium flex items-center gap-2"
          >
            <CheckCircleIcon />
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-[400px] h-[50vh] md:h-full bg-gradient-to-b from-white to-slate-50 shadow-[-4px_0_24px_rgba(20,60,90,0.08)] z-10 flex flex-col relative shrink-0 border-l border-card-border overflow-y-auto"
      >
        {/* Header & Routing Panel */}
        <div className="p-6 border-b border-card-border bg-white sticky top-0 z-20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-brand-dark font-heading font-bold text-xl">
              <div className="relative flex items-center justify-center">
                <Droplet className="text-brand-primary w-6 h-6" strokeWidth={2.5} />
                <Route className="text-accent w-3 h-3 absolute bottom-0 right-0" strokeWidth={3} />
              </div>
              PuddleX
            </div>
            <Link
              href="/settings"
              className="p-2 text-gray-500 hover:text-brand-primary hover:bg-bg-secondary rounded-lg transition-colors"
              title="Settings & Preferences"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
          
          {homeAlert && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center justify-between">
              <p className="text-xs text-red-700 font-medium">{homeAlert}</p>
              <button
                type="button"
                onClick={() => setHomeAlert(null)}
                className="text-red-400 hover:text-red-600 ml-2 text-sm"
              >✕</button>
            </div>
          )}

          <form onSubmit={onSearchSubmit} className="flex flex-col gap-3 relative">
            <div className="relative flex flex-col gap-3">
              {/* From Input */}
              <div className="relative">
                <div className="absolute left-3 top-3.5 text-ink-body"><MapPin className="w-5 h-5"/></div>
                <input 
                  value={fromQuery} 
                  onChange={(e) => { setFromQuery(e.target.value); setFromCoords(null); }} 
                  placeholder="From (e.g. T Nagar)" 
                  className="w-full bg-bg-secondary border border-card-border rounded-xl py-3 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-ink-heading font-medium"
                />
                <button type="button" onClick={handleUseLocation} className="absolute right-3 top-3.5 text-brand-primary hover:text-brand-dark" title="Use current location">
                  <Navigation className="w-5 h-5"/>
                </button>
                
                {fromSuggestions.length > 0 && (
                  <ul className="absolute z-[100] w-full bg-white border border-card-border rounded-lg mt-1 shadow-hover overflow-hidden max-h-48 overflow-y-auto">
                    {fromSuggestions.map((s, i) => (
                      <li key={i} onClick={() => { setFromQuery(s.display_name.split(',')[0]); setFromCoords([parseFloat(s.lat), parseFloat(s.lon)]); setFromSuggestions([]); }} className="p-3 hover:bg-bg-secondary cursor-pointer border-b border-card-border last:border-0 text-sm text-ink-heading">
                        {s.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/* To Input */}
              <div className="relative">
                <div className="absolute left-3 top-3.5 text-ink-body"><MapPin className="w-5 h-5 text-accent"/></div>
                <input 
                  value={toQuery} 
                  onChange={(e) => { setToQuery(e.target.value); setToCoords(null); }} 
                  placeholder="To (e.g. Adyar)" 
                  className="w-full bg-bg-secondary border border-card-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-ink-heading font-medium"
                />
                {toSuggestions.length > 0 && (
                  <ul className="absolute z-[100] w-full bg-white border border-card-border rounded-lg mt-1 shadow-hover overflow-hidden max-h-48 overflow-y-auto">
                    {toSuggestions.map((s, i) => (
                      <li key={i} onClick={() => { setToQuery(s.display_name.split(',')[0]); setToCoords([parseFloat(s.lat), parseFloat(s.lon)]); setToSuggestions([]); }} className="p-3 hover:bg-bg-secondary cursor-pointer border-b border-card-border last:border-0 text-sm text-ink-heading">
                        {s.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Swap Button */}
              <button type="button" onClick={handleSwap} className="absolute right-8 top-1/2 -translate-y-1/2 bg-white border border-card-border shadow-sm p-1.5 rounded-full z-10 text-ink-body hover:text-brand-primary">
                <ArrowDownUp className="w-4 h-4"/>
              </button>
            </div>

            <button type="submit" disabled={routeLoading} className="w-full bg-brand-gradient text-white py-3 rounded-xl font-heading font-bold shadow-soft hover:shadow-hover mt-1 transition-all disabled:opacity-50">
              {routeLoading ? "Calculating..." : "Get Safe Route"}
            </button>
          </form>

          {/* Route Result Card */}
          {routeResult && (
            <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-teal-800">Safe Route Found</span>
                <span className="text-xs text-teal-600 font-medium">
                  +{routeResult.time_diff_minutes} mins safer
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {routeResult.distance_km} km · {routeResult.duration_min} min
              </p>

              {routeResult.avoided_segments && routeResult.avoided_segments.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Why we rerouted you:
                  </p>
                  {routeResult.avoided_segments.map((seg: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 mt-1">
                      <span className="text-red-500 text-xs mt-0.5">●</span>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{seg.name}</p>
                        <p className="text-xs text-gray-500">{seg.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  const url = `${window.location.origin}/map?from=${encodeURIComponent(fromQuery)}&to=${encodeURIComponent(toQuery)}`;
                  navigator.clipboard.writeText(url);
                  if (navigator.share) {
                    navigator.share({ title: "PuddleX Safe Route", url });
                  } else {
                    setToastMsg("Route link copied to clipboard!");
                    setTimeout(() => setToastMsg(""), 3500);
                  }
                }}
                className="mt-3 w-full text-xs text-teal-700 border border-teal-300 rounded-lg py-1.5 hover:bg-teal-100 transition font-medium"
              >
                Share Route
              </button>
            </div>
          )}
        </div>

        <div className="p-6 flex-1 flex flex-col gap-6 pt-0">
          
          <div className="h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent my-3" />

          <AnimatePresence mode="popLayout">
            {isCalculating && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex justify-center p-4"
              >
                <Loader text="Analyzing weather & flood risks..." />
              </motion.div>
            )}

            {errorMsg && !isCalculating && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-risk-high/10 border border-risk-high/20 rounded-xl p-4 flex gap-3 text-risk-high"
              >
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Rainfall Summary */}
          <div className="bg-white border border-card-border shadow-soft rounded-xl p-5">
            <h3 className="font-heading font-semibold text-ink-heading mb-3 flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-brand-primary" />
              Area Summary
            </h3>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-bold font-heading text-ink-heading">
                  {areaSummary.rainfall_mm !== null ? `${areaSummary.rainfall_mm}mm/hr` : "Loading..."}
                </p>
                <p className="text-sm text-ink-body">Current Rainfall</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  areaSummary.risk_level === "high"
                    ? "text-red-500"
                    : areaSummary.risk_level === "medium"
                    ? "text-amber-500"
                    : "text-green-500"
                }`}>
                  {areaSummary.risk_level.charAt(0).toUpperCase() + areaSummary.risk_level.slice(1)} Risk
                </p>
                <p className="text-xs text-ink-body">{areaSummary.drainage_status}</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent my-3" />

          {/* Legend */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-cyan-400"/>
              <span className="text-xs font-bold text-gray-700 tracking-widest uppercase">Map Legend</span>
            </div>
            <div className="flex flex-col gap-2 text-sm font-medium text-ink-body">
              <div className="flex items-center gap-3">
                <div className="w-6 h-1 bg-risk-low rounded-full"></div> 
                <span>Low Risk</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-between">
                  <div className="w-2.5 h-1 bg-risk-medium rounded-full"></div>
                  <div className="w-2.5 h-1 bg-risk-medium rounded-full"></div>
                </div>
                <span>Medium Risk (Caution)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-2 bg-risk-high rounded-full"></div> 
                <span>High Risk (Avoid)</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent my-3" />

          {/* High Risk Roads List / Nearby Hazards */}
          <div className="flex-1 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-red-500 to-orange-400"/>
              <span className="text-xs font-bold text-gray-700 tracking-widest uppercase">Nearby Hazards</span>
            </div>
            <div className="flex flex-col gap-3">
              {roadsLoading ? (
                <div className="flex flex-col gap-2">
                  <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
                  <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
                  <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
                </div>
              ) : nearbyHazards.length === 0 ? (
                <p className="text-sm text-gray-500">No hazards detected nearby</p>
              ) : (
                nearbyHazards.map((seg, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 px-3 rounded-2xl hover:bg-red-50 transition-colors cursor-pointer">
                    <span className={`text-lg mt-0.5 ${
                      seg.flood_risk === "high" ? "text-red-500" : "text-amber-500"
                    }`}>⚠</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {seg.name || seg.highway || "Unnamed Road"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {seg.rainfall_mm != null ? `${seg.rainfall_mm}mm rain` : "0mm rain"}
                        {seg.flood_count && seg.flood_count > 0 ? ` • ${seg.flood_count} past floods` : " • No recent reports"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Map Area */}
      <div className="flex-1 h-[50vh] md:h-full relative bg-bg-secondary z-0">
        <MapComponent 
          allSegments={roads} 
          activeRoute={activeRoute} 
          shortestRoute={shortestRoute}
          originPos={fromCoords || undefined}
          destPos={toCoords || undefined}
        />
        
        {/* Data Sources Footer */}
        <div className="absolute bottom-4 right-4 z-[400] bg-white/90 backdrop-blur-sm border border-card-border px-3 py-2 rounded-lg shadow-sm">
          <p className="text-[10px] text-ink-body font-medium flex items-center gap-2">
            <span>Powered by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">Open-Meteo</a></span>
            <span>&bull;</span>
            <span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">OSM</a></span>
          </p>
        </div>
      </div>

    </div>
  );
}
