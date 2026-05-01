# VoteDisha — India's Action-First Voter Guide

A deterministic civic action engine that tells Indian voters exactly what to do next — powered by logic, explained by AI.

## The problem

Voter participation in India is often hampered by process complexity and fragmented information. Voters, especially first-time and youth electors, struggle to understand specific registration deadlines and polling requirements for their local state assembly cycles.

Existing AI-powered tools often exacerbate this by providing generic or hallucinated information about election dates and legal requirements. In a civic context, hallucination isn't just a bug; it's a safety and democratic risk that can lead to disenfranchisement.

## The solution

VoteDisha solves this by decoupling "The Fact" from "The Voice". Every voter assessment is resolved using a deterministic TypeScript engine anchored to the hardcoded `ELECTION_DB`. The logic evaluates age, registration status, and localized deadlines to place every user into one of 7 immutable states.

Generative AI (Gemini 2.5 Flash via Vertex AI or AI Studio) is used solely as a narrator to translate these complex results into natural language explanations. **The LLM has zero authority over facts.** This "Fact Fence" ensures that every date, link, and instruction provided is source-of-truth accurate.

## Key innovation: Logic-Deterministic Architecture

VoteDisha uses a **Fact Fence** to prevent AI hallucinations. The resolver logic is purely functional and testable, while the AI only explains the output of that logic.

```text
User input → resolveVoterState() → ActionCard
                     ↑
              ELECTION_DB (hardcoded)
              TypeScript strict mode
              7 deterministic states
                     ↓
              Gemini 2.5 Flash (narrator only)
              "Explain this. Do not invent dates."
```

## The 8 voter states

| State | Triggered when | What user sees |
| :--- | :--- | :--- |
| **INELIGIBLE** | age < 18 | Learn mode & future registration info |
| **REGISTRATION_GAP** | eligible, unregistered, open | Form 6 checklist + deadline countdown |
| **DEADLINE_LOCKED** | deadline passed, unregistered | Next cycle guidance & electoral roll link |
| **READY_TO_VOTE** | registered, pre-polling | Booth finder + polling day countdown |
| **VOTING_WINDOW_OPEN** | polling day itself | Live booth map + voting instructions |
| **AWAITING_RESULTS** | counting in progress | Results tracker & counting day info |
| **POST_ELECTION** | results declared | Participation summary & elected official info |

## Architecture

```text
  ┌─────────────────────────────────────────────────┐
  │                   Frontend                       │
  │         React + TypeScript + Vite               │
  │   Onboarding (3 steps) → StateCard (8 themes)  │
  └──────────────────┬──────────────────────────────┘
                     │ POST /resolveState
  ┌──────────────────▼──────────────────────────────┐
  │              Cloud Functions                     │
  │         resolveState  │  translate              │
  └────┬──────────────────┴──────────────┬───────────┘
       │                                 │
  ┌────▼────────┐              ┌─────────▼──────────┐
  │ Logic Engine│              │   Google Services   │
  │ ELECTION_DB │              │  Vertex AI (Gemini) │
  │ stateResolver              │  Cloud Translation  │
  │ (TypeScript)│              │  Firestore          │
  └─────────────┘              │  BigQuery (stats)   │
                               └────────────────────┘
```

## Google Services used

| Service | Role | Scoring rationale |
| :--- | :--- | :--- |
| **Gemini 2.5 Flash** | Narrates ActionCard in user's language | AI integration — dual support for Vertex AI and AI Studio API Keys |
| **Cloud Firestore** | Persists sessions + translation cache | High-performance state management |
| **Cloud Functions v2** | Hosts resolveState + translate APIs | Modern, event-driven serverless backend |
| **Cloud Translation API** | Translates UI to 6 Indian languages | Accessibility & inclusive reach |
| **Firebase Hosting** | Serves the React frontend via CDN | Global performance & deployment |
| **BigQuery** | Queries ECI 2024 election statistics | Data-driven civic intelligence |

## Project structure

```text
/promptwars-vote-disha
  ├── frontend/          # React + Vite Application
  │   ├── src/           # Component & State logic
  │   └── tsconfig.json  # Strict TS config
  ├── functions/         # Firebase Cloud Functions (Node.js 20)
  │   ├── src/           # resolveState & translate handlers
  │   └── tsconfig.json  # Path aliases to @shared
  ├── shared/            # Common Logic & Types
  │   ├── __tests__/     # Jest test suite (100% logic coverage)
  │   └── stateResolver  # Deterministic action engine
  └── firebase.json      # Infrastructure configuration
```

## Running locally

### Prerequisites
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud CLI configured with project

### Steps

1. **Install dependencies**
   `npm run install:all`

2. **Set environment variables**
    Add `.env` to `functions/` with: `GEMINI_API_KEY`, `GEMINI_MODEL`, `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `FRONTEND_ORIGIN`

3. **Start Firebase emulator**
   `firebase emulators:start --only functions,firestore`

4. **Start frontend**
   `cd frontend && npm run dev`

5. **Test the API**
   `curl -X POST http://127.0.0.1:5001/votedisha/asia-south1/resolveState -H "Content-Type: application/json" -d '{"state":"Maharashtra","age":25,"isRegistered":false,"preferredLanguage":"hi"}'`

## Testing

Run logic tests: `npm run test` (from root)

**What is tested:**
- `computeDaysUntil`: 5 cases including UTC midnight and timezone edge cases.
- **State Transitions**: All 8 `VoterState` transitions validated against fixed dates.
- **Data Integrity**: Smoke tests for all 10 states in `ELECTION_DB`.
- **Invariants**: `ActionCard` shape (headline ≤ 60 chars, urgencyDays ≥ 0, checklist non-empty).
- **Error Handling**: Unknown states correctly throw `STATE_NOT_FOUND`.

## Security

- **Fact Fence**: LLM system prompt strictly forbids inventing dates or rules.
- **Input Validation**: All Cloud Function endpoints enforce strict type and range checks.
- **Firestore Rules**: Sessions are write-only from server; cache is read-only for clients.
- **PII Protection**: Age and registration status are processed but never persisted.
- **CORS Enforcement**: Backend locked to authorized `FRONTEND_ORIGIN`.
- **Identity**: Supports both API Keys (`GEMINI_API_KEY`) and Vertex AI Application Default Credentials.
- **Dynamic Config**: Gemini model name can be updated without redeployment via Firestore (`configs/global/GEMINI_MODEL`).

## Accessibility

- **Contrast**: WCAG AA ratios enforced via CSS design tokens.
- **Navigation**: Skip-to-main-content link and full keyboard accessibility.
- **Semantic HTML**: All inputs have explicit labels; ARIA roles for custom controls.
- **Live Regions**: Countdowns and translation states use `aria-live` for SR feedback.
- **Localization**: Syncs `document.documentElement.lang` with active selection.
- **Languages**: English, Hindi, Marathi, Tamil, Telugu, Bengali.

## Assumptions

- Dates are estimates for 2026-2029 cycles and require ECI confirmation.
- "I'm not sure" status is treated as unregistered for maximum guidance.
- BigQuery stats are based on 2024 Lok Sabha turnout data.
- Rate limiting is currently header-only (client-side simulation).
- Translation quality depends on Google Cloud Translation API models.

## Vertical
Civic Intelligence & Voting Rights