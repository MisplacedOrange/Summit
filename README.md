# Summit

> Built at the Hack Canada Hackathon at the Spur Innovation Centre.

Summit helps Canadian high schoolers fulfill their community service hour requirements by connecting them with volunteer opportunities that actually match their interests. We built a full-stack platform where students can browse, filter, and get AI-ranked recommendations for opportunities near them so their volunteer hours become meaningful experiences rather than a checkbox.

---

## Features

- **Browse & search** hundreds of scraped volunteer listings across Canada
- **AI-ranked recommendations** powered by Google Gemini semantic embeddings — the engine scores every opportunity against your interests, skills, location, and urgency to return a personalised ranked list
- **Interactive map** with colour-coded pins by cause category (environment, education, healthcare, community, arts, animal care)
- **Recommendation profile** — save your interests, skills, and location to persist AI matching preferences across sessions
- **Live location** — browser geolocation watches your position and sorts nearby opportunities in real time
- **Auth0 authentication** with JWT-secured API routes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL + pgvector (Supabase) / SQLite (local) |
| AI / Embeddings | Google Gemini API (`gemini-embedding-001`, dim 3072) |
| Authentication | Auth0 (RS256 JWT) |
| Maps | Leaflet / OpenStreetMap |
| Scraping | Playwright + BeautifulSoup |
| Task Queue | Celery + Redis |
| Containerisation | Docker + Docker Compose |

---

## How the Recommendation Engine Works

```
External websites  ──►  scraper.py  ──►  PostgreSQL (opportunities)
                        (every 6h)          │
                                            │  embed via Gemini API
                                            ▼
                                     Vector(3072) stored per opportunity

User saves profile  ──►  PUT /v1/users/me/preferences
                              │  embed via Gemini API
                              ▼
                         Vector(3072) stored per user

GET /v1/recommendations
  └─► score every opportunity against user vector
        semantic 36%  ·  interests 22%  ·  skills 16%
        proximity 10%  ·  category 8%  ·  demand 5%  ·  recency 3%
  └─► sort descending → return top 20 with scores + reasons
```

---

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop (optional, for full stack with Postgres + Redis)

### Backend

```bash
# Install Python dependencies
pip install -r backend/requirements.txt
python -m playwright install chromium

# Configure environment
cp backend/.env.example backend/.env
# Fill in secrets (see Environment Variables below)

# Run database migrations
cd backend
alembic upgrade head

# Start the API
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check: `curl http://localhost:8000/api/health`

```bash
# (Optional) Start Celery worker + beat scheduler for background scraping
celery -A app.workers.celery_app worker --loglevel=info
celery -A app.workers.celery_app beat --loglevel=info

# Run scraper manually
python backend/scraper.py

# Run tests
python -m pytest backend/tests -q
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in Auth0 + API base variables
npm run dev
```

### Docker (full stack)

```bash
cd backend
docker compose up --build
# API → http://localhost:8000
# Postgres (pgvector) → localhost:5432
# Redis → localhost:6379
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL or SQLite connection string |
| `REDIS_URL` | Redis connection string (Celery broker) |
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_AUDIENCE` | Auth0 API identifier |
| `APP_JWT_SECRET` | Secret for local JWT signing (dev only) |
| `APP_JWT_EXPIRE_HOURS` | Local JWT expiry in hours |
| `GEMINI_API_KEY` | Google Gemini API key |
| `MAPBOX_SECRET_TOKEN` | Mapbox geocoding token |
| `ALLOWED_ORIGINS` | JSON array of allowed CORS origins |
| `DISCORD_WEBHOOK_URL` | (Optional) forwards request summaries to Discord |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE` | Backend API base URL |
| `AUTH0_SECRET` | Auth0 session secret |
| `AUTH0_CLIENT_ID` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret |
| `AUTH0_ISSUER_BASE_URL` | Auth0 issuer URL |
| `AUTH0_AUDIENCE` | Auth0 API identifier |
| `AUTH0_SCOPE` | Recommended: `openid profile email` |
| `APP_BASE_URL` | Frontend base URL (e.g. `http://localhost:3000`) |

### Auth0 Dashboard (local development)

- Application type: `Regular Web Application`
- Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`
- API Identifier: `http://localhost:8000`

---

## Deployment

Use one of these setups:

1. Deploy from repo root (Heroku/Render/Railway style)
	- Build command: `pip install -r requirements.txt`
	- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend`

2. Deploy with service root set to `backend/`
	- Build command: `pip install -r requirements.txt`
	- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Required backend environment variables:
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_JWT_SECRET`
- `APP_JWT_EXPIRE_HOURS`
- `ALLOWED_ORIGINS` (JSON array string, for example `["https://your-frontend-domain.com"]`)
- `DISCORD_WEBHOOK_URL` (optional, forwards each API request summary to Discord)

Frontend Auth0 environment variables (`frontend/.env.local`):
- `NEXT_PUBLIC_API_BASE`
- `AUTH0_SECRET`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_DOMAIN` or `AUTH0_ISSUER_BASE_URL`
- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_AUDIENCE`
- `AUTH0_SCOPE` (recommended: `openid profile email`)
- `APP_BASE_URL` (for example `http://localhost:3000`)

Auth0 dashboard values for local development:
- Application type: `Regular Web Application`
- Allowed Callback URLs: `http://localhost:3000/api/auth/callback, http://localhost:3001/api/auth/callback`
- Allowed Logout URLs: `http://localhost:3000, http://localhost:3001`
- Allowed Web Origins: `http://localhost:3000, http://localhost:3001`
- API Identifier: `http://localhost:8000`

---

## Contributors

- Dinesh Sinnathamby
- Charlie Shao
- Richard Liu
- Roy Lu
