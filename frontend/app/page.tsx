"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Droplet, Map as MapIcon, Route, AlertTriangle, Car, Truck, Ambulance } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen flex flex-col items-center overflow-x-hidden">
      
      {/* 1. Navbar */}
      <nav className="w-full max-w-7xl px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2 text-brand-dark font-heading font-bold text-2xl">
          <div className="relative flex items-center justify-center">
            <Droplet className="text-brand-primary w-8 h-8" strokeWidth={2.5} />
            <Route className="text-accent w-4 h-4 absolute bottom-0 right-0" strokeWidth={3} />
          </div>
          PuddleX
        </div>
        <div className="hidden md:flex items-center gap-8 text-ink-body font-medium">
          <a href="#how-it-works" className="hover:text-brand-primary transition-colors">How it Works</a>
          <Link href="/map" className="hover:text-brand-primary transition-colors">Live Map</Link>
          <Link href="/report" className="hover:text-brand-primary transition-colors">Report Flood</Link>
          <Link href="/settings" className="hover:text-brand-primary transition-colors">Settings</Link>
          <Link href="/about" className="hover:text-brand-primary transition-colors">About</Link>
        </div>
        <Link href="/map" className="bg-brand-gradient text-white px-6 py-3 rounded-full font-heading font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all">
          Check Safe Routes
        </Link>
      </nav>

      {/* 2. Hero Section */}
      <section className="w-full max-w-7xl px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Know which roads will flood — <span className="text-transparent bg-clip-text bg-brand-gradient">before you leave.</span>
          </h1>
          <p className="text-xl text-ink-body mb-8 max-w-lg leading-relaxed">
            By analyzing live rainfall, elevation, and drainage capacity, our predictive engine calculates the safest route home so you never get stuck in rising water.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/map" className="w-full sm:w-auto bg-brand-gradient text-white px-8 py-4 rounded-full font-heading text-lg font-semibold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <MapIcon className="w-5 h-5" />
              Plan Your Route
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto bg-white border border-card-border text-ink-heading px-8 py-4 rounded-full font-heading text-lg font-semibold hover:bg-bg-secondary transition-colors text-center">
              How it Works
            </a>
          </div>
        </motion.div>

        {/* Animated Map Preview */}
        <motion.div 
          className="relative bg-bg-secondary rounded-xl border border-card-border shadow-soft h-[400px] overflow-hidden flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg width=\"40\" height=\"40\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0,20 h40 M20,0 v40\" stroke=\"%231A6FA8\" stroke-width=\"1\"/></svg>')", backgroundSize: '40px 40px' }} />
          
          <svg viewBox="0 0 400 400" className="w-full h-full relative z-10">
            {/* Roads background */}
            <path d="M 50,200 L 350,200" stroke="#E3ECF1" strokeWidth="8" strokeLinecap="round" />
            <path d="M 200,50 L 200,350" stroke="#E3ECF1" strokeWidth="8" strokeLinecap="round" />
            <path d="M 50,350 Q 200,350 200,200 Q 200,50 350,50" stroke="#E3ECF1" strokeWidth="8" strokeLinecap="round" fill="none" />
            
            {/* High Risk Segment (Red) */}
            <motion.path 
              d="M 200,200 L 350,200" 
              stroke="var(--risk-high)" 
              strokeWidth="8" 
              strokeLinecap="round" 
              className="text-risk-high"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            
            {/* Safe Route Segment (Green) - avoiding the red */}
            <motion.path 
              d="M 50,200 L 200,200 Q 200,50 350,50" 
              stroke="var(--accent)" 
              strokeWidth="6" 
              strokeLinecap="round" 
              fill="none"
              strokeDasharray="1000"
              strokeDashoffset="1000"
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
            />
            
            {/* Markers */}
            <circle cx="50" cy="200" r="8" fill="var(--brand-dark)" />
            <circle cx="350" cy="50" r="8" fill="var(--brand-primary)" />
            <circle cx="275" cy="200" r="12" fill="var(--risk-high)" opacity="0.3" />
          </svg>
          
          {/* Popup overlay */}
          <motion.div 
            className="absolute bottom-6 right-6 bg-white p-4 rounded-xl shadow-hover border border-card-border flex items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.5 }}
          >
            <div className="bg-risk-high/10 p-2 rounded-full text-risk-high">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-ink-body font-semibold uppercase tracking-wider">Hazard Detected</p>
              <p className="font-heading font-bold text-ink-heading text-sm">Rerouting: +2 mins</p>
            </div>
          </motion.div>
        </motion.div>
      </section>



      {/* SECTION 1 - Live Risk Map preview strip */}
      <section className="w-full bg-[#EFF6FB] py-12 px-6 flex flex-col items-center border-y border-card-border">
        <div className="max-w-5xl w-full">
          <div className="relative w-full h-[300px] md:h-[500px] rounded-xl overflow-hidden shadow-soft border border-card-border bg-white mb-6">
            <div className="absolute inset-0 bg-bg-secondary" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0,10 h20 M10,0 v20\" stroke=\"%231A6FA8\" stroke-width=\"0.5\" opacity=\"0.2\"/></svg>')", backgroundSize: '20px 20px' }}></div>
            
            <svg viewBox="0 0 800 500" className="w-full h-full relative z-10 opacity-70">
              <path d="M 100,250 L 300,250 L 400,150 L 700,150" stroke="#E3ECF1" strokeWidth="12" strokeLinecap="round" fill="none" />
              <path d="M 300,250 L 400,350 L 700,350" stroke="#E3ECF1" strokeWidth="12" strokeLinecap="round" fill="none" />
              <path d="M 400,150 L 700,150" stroke="var(--risk-high)" strokeWidth="12" strokeLinecap="round" fill="none" />
              <path d="M 100,250 L 300,250 L 400,350 L 700,350" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round" fill="none" />
              <circle cx="100" cy="250" r="10" fill="var(--brand-dark)" />
              <circle cx="700" cy="350" r="10" fill="var(--brand-primary)" />
            </svg>
            
            <div className="absolute top-4 left-4 bg-white px-4 py-3 rounded-lg shadow-sm border border-card-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-risk-high animate-pulse"></div>
                <span className="text-sm font-semibold text-ink-heading">Flooded segments avoided</span>
              </div>
              <div className="w-32 h-2 bg-bg-secondary rounded-full overflow-hidden">
                <div className="w-full h-full bg-accent"></div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-ink-body font-medium">Updated every 15 minutes from live rainfall data.</p>
            <Link href="/map" className="flex items-center gap-2 font-heading font-bold text-brand-primary hover:text-brand-dark transition-colors">
              Open Live Map &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 2 - Social proof / impact numbers */}
      <section className="w-full bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-5xl font-bold font-heading mb-3 text-transparent bg-clip-text bg-brand-gradient">2,400+</p>
            <p className="text-ink-heading font-semibold text-lg">Roads Monitored</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} viewport={{ once: true }}>
            <p className="text-5xl font-bold font-heading mb-3 text-transparent bg-clip-text bg-brand-gradient">1,800+</p>
            <p className="text-ink-heading font-semibold text-lg">Citizen Reports</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} viewport={{ once: true }}>
            <p className="text-5xl font-bold font-heading mb-3 text-transparent bg-clip-text bg-brand-gradient">98%</p>
            <p className="text-ink-heading font-semibold text-lg">Route Safety Rate</p>
          </motion.div>
        </div>
      </section>

      {/* SECTION 3 - "For everyone who travels in the rain" */}
      <section className="w-full bg-bg-secondary py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">For everyone who travels in the rain</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-xl shadow-soft border-l-4 border-l-brand-primary border-y border-r border-card-border">
              <Car className="w-8 h-8 text-brand-primary mb-6" />
              <h3 className="text-xl font-bold mb-3 text-ink-heading">Daily Commuters</h3>
              <p className="text-ink-body font-medium text-lg leading-snug">Know before you leave. Not after you're stuck.</p>
            </motion.div>
            
            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-xl shadow-soft border-l-4 border-l-brand-primary border-y border-r border-card-border">
              <Truck className="w-8 h-8 text-brand-primary mb-6" />
              <h3 className="text-xl font-bold mb-3 text-ink-heading">Delivery &amp; Ride Services</h3>
              <p className="text-ink-body font-medium text-lg leading-snug">Keep your fleet moving. Automatically reroute on flood alerts.</p>
            </motion.div>
            
            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-xl shadow-soft border-l-4 border-l-brand-primary border-y border-r border-card-border">
              <Ambulance className="w-8 h-8 text-brand-primary mb-6" />
              <h3 className="text-xl font-bold mb-3 text-ink-heading">Emergency Responders</h3>
              <p className="text-ink-body font-medium text-lg leading-snug">Fastest path that's actually passable &mdash; not just shortest.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="w-full bg-white py-12 px-6 border-t border-card-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-brand-dark font-heading font-bold text-xl">
            <Droplet className="text-brand-primary w-6 h-6" />
            PuddleX
          </div>
          <p className="text-ink-body font-medium italic">Built for safer, resilient cities.</p>
          <div className="flex gap-6 text-sm font-medium text-ink-body">
            <Link href="/privacy" className="hover:text-brand-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-brand-primary transition-colors">Terms</Link>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-brand-primary transition-colors">API</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
