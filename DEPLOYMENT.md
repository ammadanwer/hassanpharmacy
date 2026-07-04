# Deployment

This project is set up for a free-tier deployment split:

- Frontend: Vercel
- Backend: Render Web Service
- Database: Neon Postgres

## 1. Neon Postgres

1. Create a Neon project.
2. Copy the pooled Postgres connection string.
3. Keep `sslmode=require` in the URL if Neon includes it.

The app accepts Neon URLs in the normal `postgresql://...` format and converts them to the `psycopg` SQLAlchemy driver at runtime.

## 2. Render Backend

Create a Render Web Service from this repository.

Use the root directory as the service root. Render can use `render.yaml`, or you can configure the service manually:

- Runtime: Docker
- Dockerfile: `Dockerfile`
- Plan: Free
- Health check path: `/health`

Environment variables:

```env
DATABASE_URL=<neon pooled connection string>
SECRET_KEY=<strong random secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=https://<your-vercel-app>.vercel.app
```

The backend URL will look like:

```text
https://hassan-pharmacy-api.onrender.com
```

Render free web services can sleep when idle. The first request after sleep may be slow.

## 3. Vercel Frontend

Create a Vercel project from this repository.

Settings:

- Root Directory: `frontend`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

Environment variables:

```env
VITE_API_BASE_URL=https://<your-render-api>.onrender.com
```

After Vercel gives you the frontend URL, update Render's `FRONTEND_URL` to that Vercel URL and redeploy the backend.

## 4. Import Initial Data

After Render has started once, the database tables should exist. To import the captured seed data into Neon from your local machine:

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

## 5. Local Production-Style Test

To test the frontend against a deployed backend locally:

```bash
cd frontend
cp .env.example .env
# set VITE_API_BASE_URL to the Render backend URL
npm install
npm run build
npm run preview
```
