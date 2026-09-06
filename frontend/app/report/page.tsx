"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, MapPin, CheckCircle2, ChevronRight, Droplets, Waves, Car, Footprints } from 'lucide-react';
const DEFAULT_LAT = 13.0827;
const DEFAULT_LNG = 80.2707;

// Dynamic import for Leaflet Location Picker
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-48 bg-bg-secondary flex items-center justify-center rounded-xl border border-card-border">Loading Map...</div>
});

const DEPTH_OPTIONS = [
  { id: 'ankle', label: 'Ankle Deep', emoji: '🦶', icon: <Footprints className="w-5 h-5" />, defaultSeverity: 'low' },
  { id: 'knee', label: 'Knee Deep', emoji: '🚶', icon: <Droplets className="w-5 h-5" />, defaultSeverity: 'medium' },
  { id: 'waist', label: 'Waist Deep', emoji: '🧍', icon: <Waves className="w-5 h-5" />, defaultSeverity: 'high' },
  { id: 'vehicle', label: 'Vehicle Submerged', emoji: '🚗', icon: <Car className="w-5 h-5" />, defaultSeverity: 'high' },
];

export default function ReportPage() {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [locating, setLocating] = useState(true);

  const [depth, setDepth] = useState('ankle');
  const [severity, setSeverity] = useState('low');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          setLocating(false);
        },
        () => {
          // fallback to mock center if denied
          setLocating(false);
        }
      );
    } else {
      setLocating(false);
    }
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleDepthSelect = (depthId: string, defaultSev: string) => {
    setDepth(depthId);
    setSeverity(defaultSev); // Auto-suggest severity
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("lat", lat.toString());
    formData.append("lng", lng.toString());
    formData.append("water_depth", depth);
    formData.append("severity", severity);
    if (notes) formData.append("notes", notes);
    if (photo) formData.append("photo", photo);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const res = await fetch(`${apiUrl}/api/reports`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setStep('success');
      } else {
        alert("Failed to submit report. Please try again later.");
      }
    } catch (error) {
      alert("Network error. Is the backend running on port 8000?");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-200 animate-bounce">
            <span className="text-5xl">✅</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Report Submitted!
          </h2>
          <p className="text-gray-500 mb-8">
            Thanks — your report helps neighbours stay safe during flooding.
          </p>
          <button
            onClick={() => setStep('form')}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-10 py-4 rounded-2xl font-bold text-base hover:shadow-xl transition-all active:scale-95"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Full-width hero header */}
      <div className="w-full bg-gradient-to-r from-red-600 via-red-500 to-orange-400 px-8 py-10 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-3xl">🌊</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Report a Flood</h1>
            <p className="text-red-100 text-sm mt-1">
              Help your neighbours stay safe by reporting water levels near you
            </p>
          </div>
        </div>
      </div>

      {/* 2-column grid */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* LEFT COLUMN: Location + Photo sections */}
            <div className="space-y-6">

              {/* Location card */}
              <div className="bg-white rounded-3xl shadow-lg border border-blue-100 overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <span className="font-bold text-gray-800 text-sm tracking-wide uppercase">
                    Location
                  </span>
                </div>
                <div className="p-4">
                  {locating ? (
                    <div className="w-full h-48 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-500 animate-pulse border border-gray-200">
                      <MapPin className="w-5 h-5 mr-2 animate-bounce text-blue-500" /> Detecting Location...
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                      <LocationPicker initialLat={lat} initialLng={lng} onLocationChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
                      <div className="absolute top-2 right-2 z-[400] bg-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm border border-gray-200 text-gray-700">
                        Drag map to refine
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo card */}
              <div className="bg-white rounded-3xl shadow-lg border border-purple-100 overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <span className="font-bold text-gray-800 text-sm tracking-wide uppercase">
                    Photo (Optional)
                  </span>
                </div>
                <div className="p-4">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoSelect} />
                  {photoPreview ? (
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-gray-200 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-medium flex items-center gap-2"><Camera className="w-4 h-4"/> Change Photo</span>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-blue-50/50 transition-colors"
                    >
                      <Camera className="w-8 h-8 mb-2 text-blue-500/60" />
                      <span className="text-sm font-medium">Tap to upload a photo</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Water Depth + Severity + Notes + Submit */}
            <div className="space-y-6">

              {/* Water depth card */}
              <div className="bg-white rounded-3xl shadow-lg border border-cyan-100 overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-cyan-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <span className="font-bold text-gray-800 text-sm tracking-wide uppercase">
                    Water Depth
                  </span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DEPTH_OPTIONS.map((opt) => {
                      const isActive = depth === opt.id;
                      return (
                        <button 
                          key={opt.id}
                          type="button"
                          onClick={() => handleDepthSelect(opt.id, opt.defaultSeverity)}
                          className={
                            isActive 
                              ? "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-blue-500 bg-blue-50 text-blue-700 font-bold transition-all scale-105 shadow-lg" 
                              : "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300 hover:bg-blue-50 transition-all"
                          }
                        >
                          <span className="text-2xl">{opt.emoji}</span>
                          <span className="text-xs text-center leading-tight">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Severity + Notes card */}
              <div className="bg-white rounded-3xl shadow-lg border border-amber-100 overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">4</span>
                  </div>
                  <span className="font-bold text-gray-800 text-sm tracking-wide uppercase">
                    Details
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Suggested Severity
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSeverity("low")}
                        className={`py-2 px-3 rounded-xl border text-xs transition-all ${
                          severity === "low"
                            ? "bg-green-100 text-green-700 border-green-300 ring-2 ring-offset-1 ring-green-400 font-bold scale-105 shadow-sm"
                            : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        }`}
                      >
                        Low Risk
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeverity("medium")}
                        className={`py-2 px-3 rounded-xl border text-xs transition-all ${
                          severity === "medium"
                            ? "bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-offset-1 ring-amber-400 font-bold scale-105 shadow-sm"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        Medium Risk
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeverity("high")}
                        className={`py-2 px-3 rounded-xl border text-xs transition-all ${
                          severity === "high"
                            ? "bg-red-100 text-red-700 border-red-300 ring-2 ring-offset-1 ring-red-400 font-bold scale-105 shadow-sm"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        }`}
                      >
                        High Risk
                      </button>
                    </div>
                  </div>

                  <div>
                    <textarea 
                      placeholder="Add a short note (e.g. 'Manhole open', 'Flowing very fast')..."
                      className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-400 bg-gray-50 resize-none transition-all"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Submit button as its own full width block */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-red-500 to-orange-400 text-white py-5 rounded-3xl font-bold text-lg hover:shadow-xl hover:shadow-red-200 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Submitting...
                  </>
                ) : "Submit Report 🚨"}
              </button>

            </div>

          </div>
        </form>
      </div>
    </main>
  );
}
