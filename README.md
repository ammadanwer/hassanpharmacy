# Hassan Pharmacy

Pharmacy management system for Hassan Pharmacy.

## Setup

### Docker Compose

```bash
docker compose up --build
```

- API: `http://localhost:8000`
- Docker API: `http://localhost:8001`
- React UI: `http://localhost:5173`
- Docker database: Postgres on `localhost:5433`

Compose starts `db`, `api`, and `frontend`. The React app proxies `/api` requests to the FastAPI service. Host ports use `5433` and `8001` to avoid conflicts with a local Postgres/API already running on `5432` or `8000`.

### Manual Backend

```bash
cd ~/pharmacy-pms
cp .env.example .env
# edit .env with your Postgres URL + secret key

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload
```

### Manual Frontend

```bash
cd frontend
npm install
npm run dev
```

Feature tracking: [FEATURES.md](FEATURES.md)

Docs: /Users/ammad/docs/pharmacy-management-design.md
