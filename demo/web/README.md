# Demo Web (Vite + React + TS)

Simple UI to interact with Issuer, Holder, and Verifier services.

## Run

1. Ensure backend services are running (see repository README):
   - Issuer: http://localhost:5001
   - Verifier: http://localhost:5002
   - Holder: http://localhost:5003

2. Copy env and start dev server:

```sh
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:5173.

## Env

- `VITE_ISSUER_BASE_URL` (default http://localhost:5001)
- `VITE_VERIFIER_BASE_URL` (default http://localhost:5002)
- `VITE_HOLDER_BASE_URL` (default http://localhost:5003)
