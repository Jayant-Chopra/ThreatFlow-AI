# ThreatFlow-AI

ThreatFlow-AI is an advanced vulnerability and attack-path analysis tool powered by AI. This repository now includes the backend foundation for Jayant's responsibilities: scan orchestration, structured findings storage, and graph generation.

## Current implementation

This starter backend is designed to match the responsibilities described for the first evaluation:

- Express API server
- Project upload/selection flow
- Scan lifecycle and metadata storage
- Findings endpoint for analyzer output
- Graph endpoint for attack-path visualization
- Prisma-ready schema for PostgreSQL integration
- Local in-memory fallback for development without a live database

## Quick start

1. Install dependencies:
   npm install
2. Start the server:
   npm start
3. Trigger a scan:
   curl -X POST http://localhost:3001/api/scan -H "Content-Type: application/json" -d '{"projectName":"demo-app","projectPath":"./demo-vuln-app"}'

## API contract

- GET /api/health
- POST /api/scan
- GET /api/scans/:id
- GET /api/scans/:id/findings
- GET /api/scans/:id/graph

## Data model

The Prisma schema defines the initial project, scan, and finding models:

- Project: project metadata
- Scan: each analysis execution
- Finding: vulnerability record with type, severity, file, line, source, sink, and route

## Local development notes

The app is set up to run without a live PostgreSQL instance by default using an in-memory fallback. For production, add a real PostgreSQL connection string in `.env` and use Prisma commands such as `npx prisma db push`.

## Next phase responsibilities

1. Replace the mock analyzer output with Lakshay's real AST findings.
2. Connect the backend to PostgreSQL/Prisma in the deployment environment.
3. Add authentication and validation once the initial workflow is stable.
4. Feed the graph output into the React frontend for dashboard visualization.
