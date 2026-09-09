import React, { useState } from 'react';
import { Shield, Search, Globe, GitBranch, AlertTriangle, Activity, Lock, Terminal, Sparkles } from 'lucide-react';
import ResultsTable from './components/ResultsTable';

// Mock scan telemetry for testing Phase 5 UI components
const MOCK_RESULTS = [
  {
    type: 'AWS Access Key',
    severity: 'CRITICAL',
    source: 'https://raw.githubusercontent.com/org/repo/main/.env',
    redactedPreview: 'AKIA••••••••MPLE',
    description: 'AWS IAM Access Key ID exposed in root config environment file.',
  },
  {
    type: 'Firebase Config',
    severity: 'HIGH',
    source: 'https://example-app.com/assets/index-bundle.js',
    redactedPreview: 'AIza••••••••tUvW',
    description: 'Public Web API Key with un-restricted domain origin policy.',
  },
  {
    type: 'Exposed Server File',
    severity: 'CRITICAL',
    source: 'https://example-app.com/.env',
    redactedPreview: 'DB_PASSWORD=••••••••',
    description: 'HTTP 200 OK — Raw `.env` configuration file accessible directly from public web root.',
  },
  {
    type: 'RSA Private Key',
    severity: 'CRITICAL',
    source: 'https://github.com/user/dev-scripts/blob/master/id_rsa',
    redactedPreview: '----••••••••----',
    description: 'Unencrypted 2048-bit RSA Private Key stored in git version control.',
  },
  {
    type: 'Bearer Token',
    severity: 'HIGH',
    source: 'https://example-app.com/api/v1/logs',
    redactedPreview: 'Bear••••••••sw5c',
    description: 'JWT Authorization Bearer token leaked in cleartext server log endpoint.',
  },
];

export default function App() {
  const [targetType, setTargetType] = useState('github'); // 'github' | 'web'
  const [targetValue, setTargetValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(MOCK_RESULTS); // Populated with mock data for testing

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetValue.trim()) return;

    setIsScanning(true);
    
    // Simulate active scan pass
    setTimeout(() => {
      setIsScanning(false);
    }, 1200);
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

            <button
              onClick={() => setScanResults(MOCK_RESULTS)}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-md transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Mock Telemetry</span>
            </button>
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
                        <Activity className="w-4 h-4 animate-spin" />
                        <span>Probing...</span>
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

        {/* Scan Results Table & Slide-out Remediation Panel */}
        <section>
          <ResultsTable results={scanResults} />
        </section>

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
