# @threatflow/graph-engine

The **Attack Graph & Risk Engine** for ThreatFlow AI.

It ingests static analysis findings and code topology from the Phase 1 AST Analyzer (Schema 1.0) and generates:
1. **Directed Attack Graphs (DAG)** formatted for React Flow with deterministic hierarchical layout coordinates.
2. **End-to-End Attack Paths** tracing vulnerability chains: `Route ➔ Controller Handler ➔ Input Source ➔ Variable Propagation ➔ Vulnerable Sink`.
3. **Deterministic Risk Scoring** based on an explainable OWASP-style Impact (1–3) × Exposure (1–3) matrix.
4. **Graph Centrality Chokepoint Remediation** using greedy set-cover to identify the minimum set of code fixes required to eliminate all attack paths.

---

## Architecture Overview

```
                        [ Phase 1 Analyzer Output (Schema 1.0) ]
                                          │
                                          ▼
                                ┌──────────────────┐
                                │   graphBuilder   │ ── Schema validation & Adjacency lists
                                └──────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │   pathAnalyzer   │ ── Reverse BFS data-flow traversal & Route linking
                                └──────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │    riskScorer    │ ── Impact (1-3) x Exposure (1-3) evaluation
                                └──────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ chokepointEngine │ ── Greedy set-cover over fixable sinks & sources
                                └──────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │   layoutEngine   │ ── Hierarchical column coordinates for React Flow
                                └──────────────────┘
                                          │
                                          ▼
                         [ Unified React Flow & Graph Payload ]
```

---

## Getting Started

### Prerequisites
- Node.js 18 or later

### Running Tests
Execute the full unit and integration test suite:
```bash
npm test
```

Watch mode for development:
```bash
npm run test:watch
```

---

## API Reference

### `analyzeAttackGraph(analyzerOutput)`
Primary entry point consumed by the backend Express API.

- **Parameters**: `analyzerOutput` (`Object`) — JSON adhering to ThreatFlow Schema 1.0.
- **Returns**: `Object` containing:
  - `graph.nodes`: React Flow node array with categories, labels, and pre-calculated layout positions.
  - `graph.edges`: React Flow edge array with smoothstep rendering and animated attack path indicators.
  - `attackPaths`: Ranked array of attack paths with step-by-step traversal chains and evidence.
  - `chokepoints`: Primary chokepoint recommendation and cumulative set-cover remediation plan.
  - `riskSummary`: Overall security posture and risk distribution breakdown.
  - `diagnostics`: Unresolved findings or dropped transport relationships (if any).

---

## Verification & Test Suite

The test suite contains 33 automated tests validating:
- Exact schema compliance and rejection of duplicate IDs.
- Deterministic path traversal without false positives on safe code.
- Proper cross-file route resolution (`routes/` to `controllers/`).
- Accurate mathematical risk scoring without heuristic drift.
- Full end-to-end integration across real multi-file projects (`analyzer/test-project`).
