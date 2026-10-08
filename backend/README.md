# ThreatFlow AI Backend

This directory contains the backend for the ThreatFlow AI platform. It is responsible for the Jayant backend responsibilities from the first evaluation plan:

- project upload and extraction
- scan lifecycle management
- structured findings persistence
- attack graph and risk summary responses
- Prisma-ready data model for PostgreSQL

## Quick start

```bash
cd backend
npm install
npm start
```

## Main endpoints

- GET /api/health
- POST /api/upload
- POST /api/scan
- GET /api/scans/:id
- GET /api/scans/:id/findings
- GET /api/scans/:id/graph

## Notes

This backend is intentionally separated from the analyzer and graph-engine modules so each team stream remains independent while still integrating through a shared contract.
