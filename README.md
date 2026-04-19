# linea-admin

Vite + React admin portal for Linea (ops). Consumes **`linea-admin-api`** (`/api/v1/*`).

**Phase 3 (current):** auth (email + Google GIS), layout, role-filtered sidebar, placeholder routes. See `docs/PLAN-admin-ops.md` in the Linea-Main workspace for the full roadmap.

## Dev

```bash
cp .env.example .env
# VITE_GOOGLE_CLIENT_ID=… if using Google; leave VITE_ADMIN_API_BASE_URL empty to use Vite proxy

npm install
npm run dev   # http://localhost:5181 — proxies /api → http://localhost:3001
```

Requires **`linea-admin-api`** on port **3001** and a Postgres user with a **staff** `role` (not `user`).
