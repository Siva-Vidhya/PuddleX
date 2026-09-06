"use client";

import React, { useEffect, useState } from "react";
import { Droplet } from "lucide-react";
import Link from "next/link";

const rainCSS = `
  @keyframes rainfall {
    0% { transform: translateY(-100vh) translateX(0px); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(110vh) translateX(20px); opacity: 0; }
  }

  .rain-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .rain-drop {
    position: absolute;
    width: 1.5px;
    background: linear-gradient(to bottom, transparent, #93C5FD, transparent);
    border-radius: 9999px;
    animation: rainfall linear infinite;
    opacity: 0;
  }
`;

function RainEffect() {
  const [drops, setDrops] = useState<
    Array<{ id: number; left: string; height: string; delay: string; duration: string; opacity: number }>
  >([]);

  useEffect(() => {
    setDrops(
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        height: `${Math.random() * 60 + 40}px`,
        delay: `${Math.random() * 5}s`,
        duration: `${Math.random() * 2 + 1.5}s`,
        opacity: Math.random() * 0.4 + 0.1,
      }))
    );
  }, []);

  return (
    <div className="rain-container">
      {drops.map((drop) => (
        <div
          key={drop.id}
          className="rain-drop"
          style={{
            left: drop.left,
            height: drop.height,
            animationDelay: drop.delay,
            animationDuration: drop.duration,
            opacity: drop.opacity,
          }}
        />
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 overflow-hidden selection:bg-blue-500/20 selection:text-blue-700">
      {/* Rain Animation Style */}
      <style dangerouslySetInnerHTML={{ __html: rainCSS }} />

      {/* Rain Background Effect */}
      <RainEffect />

      {/* 1. NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-blue-100/50 px-8 py-4 flex items-center justify-between shadow-sm shadow-blue-100/20">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shadow-inner">
            <Droplet className="text-[#0EA5E9] w-5 h-5 fill-[#0EA5E9]/20" strokeWidth={2.5} />
          </div>
          <span className="text-slate-900 font-bold text-xl tracking-tight">PuddleX</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/map" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            Live Map
          </Link>
          <Link href="/report" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            Report Flood
          </Link>
          <Link href="/settings" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            Settings
          </Link>
          <Link href="/about" className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            About
          </Link>
        </div>

        <Link
          href="/map"
          className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-105 transition-all"
        >
          Check Safe Routes
        </Link>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative z-10 min-h-screen flex items-center px-8 pt-20">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-16">
          
          {/* Left Side Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 shadow-xs">
              <span>🌧 AI-Powered Flood Navigation</span>
            </div>

            <h1 className="text-slate-900 text-5xl md:text-6xl font-black leading-tight">
              Know which roads will flood —{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                before
              </span>{" "}
              you leave.
            </h1>

            <p className="text-slate-500 text-lg max-w-md leading-relaxed mt-6">
              By analyzing live rainfall, elevation, and drainage capacity, our predictive engine calculates the safest route home so you never get stuck in rising water.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
              <Link
                href="/map"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-200/50 hover:shadow-blue-300/60 hover:scale-105 transition-all text-base text-center"
              >
                Plan Your Route
              </Link>
              <Link
                href="/about"
                className="w-full sm:w-auto border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-semibold hover:border-blue-300 hover:text-blue-700 transition-all text-base bg-white/50 backdrop-blur-sm text-center"
              >
                How it Works
              </Link>
            </div>
          </div>

          {/* Right Side — 3 Live Dashboard Cards */}
          <div className="flex justify-center lg:justify-end">
            <div className="space-y-3.5 w-80">
              
              {/* Card 1: Rainfall */}
              <div className="bg-white/70 backdrop-blur-md border border-blue-100/80 rounded-3xl p-5 shadow-xl shadow-blue-100/30 flex items-center justify-between hover:shadow-blue-200/40 hover:scale-[1.02] transition-all">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Current Rainfall
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">0 mm/hr</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl shadow-inner">
                  <span>🌤</span>
                </div>
              </div>

              {/* Card 2: Roads Monitored */}
              <div className="bg-white/70 backdrop-blur-md border border-blue-100/80 rounded-3xl p-5 shadow-xl shadow-blue-100/30 flex items-center justify-between hover:shadow-blue-200/40 hover:scale-[1.02] transition-all">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Roads Monitored
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">319</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-2xl shadow-inner">
                  <span>🗺️</span>
                </div>
              </div>

              {/* Card 3: Model Accuracy */}
              <div className="bg-white/70 backdrop-blur-md border border-blue-100/80 rounded-3xl p-5 shadow-xl shadow-blue-100/30 flex items-center justify-between hover:shadow-blue-200/40 hover:scale-[1.02] transition-all">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    AI Model Accuracy
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">92.1%</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-2xl shadow-inner">
                  <span>🤖</span>
                </div>
              </div>

              {/* Live Badge */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/60 rounded-2xl p-3 text-center shadow-xs">
                <p className="text-xs font-semibold text-blue-600">
                  ⚡ Live — Updated every 15 minutes
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. STATS SECTION */}
      <section className="relative z-10 py-20 px-8">
        <div className="max-w-5xl mx-auto bg-white/60 backdrop-blur-md border border-blue-100 rounded-3xl shadow-xl shadow-blue-100/20 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-blue-100 overflow-hidden">
          {[
            { number: "319", label: "Roads Monitored", sub: "Arumbakkam area" },
            { number: "92.1%", label: "Model Accuracy", sub: "Random Forest ML" },
            { number: "15 min", label: "Data Refresh", sub: "Open-Meteo live feed" },
          ].map((stat, i) => (
            <div key={i} className="py-12 px-8 text-center hover:bg-blue-50/30 transition-colors">
              <p className="text-5xl font-black text-slate-900">{stat.number}</p>
              <p className="text-slate-700 font-semibold mt-2">{stat.label}</p>
              <p className="text-slate-400 text-sm mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. USE CASE CARDS SECTION */}
      <section className="relative z-10 py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-slate-900 text-center mb-4">
            For everyone who travels in the rain
          </h2>
          <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto text-base">
            One platform. Three user groups. Zero compromise on safety.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🚗",
                title: "Daily Commuters",
                desc: "Know before you leave. Not after you are stuck.",
                tag: "Personal"
              },
              {
                icon: "🚚",
                title: "Delivery & Ride Services",
                desc: "Keep your fleet moving. Auto-reroute on flood alerts.",
                tag: "Business"
              },
              {
                icon: "🚑",
                title: "Emergency Responders",
                desc: "Fastest path that is actually passable — not just shortest.",
                tag: "Critical"
              }
            ].map((card, i) => (
              <div
                key={i}
                className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-8 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/40 hover:-translate-y-1 transition-all group cursor-pointer"
              >
                <span className="text-xs font-bold text-blue-600 tracking-widest uppercase">
                  {card.tag}
                </span>
                <div className="text-4xl my-4">{card.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{card.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{card.desc}</p>
                <div className="mt-6 text-blue-500 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Learn more &rarr;
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="relative z-10 border-t border-blue-100/50 bg-white/50 backdrop-blur-md py-12 px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-slate-900 font-bold text-lg">🌊 PuddleX</p>
            <p className="text-slate-400 text-sm mt-1">Built for safer, resilient cities.</p>
          </div>
          <div className="flex gap-8">
            <Link href="/privacy" className="text-slate-400 hover:text-slate-700 text-sm transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-slate-400 hover:text-slate-700 text-sm transition-colors">
              Terms
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-slate-700 text-sm transition-colors"
            >
              API
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
