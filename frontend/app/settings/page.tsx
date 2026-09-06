"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [homeAddress, setHomeAddress]     = useState("");
  const [homeLat, setHomeLat]             = useState<number | null>(null);
  const [homeLng, setHomeLng]             = useState<number | null>(null);
  const [notifyRain, setNotifyRain]       = useState(true);
  const [notifyFlood, setNotifyFlood]     = useState(true);
  const [rainThreshold, setRainThreshold] = useState(15);
  const [saved, setSaved]                 = useState(false);
  const [geocoding, setGeocoding]         = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const savedPrefs = localStorage.getItem("puddlex_preferences");
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        setHomeAddress(prefs.homeAddress || "");
        setHomeLat(prefs.homeLat || null);
        setHomeLng(prefs.homeLng || null);
        setNotifyRain(prefs.notifyRain ?? true);
        setNotifyFlood(prefs.notifyFlood ?? true);
        setRainThreshold(prefs.rainThreshold || 15);
      } catch (e) {
        console.error("Failed to parse saved preferences", e);
      }
    }
  }, []);

  const geocodeAddress = async () => {
    if (!homeAddress.trim()) return;
    setGeocoding(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(
        `${apiUrl}/api/geocode?q=${encodeURIComponent(homeAddress)}`
      );
      const data = await res.json();
      if (data.lat && data.lng) {
        setHomeLat(data.lat);
        setHomeLng(data.lng);
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setGeocoding(false);
    }
  };

  const savePreferences = () => {
    const prefs = {
      homeAddress,
      homeLat,
      homeLng,
      notifyRain,
      notifyFlood,
      rainThreshold,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem("puddlex_preferences", JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Full-width hero header */}
      <div className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-8 py-10 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-3xl">⚙️</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Your Preferences</h1>
            <p className="text-blue-100 text-sm mt-1">
              Personalize your flood alerts and home location
            </p>
          </div>
        </div>
      </div>

      {/* 2-column grid */}
      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left column: Home Address card */}
        <div className="bg-white rounded-3xl shadow-lg border border-blue-100 overflow-hidden h-fit">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏠</span>
              <div>
                <h2 className="font-bold text-white text-lg">Home Address</h2>
                <p className="text-blue-100 text-xs">
                  We alert you if flooding is near your home
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                placeholder="e.g. Arumbakkam, Chennai"
                className="flex-1 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-gray-50 transition-all"
              />
              <button
                onClick={geocodeAddress}
                disabled={geocoding}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {geocoding ? "..." : "Set"}
              </button>
            </div>
            {homeLat !== null && homeLng !== null && (
              <p className="text-xs text-green-600 mt-2">
                ✓ Location confirmed: {Number(homeLat).toFixed(4)}, {Number(homeLng).toFixed(4)}
              </p>
            )}
          </div>
        </div>

        {/* Right column: Alert Preferences card */}
        <div className="bg-white rounded-3xl shadow-lg border border-amber-100 overflow-hidden h-fit">
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔔</span>
              <div>
                <h2 className="font-bold text-white text-lg">Alert Preferences</h2>
                <p className="text-amber-100 text-xs">
                  Choose when and how to be notified
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-colors">
              <div>
                <div className="flex items-center">
                  <p className="text-sm font-medium text-gray-800">Heavy Rain Alert</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">🌧 Rain</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Notify when rain exceeds threshold</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifyRain(!notifyRain)}
                className={`w-11 h-6 rounded-full transition-colors shrink-0 ${
                  notifyRain ? "bg-blue-500" : "bg-gray-300"
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                  notifyRain ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-colors">
              <div>
                <div className="flex items-center">
                  <p className="text-sm font-medium text-gray-800">Flood Risk Alert</p>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full ml-2">🚨 Flood</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Notify when roads near home go high risk</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifyFlood(!notifyFlood)}
                className={`w-11 h-6 rounded-full transition-colors shrink-0 ${
                  notifyFlood ? "bg-blue-500" : "bg-gray-300"
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                  notifyFlood ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50">
              <p className="text-sm font-medium text-gray-800 mb-1">
                Rain Alert Threshold: {rainThreshold}mm/hr
              </p>
              <input
                type="range"
                min={5} max={50} step={5}
                value={rainThreshold}
                onChange={(e) => setRainThreshold(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>5mm (light)</span>
                <span>50mm (heavy)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Save Preferences button below the grid */}
      <div className="max-w-6xl mx-auto px-8 pb-8">
        <button
          onClick={savePreferences}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-4 rounded-3xl font-bold text-lg hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95"
        >
          {saved ? "✓ Preferences Saved!" : "Save Preferences →"}
        </button>
      </div>
    </div>
  );
}
