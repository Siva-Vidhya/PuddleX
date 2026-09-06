"use client";

import React, { useEffect, useState } from 'react';
import { Droplet } from 'lucide-react';

interface Report {
  id: string;
  lat: number;
  lng: number;
  water_depth: string;
  severity: string;
  notes: string;
  created_at: string;
  photo_url: string | null;
}

export default function ReportsFeedPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(
          `${apiUrl}/api/reports?limit=20&sort=recent`
        );
        if (!res.ok) throw new Error("Failed to fetch reports");
        const data = await res.json();
        setReports(Array.isArray(data) ? data : data.reports || []);
      } catch (err) {
        console.error(err);
        setError("Could not load reports.");
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <main className="min-h-screen bg-bg-primary py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-heading font-bold text-3xl text-ink-heading mb-3 flex items-center justify-center gap-2">
            <Droplet className="w-8 h-8 text-brand-primary" /> Community Feed
          </h1>
          <p className="text-ink-body">Live reports from citizens keeping the city moving.</p>
        </div>

        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-2">🌧</p>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <p className="text-4xl mb-2">✅</p>
            <p className="font-medium text-gray-800">No flood reports yet</p>
            <p className="text-sm text-gray-500 mt-1">Be the first to report a flooded road</p>
          </div>
        )}

        {!loading && !error && reports.map((report) => (
          <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-4">
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  report.severity === "high"
                    ? "bg-red-100 text-red-700"
                    : report.severity === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  {report.severity?.toUpperCase() || "UNKNOWN"}
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Water depth: {report.water_depth || "Not specified"}
                </p>
                {report.notes && (
                  <p className="text-sm text-gray-700 mt-1">{report.notes}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {report.lat?.toFixed(4)}, {report.lng?.toFixed(4)} •{" "}
                  {new Date(report.created_at).toLocaleString("en-IN")}
                </p>
              </div>
              {report.photo_url && (
                <img
                  src={report.photo_url.startsWith("http") ? report.photo_url : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/${report.photo_url.replace(/^\//, "")}`}
                  alt="Flood photo"
                  className="w-20 h-20 rounded-lg object-cover ml-3"
                  onError={(e) => e.currentTarget.style.display = "none"}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

