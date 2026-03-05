# Emergency SOS Thailand

AI-powered emergency incident reporting system for Thai rescue services (1669).

## Architecture

```
User (PWA) → Next.js Frontend → FastAPI Backend → OpenAI (Whisper + GPT-4o-mini)
                                                 → LINE Messaging API
                                                 → Supabase (PostgreSQL)
```

### Flow

1. User taps SOS button and records voice (or types text)
2. GPS coordinates captured automatically
3. Audio transcribed via OpenAI Whisper (Thai language)
4. GPT-4o-mini performs triage: severity, category, required units
5. Structured alert pushed to rescue LINE group
6. Incident logged to Supabase

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Frontend  | Next.js 14, TypeScript, Tailwind CSS, PWA |
| Backend   | Python 3.11, FastAPI, Pydantic v2 |
| AI        | OpenAI Whisper (STT), GPT-4o-mini (triage) |
| Messaging | LINE Messaging API          |
| Database  | Supabase (PostgreSQL)       |

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your API keys
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable                    | Description                        |
|-----------------------------|------------------------------------|
| `OPENAI_API_KEY`            | OpenAI API key for Whisper + GPT   |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot channel access token      |
| `LINE_GROUP_ID`             | LINE group ID for rescue team      |
| `SUPABASE_URL`              | Supabase project URL               |
| `SUPABASE_SERVICE_KEY`      | Supabase service role key          |

For the frontend, set `NEXT_PUBLIC_API_URL` in the environment if the backend runs on a different host (defaults to `http://localhost:8000`).

## Supabase Table Schema

```sql
CREATE TABLE incidents (
  id BIGSERIAL PRIMARY KEY,
  incident_id UUID UNIQUE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address_hint TEXT,
  text_description TEXT,
  reporter_phone VARCHAR(20),
  timestamp TIMESTAMPTZ NOT NULL,
  severity_level VARCHAR(10) NOT NULL,
  severity_score INT NOT NULL,
  category TEXT NOT NULL,
  victim_count INT,
  key_symptoms JSONB DEFAULT '[]',
  summary_th TEXT NOT NULL,
  required_units JSONB DEFAULT '[]',
  first_aid_advice TEXT NOT NULL,
  confidence_score DOUBLE PRECISION NOT NULL,
  line_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
```

## API Endpoints

| Method | Path                   | Description              |
|--------|------------------------|--------------------------|
| GET    | `/health`              | Health check             |
| POST   | `/api/report-incident` | Submit emergency report  |

## PWA

The app is installable as a PWA. Add icon files (`icon-192.png`, `icon-512.png`) to `frontend/public/icons/` for full PWA support.
