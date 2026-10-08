# Jayant backend plan

## Goal

Build the backend foundation for the first evaluation so that the project can accept a project upload, run analysis workflows, store findings, and expose graph data to the frontend.

## Scope for evaluation 1

- Project and scan metadata endpoints
- SQL/NoSQL injection and command injection mock findings
- Findings endpoint returning structured JSON
- Graph conversion endpoint for attack paths
- Prisma schema with Project, Scan, and Finding models
- Local in-memory fallback while the database is not yet available

## Execution flow

1. The frontend or user triggers a scan request.
2. The backend creates a Project record.
3. The backend starts or orchestrates analyzer execution.
4. The analyzer returns structured JSON findings.
5. The backend stores findings in scan records.
6. The backend returns findings and attack graph payloads through APIs.

## Recommended integration contract

```json
{
  "projectName": "demo-app",
  "projectPath": "./demo-vuln-app",
  "analyzerOutput": {
    "findings": [
      {
        "type": "SQL_INJECTION",
        "severity": "HIGH",
        "file": "routes/users.js",
        "line": 18,
        "source": "req.query.id",
        "sink": "db.query",
        "route": "GET /users/:id",
        "evidence": "Untrusted user input is concatenated into the SQL query string."
      }
    ]
  }
}
```

## Next steps

- Connect the backend to Lakshay's real analyzer output.
- Add Prisma migrations and deployment configuration.
- Validate the API against a deliberately vulnerable sample app.
- Extend the graph route with richer node and edge relations as Ravish's logic matures.
