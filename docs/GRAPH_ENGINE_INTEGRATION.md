# ThreatFlow Attack Graph Engine Integration Guide

## Status & Ownership

The **Attack Graph & Risk Engine** (`graph-engine`) is implemented and tested under `schemaVersion: "1.0"`. It consumes Lakshay's Phase 1 AST Analyzer output, joins entities strictly via deterministic IDs, and produces:
- React Flow-ready graph nodes and edges with hierarchical column coordinates
- Evidence-backed attack path sequences (Route ➔ Handler ➔ Source ➔ Variable ➔ Sink)
- Defensible risk rankings using an Impact (1–3) × Exposure (1–3) matrix
- Remediation chokepoint identification using greedy set cover over fixable data-flow sinks and sources

**Module Owner**: Ravish Gupta (`ravishgupta071@gmail.com`)

---

## Quick Start

### 1. Run Unit & Integration Tests
From the root repository directory:
```bash
cd graph-engine
npm test
```
All 33 unit and integration tests (including tests directly on Lakshay's `test-project` and safe query fixtures) execute in `< 1s`.

### 2. Usage in Jayant's Express Backend
```javascript
const { analyzeProject } = require('../analyzer/analyzer');
const { analyzeAttackGraph } = require('../graph-engine/src');

// Inside your scan controller or scan API route
app.post('/api/scan', async (req, res) => {
  const targetProjectPath = req.body.projectPath;

  // 1. Run Lakshay's AST scanner
  const analyzerOutput = analyzeProject(targetProjectPath);

  // 2. Pass output to Ravish's Graph Engine
  const graphResult = analyzeAttackGraph(analyzerOutput);

  // 3. Return unified response to frontend
  res.json({
    scanId: 'scan_123',
    status: 'COMPLETED',
    findings: analyzerOutput.findings,
    graph: graphResult.graph,              // Nodes & edges for React Flow
    attackPaths: graphResult.attackPaths,  // Priority ranked attack chains
    chokepoints: graphResult.chokepoints,  // Primary chokepoint & set-cover remediation plan
    riskSummary: graphResult.riskSummary,  // Posture score & distribution
    diagnostics: graphResult.diagnostics   // Unresolved findings / dropped relations (if any)
  });
});
```

---

## Output Data Contract

```json
{
  "schemaVersion": "1.0",
  "analyzerSchemaVersion": "1.0",
  "project": {
    "name": "example-api",
    "path": "analyzer/test-project"
  },
  "graph": {
    "nodes": [
      {
        "id": "route_001",
        "type": "routeNode",
        "position": { "x": 50, "y": 80 },
        "data": {
          "label": "GET /users",
          "badge": "ROUTE",
          "category": "ROUTE",
          "file": "routes/userRoutes.js",
          "line": 14,
          "location": "routes/userRoutes.js:14",
          "onAttackPath": true,
          "isVulnerable": false,
          "pathIds": ["PATH-001"],
          "findingIds": ["finding_001"]
        }
      }
    ],
    "edges": [
      {
        "id": "derived_route_001_func_005",
        "source": "route_001",
        "target": "func_005",
        "type": "smoothstep",
        "animated": true,
        "label": "handled by",
        "data": {
          "relationshipType": "ROUTE_TO_FUNCTION",
          "derived": false,
          "onAttackPath": true,
          "pathIds": ["PATH-001"]
        }
      }
    ]
  },
  "attackPaths": [
    {
      "id": "PATH-001",
      "findingId": "finding_001",
      "vulnerabilityType": "SQL_INJECTION",
      "analyzerSeverity": "HIGH",
      "title": "Potential SQL Injection",
      "riskScore": 6,
      "riskLevel": "HIGH",
      "riskMetrics": {
        "impact": 2,
        "impactReason": "User input changes a database query (data read/modify), not direct server execution.",
        "exposure": 3,
        "exposureReason": "Input comes from an HTTP request on a resolved Express route.",
        "score": 6,
        "maxScore": 9,
        "level": "HIGH",
        "formula": "impact (1-3) x exposure (1-3)"
      },
      "route": {
        "id": "route_001",
        "method": "GET",
        "path": "/users",
        "file": "routes/userRoutes.js",
        "line": 14
      },
      "handler": {
        "id": "func_005",
        "name": "getUser",
        "file": "controllers/userController.js",
        "line": 11
      },
      "source": {
        "id": "source_001",
        "type": "HTTP_INPUT",
        "expression": "req.query.id",
        "file": "controllers/userController.js",
        "line": 12
      },
      "sink": {
        "id": "sink_001",
        "type": "DATABASE",
        "name": "db.query",
        "file": "controllers/userController.js",
        "line": 14
      },
      "steps": [
        { "stepNumber": 1, "category": "ROUTE", "label": "GET /users", "location": "routes/userRoutes.js:14" },
        { "stepNumber": 2, "category": "FUNCTION", "label": "getUser()", "location": "controllers/userController.js:11" },
        { "stepNumber": 3, "category": "SOURCE", "label": "req.query.id", "location": "controllers/userController.js:12" },
        { "stepNumber": 4, "category": "VARIABLE", "label": "id", "location": "controllers/userController.js:12" },
        { "stepNumber": 5, "category": "VARIABLE", "label": "query", "location": "controllers/userController.js:13" },
        { "stepNumber": 6, "category": "SINK", "label": "db.query", "location": "controllers/userController.js:14" }
      ],
      "hopCount": 5
    }
  ],
  "chokepoints": {
    "primary": {
      "nodeId": "sink_002",
      "category": "SINK",
      "label": "exec",
      "location": "controllers/userController.js:21",
      "pathsCovered": 1,
      "riskCovered": 9,
      "isShared": false,
      "recommendation": "At controllers/userController.js:21 (exec): Do not pass user input to a shell. Use execFile/spawn with a fixed command and an argument array, and allowlist the accepted values."
    },
    "plan": [
      {
        "step": 1,
        "nodeId": "sink_002",
        "cumulativeBlocked": 1,
        "cumulativePercent": 33.3
      }
    ],
    "summary": {
      "totalPaths": 3,
      "fixesToBlockAllPaths": 3,
      "hasSharedChokepoint": false
    }
  },
  "riskSummary": {
    "totalPaths": 3,
    "maxRiskScore": 9,
    "maxScore": 9,
    "overallPosture": "CRITICAL",
    "distribution": {
      "critical": 2,
      "high": 1,
      "medium": 0,
      "low": 0
    }
  }
}
```

---

## Frontend Consumption (She's Dashboard)

1. **React Flow Graph**: Pass `graph.nodes` and `graph.edges` directly to `<ReactFlow />`. Every edge on an attack path has `animated: true`. Every node and edge includes `data.onAttackPath` and `data.pathIds` so clicking a path in the sidebar can instantly highlight its active nodes and edges.
2. **Priority Feed**: Render `attackPaths` sorted by `riskScore`. Each step in `steps` has its exact location (`file:line`) for jumping to code.
3. **Chokepoint Panel**: Display `chokepoints.primary` and `chokepoints.plan` to show the minimal sequence of fixes required to collapse all attack paths.
