import React, { useState } from 'react';
import { AlertCircle, ShieldAlert, Key, ChevronRight, FileCode, CheckCircle2 } from 'lucide-react';
import RemediationPanel from './RemediationPanel';

export default function ResultsTable({ results = [] }) {
  const [selectedMatch, setSelectedMatch] = useState(null);

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5 animate-pulse"></span>
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-1.5"></span>
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            LOW
          </span>
        );
    }
  };

  if (!results || results.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-md font-semibold text-slate-200">Zero Vulnerabilities Detected</h3>
        <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto">
          No exposed secrets, plain-text API keys, or misconfigured paths were identified during the active scanning pass.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
      {/* Table Title Bar */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="text-md font-bold text-slate-100">Telemetry Scan Results</h3>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {results.length} Secret{results.length > 1 ? 's' : ''} Flagged
        </span>
      </div>

      {/* Results Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-mono text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-6 font-semibold">Severity</th>
              <th className="py-3.5 px-4 font-semibold">Secret Type</th>
              <th className="py-3.5 px-4 font-semibold">Entropy</th>
              <th className="py-3.5 px-4 font-semibold">Target Source</th>
              <th className="py-3.5 px-4 font-semibold">Redacted Match</th>
              <th className="py-3.5 px-6 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {results.map((item, idx) => (
              <tr
                key={idx}
                onClick={() => setSelectedMatch(item)}
                className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
              >
                {/* Severity */}
                <td className="py-4 px-6 font-medium whitespace-nowrap">
                  {getSeverityBadge(item.severity)}
                </td>

                {/* Secret Type */}
                <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-200">
                  <div className="flex items-center space-x-2">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{item.type}</span>
                  </div>
                </td>

                {/* Entropy Score */}
                <td className="py-4 px-4 whitespace-nowrap">
                  {item.entropyScore ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${
                      item.entropyClassification === 'Verified High Entropy Secret'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                    }`}>
                      H: {item.entropyScore.toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono">N/A</span>
                  )}
                </td>

                {/* Target Source File / URL */}
                <td className="py-4 px-4 max-w-xs truncate font-mono text-slate-300" title={item.source}>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <FileCode className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{item.source.replace(' (Historical Leak)', '')}</span>
                    </div>
                    {item.source && item.source.includes('(Historical Leak)') && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 w-max">
                        Historical Leak
                      </span>
                    )}
                  </div>
                </td>

                {/* Redacted Preview */}
                <td className="py-4 px-4 font-mono text-rose-300 font-semibold select-all">
                  <span className="bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800/80 inline-block">
                    {item.redactedPreview}
                  </span>
                </td>

                {/* Remediation Action Link */}
                <td className="py-4 px-6 text-right whitespace-nowrap">
                  <span className="inline-flex items-center text-cyan-400 group-hover:text-cyan-300 font-medium group-hover:underline">
                    Remediate
                    <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-out Remediation Drawer */}
      <RemediationPanel
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
      />
    </div>
  );
}
