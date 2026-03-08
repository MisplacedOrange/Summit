# Summit Backend Runbook

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
DATABASE_URL=sqlite+aiosqlite:///./summit.db
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

## 9. Geocoding & Location

### How coordinates work

- **Manual**: Organization users submit `location_lat` / `location_lng` explicitly via the create opportunity API. These are marked `geocode_source=manual`.
- **Mapbox geocoding**: When only `location_text` is provided (API creation or scraper), the system calls Mapbox Geocoding v5 to resolve coordinates. Requires `MAPBOX_SECRET_TOKEN` in `.env`.
- **Metadata columns**: `geocode_source` (manual/mapbox/none), `geocode_confidence` (0–1), `geocoded_at` (timestamp).

### Backfill existing opportunities

If you have existing opportunities with `location_text` but no coordinates, run:

```bash
# Preview (dry run)
python -m app.scripts.backfill_geocode --dry-run --batch-size 50

# Execute
python -m app.scripts.backfill_geocode --batch-size 50
```

### Map endpoints

- `GET /v1/opportunities/map` — Marker pins (only opportunities with real coordinates). Optional: `?lat=...&lng=...&radius_km=50` for viewport filtering.
- `GET /v1/opportunities/map/heat` — Weighted heatmap points based on volunteer demand urgency. Same optional viewport params.

## 10. Common Troubleshooting

- `Import ... could not be resolved`: install `backend/requirements.txt` in the selected interpreter.
- Playwright scrape failures: run `python -m playwright install chromium`.
- Auth failures in local tests: test suite uses `Authorization: Bearer test-token` fallback in dependency logic.
- Empty recommendations: ensure opportunities exist and user preferences were updated.
