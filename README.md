<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />
</p>

# 🛡️ TraceGuard

**Automated OSINT & Secret Scanning Platform**

TraceGuard is a full-stack security auditing tool that combines GitHub repository intelligence gathering, web application reconnaissance, and regex-based secret detection into a unified scanning platform with an interactive threat remediation dashboard.

> ⚠️ **This tool is intended strictly for authorized security auditing and defensive posture management.** See the [Ethical Usage Disclaimer](#-ethical-usage-disclaimer) below.

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ Target Config │  │  ResultsTable    │  │ RemediationPanel  │  │
│  │    Form       │  │  (Threat Grid)   │  │ (Slide-out Drawer)│  │
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
│  │   POST /api/scan/web ─────► webScanner.js ────┤            │  │
│  │   GET  /api/health                            │            │  │
│  │                                               ▼            │  │
│  │                                      secretEngine.js       │  │
│  │                                     (Regex Heuristics)     │  │
│  │                                           │                │  │
│  │                                           ▼                │  │
│  │                                   Unified JSON Report      │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Layer | Component | Technology | Purpose |
|-------|-----------|------------|---------|
| **Frontend** | `App.jsx` | React 19, Vite | Target config form, state management, API orchestration |
| **Frontend** | `ResultsTable.jsx` | React, Tailwind CSS | Threat telemetry grid with severity badges |
| **Frontend** | `RemediationPanel.jsx` | React, Tailwind CSS | Slide-out drawer with type-specific mitigation playbooks |
| **Backend** | `server.js` | Express 5, Helmet, CORS | API routing, middleware security headers |
| **Backend** | `githubScanner.js` | Octokit REST | GitHub OSINT — public repos, commit history extraction |
| **Backend** | `webScanner.js` | Axios, Cheerio | Web recon — script bundle extraction, exposed file probing |
| **Backend** | `secretEngine.js` | Native RegExp | Heuristic pattern matching across 10 secret types |

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

Verify the server is running:

```bash
curl http://localhost:5000/api/health
# → { "status": "ok", "message": "TraceGuard Backend is healthy" }
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --port 3000
```

Open **http://localhost:3000** in your browser.

### 4. Run Test Suites

```bash
# From the backend/ directory
node tests/testScanners.js       # GitHub + Web scanner tests
node tests/testSecretEngine.js   # Secret engine regex tests (8 test cases)
```

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
| `/actuator/env` | 🔴 CRITICAL | Spring Boot environment — database URIs, cloud provider keys, internal service mesh endpoints |

> The `/actuator/env` probe specifically targets **Spring Boot Actuator** misconfigurations, a common attack surface in Java microservice deployments where environment variables containing secrets are exposed via unsecured management endpoints.

---

## 🛠️ API Reference

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{ "status": "ok", "message": "TraceGuard Backend is healthy" }
```

### `POST /api/scan/github`

Scan a GitHub user's public repositories and commit history for leaked secrets.

**Request Body:**
```json
{ "target": "octocat" }
```

**Response:**
```json
{
  "scanType": "github",
  "target": "octocat",
  "scannedAt": "2026-09-10T18:05:30.000Z",
  "totalRepos": 8,
  "totalCommitsScanned": 26,
  "secrets": [ ... ],
  "summary": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
}
```

### `POST /api/scan/web`

Scan a web application for client-side secret leaks and server-side misconfigurations.

**Request Body:**
```json
{ "target": "https://example.com" }
```

**Response:**
```json
{
  "scanType": "web",
  "target": "https://example.com",
  "scannedAt": "2026-09-10T18:05:30.000Z",
  "scriptBundlesFound": 3,
  "probesRun": 4,
  "secrets": [ ... ],
  "summary": { "critical": 1, "high": 2, "medium": 0, "low": 0 }
}
```

---

## 📁 Project Structure

```
traceguard/
├── backend/
│   ├── server.js                  # Express API server & route definitions
│   ├── services/
│   │   ├── githubScanner.js       # GitHub OSINT via Octokit REST API
│   │   ├── webScanner.js          # Web recon: script extraction + path probing
│   │   └── secretEngine.js        # Regex heuristic secret detection engine
│   ├── tests/
│   │   ├── testScanners.js        # Integration tests for scanner services
│   │   └── testSecretEngine.js    # Unit tests for regex engine (8 cases)
│   ├── package.json
│   └── .env                       # (Optional) GitHub token config
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main app: target config, API calls, state
│   │   ├── components/
│   │   │   ├── ResultsTable.jsx   # Threat telemetry table with severity badges
│   │   │   └── RemediationPanel.jsx  # Slide-out remediation playbook drawer
│   │   ├── index.css              # Tailwind CSS dark theme setup
│   │   └── main.jsx               # React entry point
│   ├── vite.config.js             # Vite + Tailwind plugin configuration
│   └── package.json
│
├── .gitignore
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
