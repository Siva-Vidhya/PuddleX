"use client";

import React, { useState, useEffect } from 'react';
import { Database, AlertCircle, Save, CheckCircle2, Shield, LayoutDashboard, BarChart3, Activity, ShieldAlert, ArrowRight } from 'lucide-react';
type RiskLevel = "low" | "medium" | "high";
interface RoadSegment {
  id: number | string;
  osm_id?: string;
  name: string | null;
  coordinates?: [number, number][];
  risk?: RiskLevel;
  flood_risk?: RiskLevel;
  highway?: string;
  is_flood_prone?: boolean;
  flood_count?: number;
  rainfall_mm?: number;
  [key: string]: any;
}
import Loader from '@/components/Loader';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("admin@example.com");
  const [loginPassword, setLoginPassword] = useState("admin");
  const [loginError, setLoginError] = useState("");

  const [roads, setRoads] = useState<RoadSegment[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    if (savedToken) {
      setToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: loginEmail, password: loginPassword })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.role === "admin") {
          setToken(data.access_token);
          localStorage.setItem("admin_token", data.access_token);
        } else {
          setLoginError("Access denied. Admin role required.");
        }
      } else {
        setLoginError("Invalid credentials.");
      }
    } catch (err) {
      setLoginError("Network error.");
    }
    setLoading(false);
  };

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const [roadsRes, reportsRes] = await Promise.all([
        fetch(`${apiUrl}/api/roads`),
        fetch(`${apiUrl}/api/reports`)
      ]);
      if (!roadsRes.ok || !reportsRes.ok) throw new Error("Fetch failed");
      const roadsData = await roadsRes.json();
      const reportsData = await reportsRes.json();
      setRoads(Array.isArray(roadsData) ? roadsData : (roadsData.roads || []));
      setReports(reportsData);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
      setErrorMsg("We couldn't load the dashboard data. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrainageUpdate = async (id: string, newScore: number) => {
    if (newScore < 1 || newScore > 100) return;
    setUpdatingId(id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/roads/${id}/drainage`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ drainage_score: newScore })
      });
      
      if (res.ok) {
        setSuccessMsg(`Updated drainage score for ${id}`);
        setTimeout(() => setSuccessMsg(""), 3000);
        setRoads(roads.map(r => r.id === id ? { ...r, drainage_score: newScore } : r));
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      console.error("Failed to update drainage:", err);
      setErrorMsg("Failed to update drainage score. Please try again.");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReportStatus = async (id: string, newStatus: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/reports/${id}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        setSuccessMsg(`Report marked as ${newStatus}`);
        setTimeout(() => setSuccessMsg(""), 3000);
        setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      console.error("Failed to update report:", err);
      setErrorMsg("Failed to update report status.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  if (loading) {
    return <Loader fullScreen text="Loading dashboard..." />;
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-soft border border-card-border p-8">
          <div className="flex flex-col items-center mb-8">
            <Shield className="w-12 h-12 text-brand-primary mb-4" />
            <h1 className="text-2xl font-heading font-bold text-ink-heading">Admin Login</h1>
          </div>
          {loginError && <div className="bg-risk-high/10 text-risk-high p-3 rounded-lg mb-6 text-sm">{loginError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Admin Email" />
            <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Password" />
            <button type="submit" className="w-full bg-brand-primary text-white py-3 rounded-xl font-semibold hover:bg-brand-dark">Login to Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  const highRiskCount = roads.filter(r => r.risk === "high").length;
  const pendingReportsCount = reports.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-bg-primary p-4 md:p-8 text-ink-body">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-brand-primary" />
            <h1 className="font-heading font-bold text-3xl text-ink-heading">Municipal Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2 rounded-full border border-card-border shadow-sm text-sm font-semibold text-brand-primary">
              Admin Access
            </div>
            <button onClick={() => { setToken(null); localStorage.removeItem("admin_token"); }} className="text-sm text-ink-body hover:text-brand-primary font-medium">Logout</button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-risk-high/10 border border-risk-high/20 text-risk-high p-4 rounded-xl mb-6 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm">{errorMsg}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-soft border border-card-border flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-body mb-1">Pending Reports</p>
              <h3 className="text-2xl font-bold font-heading text-ink-heading">{pendingReportsCount}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-soft border border-card-border flex items-center gap-4">
            <div className="w-12 h-12 bg-risk-high/10 text-risk-high rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-body mb-1">High-Risk Roads</p>
              <h3 className="text-2xl font-bold font-heading text-ink-heading">{highRiskCount}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-soft border border-card-border flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-body mb-1">Model Accuracy</p>
              <h3 className="text-2xl font-bold font-heading text-ink-heading">92.4%</h3>
            </div>
          </div>
        </div>

        {successMsg && (
          <div className="bg-risk-low/10 border border-risk-low/20 text-risk-low p-4 rounded-xl mb-8 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reports Management */}
          <div>
            <h2 className="font-heading font-bold text-xl text-ink-heading mb-4 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-brand-primary" />
              Citizen Reports
            </h2>
            <div className="bg-white rounded-2xl shadow-soft border border-card-border overflow-hidden">
              {reports.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 bg-risk-low/10 text-risk-low rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-ink-heading mb-1">No pending reports!</h3>
                  <p className="text-sm text-ink-body">Everything looks clear and safe today.</p>
                </div>
              ) : (
                <div className="divide-y divide-card-border max-h-[600px] overflow-y-auto">
                  {reports.map(report => (
                    <div key={report.id} className="p-5 hover:bg-bg-secondary/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                          ${report.status === 'verified' ? 'bg-risk-low/10 text-risk-low' : 
                            report.status === 'dismissed' ? 'bg-ink-body/10 text-ink-body' : 
                            'bg-accent/10 text-accent'}`}>
                          {report.status}
                        </span>
                        <span className="text-xs text-ink-body">{new Date(report.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-ink-heading font-semibold">Depth: {report.water_depth} | Severity: {report.severity}</p>
                      <p className="text-sm text-ink-body mt-1">"{report.notes || 'No notes provided'}"</p>
                      {report.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <button 
                            onClick={() => handleReportStatus(report.id, 'verified')}
                            className="px-4 py-1.5 bg-risk-low/10 text-risk-low font-semibold rounded-lg text-sm hover:bg-risk-low/20 transition-colors"
                          >
                            Verify
                          </button>
                          <button 
                            onClick={() => handleReportStatus(report.id, 'dismissed')}
                            className="px-4 py-1.5 border border-card-border text-ink-body font-semibold rounded-lg text-sm hover:bg-bg-secondary transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Drainage Management */}
          <div>
            <h2 className="font-heading font-bold text-xl text-ink-heading mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-primary" />
              Drainage Overrides
            </h2>
            <div className="bg-white rounded-2xl shadow-soft border border-card-border overflow-hidden h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-bg-secondary z-10 border-b border-card-border">
                  <tr>
                    <th className="p-4 font-heading font-semibold text-sm text-ink-heading">Road Name</th>
                    <th className="p-4 font-heading font-semibold text-sm text-ink-heading">Drainage Score</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/50">
                  {roads.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-sm text-ink-body">No road data available.</td>
                    </tr>
                  ) : (
                    roads.map(road => (
                      <tr key={road.id} className="hover:bg-bg-secondary/30">
                        <td className="p-4">
                          <p className="font-semibold text-ink-heading text-sm">{road.name}</p>
                          <p className="text-xs text-ink-body mt-0.5">Risk: {road.risk}</p>
                        </td>
                        <td className="p-4">
                          <input 
                            aria-label="Drainage Score"
                            type="number" 
                            min="1" 
                            max="100" 
                            defaultValue={road.drainage_score || 50}
                            className="w-20 px-3 py-1.5 border border-card-border rounded-lg bg-bg-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (val !== road.drainage_score) {
                                handleDrainageUpdate(String(road.id), val);
                              }
                            }}
                          />
                        </td>
                        <td className="p-4 text-right">
                          {updatingId === road.id ? (
                            <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin inline-block"></div>
                          ) : (
                            <Save className="w-4 h-4 text-ink-body opacity-30" />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
