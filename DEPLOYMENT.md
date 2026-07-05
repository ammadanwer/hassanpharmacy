# Deployment

This project is now set up for a single Vercel deployment plus Neon Postgres:

- Web app and API: Vercel
- Database: Neon Postgres

## 1. Neon Postgres

Use the Neon pooled Postgres connection string.

Keep `sslmode=require` in the URL if Neon includes it. The app accepts Neon URLs in the normal `postgresql://...` format and converts them to the `psycopg` SQLAlchemy driver at runtime.

## 2. Vercel Project

Create or update the Vercel project from this repository.

Important project settings:

- Root Directory: repository root
- Build Command: leave default from `vercel.json`
- Output Directory: leave default from `vercel.json`
- Install Command: leave default from `vercel.json`

Do not use `frontend` as the Vercel root directory anymore. The root deployment is required so Vercel can build both:

- `frontend/dist` for the React app
- `app/main.py` for the FastAPI serverless API

## 3. Vercel Environment Variables

Set these in Vercel:

```env
DATABASE_URL=<neon pooled connection string>
SECRET_KEY=<strong random secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=https://hassanpharmacy.vercel.app
```

Remove this old variable from Vercel if it exists:

```env
VITE_API_BASE_URL
```

With the backend on the same Vercel domain, the frontend should call relative `/api/...` URLs.

Do not set this for normal Vercel deploys:

```env
RUN_SCHEMA_SYNC=1
```

Schema sync is intentionally skipped on Vercel cold starts. Run schema/index changes manually or from a one-off local command against Neon.

## 4. Vercel Routing

`vercel.json` routes:

- `/api/*` to FastAPI in `app/main.py`
- `/health` to FastAPI
- all other paths to the React SPA

This keeps refreshes such as `/pms/dashboard/batch` working.

## 5. Import Initial Data

To import seed/reference data into Neon from your local machine:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL='<neon pooled connection string>' python scripts/import_emareez_data.py
```

Default imported admin:

```text
Email: admin@hassanpharmacy.test.com
Password: admin123
```

Change the password after first login.

## 6. Local Development

Backend:

```bash
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

For local development, keep `frontend/.env` pointing at the local backend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```
