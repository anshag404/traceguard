import React, { useState } from 'react';
import axios from 'axios';
import { Shield, Search, Globe, GitBranch, AlertTriangle, Activity, Terminal, Sparkles, Loader2 } from 'lucide-react';
import ResultsTable from './components/ResultsTable';
import ExportReport from './components/ExportReport';

const API_BASE = 'http://localhost:5000';

export default function App() {
  const [targetType, setTargetType] = useState('github'); // 'github' | 'web'
  const [targetValue, setTargetValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [scanMeta, setScanMeta] = useState(null);
  const [scanError, setScanError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetValue.trim()) return;

    setIsScanning(true);
    setScanResults([]);
    setScanMeta(null);
    setScanError(null);

    const endpoint =
      targetType === 'github'
        ? `${API_BASE}/api/scan/github`
        : `${API_BASE}/api/scan/web`;

    try {
      const { data } = await axios.post(endpoint, { target: targetValue.trim() });

      setScanResults(data.secrets || []);
      setScanMeta({
        scanType: data.scanType,
        target: data.target,
        scannedAt: data.scannedAt,
        summary: data.summary,
        totalRepos: data.totalRepos,
        scriptBundlesFound: data.scriptBundlesFound,
        probesRun: data.probesRun,
      });
    } catch (err) {
      const message =
        err.response?.data?.error || err.message || 'Scan request failed unexpectedly.';
      setScanError(message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                TRACEGUARD
              </h1>
              <p className="text-xs text-slate-400 font-mono">Automated OSINT & Secret Scanning Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-ping"></span>
              Engine Ready
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Target Configuration Card */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Target Configuration</h2>
                <p className="text-sm text-slate-400">Select scanning vector and enter target parameters</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Target Vector Selector */}
              <div className="md:col-span-1">
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                  Scan Vector
                </label>
                <div className="relative">
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm font-medium focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="github">GitHub Username</option>
                    <option value="web">Web URL</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    {targetType === 'github' ? (
                      <GitBranch className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Globe className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Target Input Field */}
              <div className="md:col-span-3">
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                  Target Parameter
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    {targetType === 'github' ? (
                      <GitBranch className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Globe className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder={
                      targetType === 'github'
                        ? 'Enter GitHub username (e.g. octocat)...'
                        : 'Enter URL (e.g. https://example.com)...'
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-11 pr-32 py-3 text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                  />

                  <button
                    type="submit"
                    disabled={isScanning || !targetValue.trim()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-5 rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-sm transition-all duration-200 shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Run Scan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </form>
        </section>

        {/* Scanning Spinner Overlay */}
        {isScanning && (
          <section className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-10 text-center space-y-4 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 mx-auto flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
            <h3 className="text-md font-semibold text-slate-200">Active Scan in Progress</h3>
            <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
              {targetType === 'github'
                ? `Fetching public repositories and scanning commit history for "${targetValue}"...`
                : `Probing ${targetValue} — extracting script bundles and testing exposed paths...`}
            </p>
          </section>
        )}

        {/* Scan Error Display */}
        {scanError && !isScanning && (
          <section className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-6 flex items-start space-x-4">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose-300">Scan Failed</h3>
              <p className="text-xs text-rose-400/80 font-mono mt-1">{scanError}</p>
            </div>
          </section>
        )}

        {/* Scan Metadata Summary Bar */}
        {scanMeta && !isScanning && (
          <section className="bg-slate-900/40 border border-slate-800 rounded-xl px-6 py-4 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-6 text-slate-400">
              <span>Type: <span className="text-slate-200 font-semibold uppercase">{scanMeta.scanType}</span></span>
              <span>Target: <span className="text-slate-200">{scanMeta.target}</span></span>
              <span>Scanned: <span className="text-slate-200">{new Date(scanMeta.scannedAt).toLocaleString()}</span></span>
            </div>
            {scanMeta.summary && (
              <div className="flex items-center space-x-3">
                {scanMeta.summary.critical > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">{scanMeta.summary.critical} CRITICAL</span>
                )}
                {scanMeta.summary.high > 0 && (
                  <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">{scanMeta.summary.high} HIGH</span>
                )}
                {scanMeta.summary.medium > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">{scanMeta.summary.medium} MEDIUM</span>
                )}
              </div>
            )}
            <div>
              <ExportReport scanMeta={scanMeta} results={scanResults} />
            </div>
          </section>
        )}

        {/* Scan Results Table & Remediation Panel */}
        {!isScanning && (scanResults.length > 0 || scanMeta) && (
          <section>
            <ResultsTable results={scanResults} />
          </section>
        )}

      </main>

      {/* Status Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <span>TraceGuard Security Engine v1.0.0</span>
          <span className="flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Authorized Security Auditing Mode Only</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
