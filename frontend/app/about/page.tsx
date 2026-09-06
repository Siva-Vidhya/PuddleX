"use client";

import React from "react";
import Link from "next/link";
import { Droplet, Map as MapIcon, Shield, Server, Activity, Users, ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bg-primary text-ink-body font-sans">
      
      {/* 1. Navbar */}
      <nav className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <Link href="/" className="flex items-center gap-2 text-brand-dark font-heading font-bold text-2xl group">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-soft border border-card-border group-hover:border-brand-primary transition-colors">
            <ArrowLeft className="w-5 h-5 text-ink-body group-hover:text-brand-primary transition-colors" />
          </div>
          <span className="hidden sm:inline">Back to Home</span>
        </Link>
        <div className="flex items-center gap-2 text-brand-dark font-heading font-bold text-2xl">
          <Droplet className="text-brand-primary w-8 h-8" strokeWidth={2.5} />
          PuddleX
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-16 text-center">
          <div className="inline-block px-4 py-1.5 bg-brand-primary/10 text-brand-primary font-semibold rounded-full text-sm mb-4">
            About the Project
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-ink-heading mb-6">
            Rethinking urban navigation for a changing climate.
          </h1>
          <p className="text-xl leading-relaxed text-ink-body">
            PuddleX is a predictive navigation platform designed to help citizens and emergency responders navigate cities safely during severe rainfall and flash flooding.
          </p>
        </header>

        <section className="mb-16">
          <h2 className="text-2xl font-heading font-bold text-ink-heading mb-4">The Problem</h2>
          <p className="mb-4 text-lg">
            Standard navigation apps like Google Maps or Waze are incredibly good at routing you around car traffic. However, they are fundamentally blind to water. During heavy monsoon seasons or sudden flash floods, these apps will routinely direct drivers into flooded underpasses or submerged streets simply because there are no "cars" causing a delay there.
          </p>
          <p className="text-lg">
            This results in thousands of ruined vehicles, stranded commuters, and occasionally, tragic loss of life every single year.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-heading font-bold text-ink-heading mb-6">How We Solve It</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-card-border shadow-soft">
              <Server className="w-8 h-8 text-brand-primary mb-4" />
              <h3 className="font-bold text-ink-heading mb-2">Live Data Fusion</h3>
              <p className="text-sm">We combine live weather API data, hyper-local elevation models, and community reports to understand the environment in real-time.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-card-border shadow-soft">
              <Activity className="w-8 h-8 text-accent mb-4" />
              <h3 className="font-bold text-ink-heading mb-2">Predictive ML Engine</h3>
              <p className="text-sm">A Random Forest machine learning model analyzes the data to predict exactly which road segments are likely to flood before it happens.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-card-border shadow-soft">
              <MapIcon className="w-8 h-8 text-brand-dark mb-4" />
              <h3 className="font-bold text-ink-heading mb-2">Dynamic Routing</h3>
              <p className="text-sm">Our modified pathfinding algorithm treats high-risk flooded roads as "expensive" obstacles, steering you safely around them.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-card-border shadow-soft">
              <Users className="w-8 h-8 text-risk-medium mb-4" />
              <h3 className="font-bold text-ink-heading mb-2">Community Driven</h3>
              <p className="text-sm">Citizens can report actual water depths via the app, feeding real ground-truth data back into the AI to improve future predictions.</p>
            </div>
          </div>
        </section>

        <section className="mb-16 bg-brand-primary/5 border border-brand-primary/10 rounded-3xl p-8 md:p-12 text-center">
          <Shield className="w-12 h-12 text-brand-primary mx-auto mb-6" />
          <h2 className="text-2xl font-heading font-bold text-ink-heading mb-4">Built for Municipalities</h2>
          <p className="text-lg mb-8 max-w-xl mx-auto">
            PuddleX provides a dedicated dashboard for city officials to monitor live flood reports, adjust infrastructure drainage scores, and deploy emergency services effectively.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-brand-primary text-white px-8 py-4 rounded-full font-heading font-bold shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all">
            Access Admin Dashboard
          </Link>
        </section>
      </div>

      {/* Footer */}
      <footer className="w-full bg-white py-12 px-6 border-t border-card-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-brand-dark font-heading font-bold text-xl">
            <Droplet className="text-brand-primary w-6 h-6" />
            PuddleX
          </div>
          <p className="text-ink-body font-medium italic text-sm">Built for safer, resilient cities.</p>
        </div>
      </footer>
    </main>
  );
}
