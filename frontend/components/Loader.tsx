"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Droplet } from 'lucide-react';

interface LoaderProps {
  text?: string;
  fullScreen?: boolean;
}

export default function Loader({ text = "Loading...", fullScreen = false }: LoaderProps) {
  const containerClasses = fullScreen 
    ? "fixed inset-0 z-[999] bg-bg-primary/80 backdrop-blur-sm flex flex-col items-center justify-center"
    : "w-full h-full min-h-[200px] flex flex-col items-center justify-center";

  return (
    <div className={containerClasses}>
      <div className="relative flex items-center justify-center w-16 h-16 mb-4">
        {/* Ripple 1 */}
        <motion.div 
          className="absolute inset-0 rounded-full border-2 border-brand-primary"
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
        {/* Ripple 2 */}
        <motion.div 
          className="absolute inset-0 rounded-full border-2 border-brand-primary"
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
        />
        {/* Droplet icon */}
        <div className="relative z-10 text-brand-primary">
          <Droplet className="w-8 h-8" fill="currentColor" strokeWidth={2} />
        </div>
      </div>
      <p className="font-heading font-semibold text-brand-dark animate-pulse">
        {text}
      </p>
    </div>
  );
}
