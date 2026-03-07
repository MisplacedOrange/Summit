# ImpactMatch Backend Runbook

## Prerequisites

- Python 3.11+
- Docker Desktop (optional, for full local stack)
- Playwright browser binaries (for scraper)

## 1. Install Dependencies

From repository root:

```bash
python -m pip install -r backend/requirements.txt
python -m playwright install chromium
```

## 2. Configure Environment

Create `backend/.env` from `backend/.env.example` and fill secrets.

Minimum useful local values:

```env
DATABASE_URL=sqlite+aiosqlite:///./impactmatch.db
REDIS_URL=redis://localhost:6379/0
AUTH0_DOMAIN=
AUTH0_AUDIENCE=
GEMINI_API_KEY=
MAPBOX_SECRET_TOKEN=
ENVIRONMENT=development
ALLOWED_ORIGINS=["http://localhost:3000"]
```

## 3. Run API (Local)

From the `backend/` directory:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```bash
curl http://localhost:8000/api/health
```

## 4. Run Migrations (Alembic)

From `backend/` directory:

```bash
alembic upgrade head
```

If you need to create a new migration:

```bash
alembic revision -m "describe change"
```

## 5. Run Celery Worker and Beat

From `backend/` directory, separate terminals:

```bash
celery -A app.workers.celery_app worker --loglevel=info
celery -A app.workers.celery_app beat --loglevel=info
```

## 6. Run Scraper Manually

From repository root:

```bash
python backend/scraper.py
```

Optional custom output root:

```bash
python backend/scraper.py --output-root .
```

## 7. Run Tests

From repository root:

```bash
python -m pytest backend/tests -q
```

## 8. Docker Compose (Full Stack)

From `backend/` directory:

```bash
docker compose up --build
```

Services:

- API: <http://localhost:8000>
- Postgres (pgvector): localhost:5432
- Redis: localhost:6379

## 9. Common Troubleshooting

- `Import ... could not be resolved`: install `backend/requirements.txt` in the selected interpreter.
- Playwright scrape failures: run `python -m playwright install chromium`.
- Auth failures in local tests: test suite uses `Authorization: Bearer test-token` fallback in dependency logic.
- Empty recommendations: ensure opportunities exist and user preferences were updated.
