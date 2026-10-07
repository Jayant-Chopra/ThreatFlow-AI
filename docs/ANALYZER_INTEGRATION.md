# ThreatFlow Analyzer integration guide

## Status

Evaluation 1 has a stable JSON integration contract with `schemaVersion` set to
`"1.0"`. Backend and attack-graph consumers integrate with final analyzer JSON
only. Babel ASTs, Babel traversal paths, parser settings, and all other internal
analyzer structures are **not** integration dependencies.

The authoritative field definitions are in
[FINAL_OUTPUT_SCHEMA.md](FINAL_OUTPUT_SCHEMA.md). A machine-readable example is
[../fixtures/analyzer-output-example.json](../fixtures/analyzer-output-example.json).

## Run the analyzer

Requirements: Node.js 18 or later and installed analyzer dependencies.

From the `analyzer` directory:

```bash
npm install
node scanner.js ./test-project
```

Pass a target project directory as the positional argument. The analyzer writes
one complete JSON object to standard output. Redirect it when a backend job
needs a file:

```bash
node scanner.js /path/to/project > analyzer-output.json
```

`--verbose` writes parse diagnostics to standard error only; standard output
remains machine-readable JSON. A malformed JavaScript file does not prevent
valid files in the same project from contributing results.

### Input

Input is a directory containing a JavaScript Node.js/Express project. Evaluation
1 recursively scans `.js` files and skips `.git`, `node_modules`, `dist`,
`build`, `coverage`, `generated`, and `vendor`. TypeScript and other languages
are outside this contract.

## Output

Every successful scan contains all required top-level fields:

```json
{
  "schemaVersion": "1.0",
  "project": {},
  "files": [],
  "routes": [],
  "functions": [],
  "sources": [],
  "sinks": [],
  "variables": [],
  "relationships": [],
  "findings": [],
  "summary": {}
}
```

Empty arrays are valid, including for safe and empty projects. IDs are strings
unique only within one scan and are not globally persistent. `project.path` is
the caller-supplied scan root and may be absolute; entity `file` fields are
project-relative paths using `/` separators. Line numbers are one-based.

| Collection | Integration meaning |
| --- | --- |
| `files` | JavaScript files considered by the scan. |
| `routes` | Recognized Express routes, including HTTP method, static path when available, location, and identifiable handler display name. Dynamic paths are `null`. |
| `functions` | Source-level function entities. An unidentifiable name is `null`. |
| `sources` | Recognized direct HTTP input: static properties of `req.query`, `req.body`, `req.params`, `req.headers`, and `req.cookies`. |
| `sinks` | Recognized dangerous-operation calls. A sink alone is not a finding. |
| `variables` | Local bindings tracked for basic data flow. Use `id`, not `name`, because names can repeat across scopes. |
| `relationships` | Directed, ID-based graph edges. |
| `findings` | Evidence-backed analyzer results, not user-entered data or demo records. |

### Relationships

`relationships[].from` and `relationships[].to` always reference entity IDs;
never join graph nodes by a variable name, function name, or source expression.

| Type | Meaning |
| --- | --- |
| `ROUTE_TO_FUNCTION` | Route handler resolves to an extracted function binding in a supported same-static-scope case or direct CommonJS `module.exports` / destructured `require(...)` link. |
| `ASSIGNMENT` | Source expression assigned to a tracked variable. |
| `VARIABLE_TO_VARIABLE` | Tracked variable used in another tracked variable's initializer or assignment. |
| `DATA_FLOW` | Source or tracked variable occurs in a recognized sink argument. |
| `FUNCTION_CALL` | Reserved by the contract; not emitted in Evaluation 1. |

Edges express basic static/syntactic dependencies, not proof of runtime
execution.

### Findings

Supported vulnerability types are:

- `SQL_INJECTION`
- `COMMAND_INJECTION`
- `CODE_EXECUTION`

Evaluation 1 taint findings currently use `severity: "HIGH"` and carry
analyzer-derived evidence, a source expression, and a sink display name. `route`
is `"METHOD /path"` only when static association is available; it is `null`
when the analyzer cannot resolve a route. Consumers must preserve `null` rather
than inventing a route.

## Backend consumption

1. Parse standard output as one JSON document.
2. Require `schemaVersion === "1.0"` before relying on field semantics.
3. Store or display entities using their scan-local IDs as join keys.
4. Render findings from provided evidence, source, sink, and location values.
5. Treat `summary` as a convenience count that must equal its corresponding
   arrays.

Treat an unknown schema version as incompatible until its contract is reviewed.
Additive or semantic changes require an explicit schema-version decision.

## Attack-graph consumption

Create nodes from `routes`, `functions`, `sources`, `variables`, and `sinks`.
Create directed edges by resolving relationship `from` and `to` IDs. Findings
can attach to their matching source/sink evidence and source-to-sink `DATA_FLOW`
paths. Graph consumers do not need to parse JavaScript or understand Babel.

Before ingestion, validate each relationship endpoint exists in the entity-ID
set. The analyzer enforces this for its own output, but consumers should reject
malformed transport data safely.

## Known limitations

- JavaScript Node.js/Express only; no TypeScript or other languages.
- Basic intra-file static propagation only; no full call graph, interprocedural
  analysis, alias analysis, module/import resolution, or runtime execution.
- Route-to-function links require a statically resolved handler. Direct
  CommonJS `module.exports` / destructured `require(...)` handlers are
  supported, but other imported or dynamic cross-file handlers can leave a
  finding `route` as `null`.
- Only documented HTTP inputs and selected database, command, and code APIs are
  recognized. Dynamic properties and broad framework/library inference are out
  of scope.
- Parameterized SQL is not reported merely because a parameter is tainted. The
  analyzer does not prove arbitrary sanitization or validation safe.
- `eval` and `Function` findings are taint-aware; constant uses are not emitted
  as remote-code-execution findings under the Evaluation 1 policy.

A clean output does not prove a project has no vulnerabilities.
