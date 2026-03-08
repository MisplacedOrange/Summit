# Summit
This is the repository for the Hack Canada Hackathon at the Spur Innovation Centre:

Our app helps Canadian high schoolers across the nation fulfill their volunteering hour requirements with ease.
Often times, students find it hard to find opportunities to volunteer, yet alone ones that interest them. We want to make the volunteering hours the best experiences of their life, aligning with their personal preferences and interests.

We built an app that allows users to browse countless opportunities that align with their interests, through our recommendation engine. 

# Tech Stack

# Implementation 
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Canva](https://img.shields.io/badge/Canva-%2300C4CC.svg?style=for-the-badge&logo=Canva&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![CSS](https://img.shields.io/badge/css-%23663399.svg?style=for-the-badge&logo=css&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)
![Shadcn/ui](https://img.shields.io/badge/shadcn/ui-%23000000?style=for-the-badge&logo=shadcnui&logoColor=white)

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
- `DISCORD_WEBHOOK_URL` (optional, forwards each API request summary to Discord)

Frontend Auth0 environment variables (`frontend/.env.local`):
- `NEXT_PUBLIC_API_BASE`
- `AUTH0_SECRET`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_AUDIENCE`
- `AUTH0_SCOPE` (recommended: `openid profile email`)
- `APP_BASE_URL` (for example `http://localhost:3000`)

# Contributors
- Dinesh Sinnathamby
- Charlie Shao
- Richard Liu
- Roy Lu
