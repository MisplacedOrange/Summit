# HackCanada-2026
This is the repository for the Hack Canada Hackathon at the Spur Innovation Centre:

Our app helps Canadian high schoolers across the nation fulfill their volunteering hour requirements with ease.
Often times, students find it hard to find opportunities to volunteer, yet alone ones that interest them. We want to make the volunteering hours the best experiences of their life, aligning with their personal preferences and interests.

We built an app that allows users to browse countless opportunities that align with their interests, through our recommendation engine. 

# Tech Stack

# Implementation 

# Backend Deployment

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

# Contributors
- Dinesh Sinnathamby
- Charlie Shao
- Richard Liu
- Roy Lu
