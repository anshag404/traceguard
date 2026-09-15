import React from 'react';
import { X, ShieldAlert, Key, AlertOctagon, CheckCircle2, Copy, ExternalLink, FileText } from 'lucide-react';

const REMEDIATION_GUIDES = {
  'AWS Access Key': {
    title: 'Rotate AWS IAM Credentials',
    severity: 'CRITICAL',
    steps: [
      'Log into the AWS IAM Management Console.',
      'Locate the affected IAM User and navigate to Security Credentials.',
      'Deactivate the compromised Access Key ID immediately.',
      'Check AWS CloudTrail logs for unauthorized API calls made during the exposure window.',
      'Generate a new Access Key pair and securely store it in AWS Secrets Manager or Vault.',
      'Delete the deactivated Access Key after verifying service continuity.'
    ],
    cliCmd: 'aws iam update-access-key --access-key-id <KEY_ID> --status Inactive'
  },
  'AWS Secret Key': {
    title: 'Revoke & Rotate AWS Secret Key',
    severity: 'CRITICAL',
    steps: [
      'Access AWS IAM Console -> Users -> Security Credentials.',
      'Deactivate and delete the associated Access Key Pair.',
      'Audit CloudTrail logs for any anomalous resource creation or data access.',
      'Issue a new Key Pair and update application runtime environment variables.'
    ],
    cliCmd: 'aws iam create-access-key --user-name <COMPROMISED_USER>'
  },
  'RSA Private Key': {
    title: 'Revoke Compromised RSA Private Key',
    severity: 'CRITICAL',
    steps: [
      'Remove the corresponding public key from all target `~/.ssh/authorized_keys` files.',
      'Revoke any TLS/SSL certificates tied to this RSA key in your CA management portal.',
      'Generate a fresh 4096-bit RSA or Ed25519 key pair (`ssh-keygen -t ed25519`).',
      'Distribute the new public key to authorized hosts via configuration management.'
    ],
    cliCmd: 'ssh-keygen -t ed25519 -C "admin@traceguard.internal"'
  },
  'Firebase Config': {
    title: 'Restrict Firebase Web API Key',
    severity: 'HIGH',
    steps: [
      'Open Google Cloud Console -> APIs & Services -> Credentials.',
      'Select the exposed Firebase Web API Key.',
      'Set Application Restrictions to specific HTTP Referrers (e.g., `https://yourdomain.com/*`).',
      'Set API Restrictions to only allow required Firebase services (Auth, Firestore, App Check).',
      'Enforce Firebase App Check to block unauthorized non-browser API clients.'
    ],
    cliCmd: 'gcloud services enable firebaseappcheck.googleapis.com'
  },
  'GitHub Token': {
    title: 'Revoke GitHub Personal Access Token',
    severity: 'CRITICAL',
    steps: [
      'Go to GitHub.com -> Settings -> Developer Settings -> Personal Access Tokens.',
      'Identify and Revoke the exposed token immediately.',
      'Review GitHub Security Audit Logs for unusual clone operations or repo modifications.',
      'Generate a fine-grained PAT with minimal required scope permissions.'
    ]
  },
  'Bearer Token': {
    title: 'Invalidate Active Bearer Session',
    severity: 'HIGH',
    steps: [
      'Invalidate the JWT token ID or user session in your Redis/Database token blacklist.',
      'Rotate the JWT signing secret (`JWT_SECRET`) if key leakage is suspected.',
      'Force user re-authentication across all active application sessions.',
      'Audit server logs for endpoints accessed with the compromised Bearer token.'
    ]
  },
  'Exposed Server File': {
    title: 'Block Public Access to Exposed Server Configuration',
    severity: 'CRITICAL',
    steps: [
      'Update Nginx / Apache web server configuration to reject requests to sensitive dotfiles.',
      'Ensure `.env` and `.git` directories are located outside the public web server root (`public/` or `html/`).',
      'Purge sensitive git history if `.git` was exposed via `git filter-repo` or BFG Repo-Cleaner.',
      'Verify server headers return HTTP 403 Forbidden or 404 Not Found for direct URL hits.'
    ],
    cliCmd: `# Nginx Block Snippet\nlocation ~ /\\.(env|git|config) {\n    deny all;\n    return 404;\n}`
  }
};

export default function RemediationPanel({ match, onClose }) {
  if (!match) return null;

  const guide = REMEDIATION_GUIDES[match.type] || REMEDIATION_GUIDES['AWS Access Key'];

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex justify-end transition-opacity duration-300">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-y-auto animate-in slide-in-from-right duration-300">
        
        {/* Panel Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">{guide.title}</h2>
                <span className={`px-2 py-0.5 text-xs font-mono font-semibold rounded border ${getSeverityStyle(match.severity)}`}>
                  {match.severity}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Automated Incident Response Plan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Content Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Telemetry Summary Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Exposure Context</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Secret Type</span>
                <span className="font-semibold text-slate-200">{match.type}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Source Target</span>
                <span className="font-semibold text-slate-200 truncate block">{match.source}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 text-xs block mb-1">Redacted Match Preview</span>
              <div className="bg-slate-900 border border-slate-800 rounded px-3 py-2 font-mono text-xs text-rose-300 break-all select-all">
                {match.redactedPreview}
              </div>
            </div>
          </div>

          {/* Actionable Mitigation Steps */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              <span>Recommended Remediation Playbook</span>
            </h3>

            <div className="space-y-3">
              {guide.steps.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-xs flex items-center justify-center font-bold border border-cyan-500/20">
                    {idx + 1}
                  </span>
                  <p className="text-slate-300 leading-relaxed font-sans pt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CLI Helper Snippet (if available) */}
          {guide.cliCmd && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Quick Command Line Fix</h4>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-400 relative group overflow-x-auto whitespace-pre">
                <code>{guide.cliCmd}</code>
              </div>
            </div>
          )}

        </div>

        {/* Panel Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 sticky bottom-0 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-mono">TraceGuard Security Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-md transition-colors"
          >
            Close Drawer
          </button>
        </div>

      </div>
    </div>
  );
}
