"use client";

import React, { useEffect, useState } from "react";
import { Droplet } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0A0F1E] flex flex-col overflow-x-hidden selection:bg-[#38BDF8]/20 selection:text-[#38BDF8]">
      
      {/* 1. NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0F1E]/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 flex items-center justify-center">
            <Droplet className="text-[#38BDF8] w-5 h-5 fill-[#38BDF8]/20" strokeWidth={2.5} />
          </div>
          <span className="text-white font-extrabold text-xl tracking-tight">PuddleX</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/map" className="text-sm text-slate-400 hover:text-white transition">Live Map</Link>
          <Link href="/report" className="text-sm text-slate-400 hover:text-white transition">Report Flood</Link>
          <Link href="/settings" className="text-sm text-slate-400 hover:text-white transition">Settings</Link>
          <Link href="/about" className="text-sm text-slate-400 hover:text-white transition">About</Link>
        </div>

        <Link
          href="/map"
          className="bg-[#38BDF8] text-[#0A0F1E] px-5 py-2 rounded-lg text-sm font-bold hover:bg-white transition shadow-sm"
        >
          Check Safe Routes
        </Link>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="min-h-screen bg-[#0A0F1E] flex items-center pt-24 pb-16 px-8 relative overflow-hidden">
        {/* Subtle radial glow behind heading */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Left side content */}
          <div>
            <span className="text-xs font-semibold text-[#38BDF8] tracking-[0.2em] uppercase">
              AI-Powered Flood Navigation
            </span>

            <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mt-3">
              Know which roads will flood — <span className="text-[#38BDF8]">before</span> you leave.
            </h1>

            <p className="text-slate-400 max-w-md text-lg mt-6 leading-relaxed font-normal">
              By analyzing live rainfall, elevation, and drainage capacity, our predictive engine calculates the safest route home so you never get stuck in rising water.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
              <Link
                href="/map"
                className="w-full sm:w-auto bg-[#38BDF8] text-[#0A0F1E] font-bold px-8 py-4 rounded-xl hover:bg-white transition text-base text-center shadow-lg shadow-[#38BDF8]/10"
              >
                Plan Your Route
              </Link>
              <Link
                href="/about"
                className="w-full sm:w-auto border border-white/20 text-white px-8 py-4 rounded-xl hover:border-white/40 transition text-base text-center font-medium"
              >
                How it Works
              </Link>
            </div>
          </div>

          {/* Right side — Live Dashboard Status Cards */}
          <div className="flex justify-center lg:justify-end">
            <div className="space-y-3 w-80">
              <div className="bg-[#111827] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Current Rainfall
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">0 mm/hr</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <span className="text-green-400 text-xl">🌤</span>
                </div>
              </div>

              <div className="bg-[#111827] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Roads Monitored
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">319</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <span className="text-[#38BDF8] text-xl">🗺️</span>
                </div>
              </div>

              <div className="bg-[#111827] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    AI Model Accuracy
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">92.1%</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <span className="text-purple-400 text-xl">🤖</span>
                </div>
              </div>

              <div className="bg-[#111827] border border-[#38BDF8]/30 rounded-2xl p-4 text-center shadow-md">
                <p className="text-xs text-[#38BDF8] font-medium">⚡ Live — Updated 15 min ago</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. STATS SECTION */}
      <section className="bg-[#060B14] py-20 px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          {[
            { number: "319", label: "Roads Monitored", sub: "Arumbakkam area" },
            { number: "92.1%", label: "Model Accuracy", sub: "Random Forest ML" },
            { number: "15 min", label: "Data Refresh", sub: "Open-Meteo live feed" },
          ].map((stat, i) => (
            <div key={i} className="bg-[#0A0F1E] py-12 px-8 text-center">
              <p className="text-5xl font-black text-white">{stat.number}</p>
              <p className="text-base font-semibold text-slate-300 mt-2">
                {stat.label}
              </p>
              <p className="text-sm text-slate-500 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. USE CASE CARDS SECTION */}
      <section className="bg-[#0A0F1E] py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-white text-center mb-4">
            For everyone who travels in the rain
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-xl mx-auto text-base font-normal">
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
                className="bg-[#111827] border border-white/10 rounded-2xl p-8 hover:border-[#38BDF8]/40 hover:bg-[#111827]/90 transition-all group cursor-pointer shadow-sm"
              >
                <span className="text-xs font-semibold text-[#38BDF8] tracking-widest uppercase">
                  {card.tag}
                </span>
                <div className="text-4xl my-4">{card.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                <div className="mt-6 text-[#38BDF8] text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Learn more &rarr;
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="bg-[#060B14] border-t border-white/5 py-12 px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-white font-bold text-lg">🌊 PuddleX</p>
            <p className="text-slate-500 text-sm mt-1">
              Built for safer, resilient cities.
            </p>
          </div>
          <div className="flex gap-8">
            <Link href="/privacy" className="text-slate-400 hover:text-white text-sm transition">
              Privacy
            </Link>
            <Link href="/terms" className="text-slate-400 hover:text-white text-sm transition">
              Terms
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white text-sm transition"
            >
              API
            </a>
          </div>
        </div>
      </footer>

    </main>
  );
}
