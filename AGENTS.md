# AGENTS.md

## Project

Hassan Pharmacy is a FastAPI + React pharmacy management system.

## Architecture

- Backend: FastAPI, SQLAlchemy, Pydantic, PostgreSQL.
- Frontend: React + Vite in `frontend/`.
- Local orchestration: Docker Compose with `db`, `api`, and `frontend`.

## Commands

- Run full stack: `docker compose up --build`
- Docker UI URL: `http://localhost:5173`
- Docker API URL: `http://localhost:8001`
- Backend only: `uvicorn app.main:app --reload`
- Frontend only: `cd frontend && npm install && npm run dev`
- Backend check: `.venv/bin/python -m compileall app`
- Frontend build check: `cd frontend && npm run build`
- Branding/stub scan: `rg -n "PDF download stub|Mareez|E-Mareez|E Mareez|e-mareez" frontend/src app/static app -S`
- Chrome/CDP page capture: `env CDP_OUTPUT_FILE=reference-captures/local-page.json node scripts/cdp_inspect.cjs 127.0.0.1:5173 http://127.0.0.1:5173/pms/dashboard`

## Local Login

- Admin username: `admin@hassanpharmacy.test.com`
- Admin password: `admin123`

## Conventions

- Keep FastAPI as the API layer under `/api`.
- Keep React UI state in components; avoid adding more behavior to `app/static/app.js`.
- Use existing backend schemas and routers before adding new API surfaces.
- Before implementing E-Mareez parity changes, check `FEATURES.md` and `reference-captures/e-mareez-sidebar-audit/page-summaries.json` for the captured target behavior.
- Keep `FEATURES.md` updated whenever a parity behavior is implemented or a known gap changes.
- Use `scripts/cdp_inspect.cjs` for repeatable Chrome checks against the user's already-open debug browser. Save new local/reference evidence under `reference-captures/`.
- When adding database columns, update the SQLAlchemy model, Pydantic schema, and `app/db/schema_sync.py`.
- Do not commit generated folders such as `.venv`, `node_modules`, `frontend/dist`, or screenshots.

## Docker

- Backend service name: `api`
- Database service name: `db`
- Frontend service name: `frontend`
- Frontend Vite proxy target in Compose: `http://api:8000`
- Host ports: frontend `5173`, API `8001`, Postgres `5433`
- The frontend container runs `npm install` on start so the persisted `frontend_node_modules` volume follows `package-lock.json`.
