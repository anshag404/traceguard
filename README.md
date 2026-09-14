<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />
</p>

# 🛡️ TraceGuard

**Automated OSINT, Secret Scanning & DevSecOps Platform**

TraceGuard is a full-stack security auditing tool that combines GitHub repository intelligence gathering, deep commit history analysis, web application reconnaissance, passive subdomain enumeration, and regex-based secret detection into a unified scanning platform.

With features like Shannon Entropy analysis, PDF Security Advisory generation, a Real-Time OSINT Chrome Extension, and a local Pre-Commit Hook, TraceGuard scales from an interactive dashboard to a proactive CI/CD developer tool.

> ⚠️ **This tool is intended strictly for authorized security auditing and defensive posture management.** See the [Ethical Usage Disclaimer](#-ethical-usage-disclaimer) below.

---

## ✨ Enterprise Features

- **Shannon Entropy Analysis**: Advanced cryptographic entropy calculations to filter out test data and isolate true, verified high-entropy secrets.
- **Deep Git Commit History Scanning**: Extends the GitHub API scanner to retrieve and diff historical commits, hunting down deleted leaks.
- **Passive Subdomain Enumeration**: Integrates with `crt.sh` Certificate Transparency logs to dynamically expand the web target's attack surface.
- **Automated PDF Advisory Generation**: Instantly generate structured executive summaries and mitigation playbooks directly from the dashboard using `jsPDF`.
- **Real-Time OSINT Browser Extension**: A Chrome extension that injects TraceGuard's heuristic scanner directly into the browser, alerting analysts to exposed secrets in real-time.
- **Proactive Pre-Commit Git Hook**: A local developer CLI tool that automatically scans staged files and rejects commits if secrets are detected.

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ Target Config │  │  ResultsTable    │  │ RemediationPanel  │  │
│  │    Form       │  │ (Threat Grid)    │  │ & PDF Generator   │  │
│  └──────┬───────┘  └────────▲─────────┘  └────────▲──────────┘  │
│         │                   │                     │              │
│         │          Axios POST Request      Row Click Event       │
│         ▼                   │                     │              │
│  ┌──────────────────────────┴─────────────────────┘              │
│  │              App.jsx (State Management)                       │
│  └──────────────────────────┬────────────────────────────────────┘
│                             │
│                    HTTP POST to :5000
│                             │
├─────────────────────────────┼───────────────────────────────────┤
│                             ▼                                   │
│                   BACKEND (Express.js)                          │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    server.js (API Router)                  │  │
│  │                                                            │  │
│  │   POST /api/scan/github ──► githubScanner.js ─┐            │  │
│  │   POST /api/scan/web ─────► subdomainScanner  ├──► web     │  │
│  │   POST /api/scan/text ────┐                   │            │  │
│  │                           ▼                   ▼            │  │
│  │                                      secretEngine.js       │  │
│  │                                 (Regex + Shannon Entropy)  │  │
│  │                                           │                │  │
│  │                                           ▼                │  │
│  │                                   Unified JSON Report      │  │
│  └────────────────────────────────────────────────────────────┘  │
├─────────────────────────────┬───────────────────────────────────┤
│                             │                                   │
│  ┌───────────────────────┐  │  ┌─────────────────────────────┐  │
│  │ Browser Extension     ├──┘  │ Pre-Commit CLI Hook         │  │
│  │ (Live DOM scraping)   │     │ (Local Staged File scanner) │  │
│  └───────────────────────┘     └─────────────┬───────────────┘  │
│                                              │                  │
│                                              ▼                  │
│                                     Local secretEngine logic    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- (Optional) A **GitHub Personal Access Token** for higher API rate limits

### 1. Clone the Repository

```bash
git clone https://github.com/anshag404/traceguard.git
cd traceguard
```

### 2. Backend Setup

```bash
cd backend
npm install
```

**(Optional)** Create a `.env` file for GitHub token authentication:

```env
GITHUB_TOKEN=ghp_your_personal_access_token_here
PORT=5000
```

Start the backend server:

```bash
node server.js
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --port 3000
```

Open **http://localhost:3000** in your browser.

### 4. CI/CD Pre-Commit Hook Setup (DevSecOps)

To protect your local environment from committing secrets:

```bash
node scripts/install-hook.js
```
*Now, any `git commit` containing high-entropy secrets will be immediately aborted!*

### 5. Chrome Extension Setup

1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `traceguard/browser-extension` folder.
4. Browse any public site (e.g., GitHub, Pastebin) while the TraceGuard Backend is running.

---

## 🔍 Detected Secret Types

TraceGuard's regex heuristic engine scans for the following credential and configuration leaks:

### GitHub & Code Repository Secrets

| Secret Type | Severity | Detection Pattern | Example Match |
|---|---|---|---|
| **AWS Access Key** | 🔴 CRITICAL | `AKIA[0-9A-Z]{16}` prefix | `AKIA••••••••MPLE` |
| **AWS Secret Key** | 🔴 CRITICAL | `aws_secret_access_key=` + 40-char base64 | `wJal••••••••EKEY` |
| **RSA Private Key** | 🔴 CRITICAL | `-----BEGIN RSA PRIVATE KEY-----` PEM block | `----••••••••----` |
| **Private Key (Generic)** | 🔴 CRITICAL | EC / DSA / OpenSSH PEM blocks | `----••••••••----` |
| **GitHub Token** | 🔴 CRITICAL | `ghp_` / `gho_` / `ghu_` / `ghs_` / `ghr_` prefix | `ghp_••••••••1234` |
| **Slack Token** | 🟠 HIGH | `xoxb-` / `xoxp-` / `xoxs-` prefix | `xoxb••••••••UvWx` |
| **Firebase Config** | 🟠 HIGH | `AIza[0-9A-Za-z_-]{35}` | `AIza••••••••tUvW` |
| **Firebase Project Config** | 🟡 MEDIUM | `apiKey`, `authDomain`, `databaseURL` assignments | `apiK••••••••UvW"` |
| **Bearer Token** | 🟠 HIGH | `Bearer <JWT/token>` pattern | `Bear••••••••sw5c` |
| **Generic API Key** | 🟡 MEDIUM | `api_key=`, `api_secret=`, `api_token=` | `sk_l••••••••7890` |

### Server-Side Misconfigurations (Web Probe)

| Exposed Path | Risk | What It Reveals |
|---|---|---|
| `/.env` | 🔴 CRITICAL | Database passwords, API keys, JWT secrets, SMTP credentials |
| `/.git/config` | 🔴 CRITICAL | Repository remote URLs, internal infrastructure hostnames |
| `/config.json` | 🟠 HIGH | Application configuration, service account credentials |
| `/actuator/env` | 🔴 CRITICAL | Spring Boot environment — database URIs, cloud provider keys |

---

## 📁 Project Structure

```
traceguard/
├── backend/
│   ├── server.js                  # Express API server & route definitions
│   ├── services/
│   │   ├── githubScanner.js       # GitHub OSINT via Octokit REST API (including deep diffs)
│   │   ├── subdomainScanner.js    # Passive crt.sh Subdomain Enumeration
│   │   ├── webScanner.js          # Web recon: script extraction + path probing
│   │   └── secretEngine.js        # Regex & Shannon Entropy detection engine
│   ├── tests/                     # Integration and Unit tests
│   └── .env                       # (Optional) GitHub token config
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main app state
│   │   ├── components/
│   │   │   ├── ResultsTable.jsx   # Threat telemetry table
│   │   │   ├── RemediationPanel.jsx
│   │   │   └── ExportReport.jsx   # jsPDF Security Advisory Generator
│   └── vite.config.js
│
├── browser-extension/             # Real-Time OSINT Chrome Extension (Manifest V3)
├── cli/                           # Pre-Commit Node CLI
├── scripts/                       # Automated Install scripts
└── README.md
```

---

## ⚖️ Ethical Usage Disclaimer

> **IMPORTANT — READ BEFORE USE**

TraceGuard is a **defensive security auditing tool** designed exclusively for:

- ✅ **Authorized penetration testing** on systems you own or have explicit written permission to test
- ✅ **Internal security posture assessments** for your organization's own infrastructure
- ✅ **Educational and research purposes** in controlled lab environments
- ✅ **Bug bounty programs** where the target scope explicitly permits this type of reconnaissance

### Prohibited Use

This tool **must NOT** be used for:

- ❌ Unauthorized scanning of systems you do not own or have permission to test
- ❌ Harvesting credentials for unauthorized access to any system
- ❌ Any activity that violates the **Computer Fraud and Abuse Act (CFAA)**, **GDPR**, or equivalent legislation in your jurisdiction
- ❌ Exploitation of discovered secrets — all findings must be reported through responsible disclosure channels

### User Responsibility

By using TraceGuard, you acknowledge that:

1. **You are solely responsible** for ensuring all scanning activities are authorized and legal in your jurisdiction.
2. **Discovered secrets must be handled ethically** — rotate, revoke, and report through proper incident response channels.
3. **The developers of TraceGuard accept no liability** for misuse, unauthorized access, or any damages resulting from the use of this tool.
4. **All scans should follow the principle of minimal intrusion** — gather only the intelligence necessary for defensive assessment.

> _"The goal of security tooling is not to break systems, but to make them stronger."_

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built for Defensive Security Posture Management</strong><br>
  <sub>TraceGuard — Automated OSINT & Secret Scanning Platform</sub>
</p>
