const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const { analyzeProject, analyzeProjectWithDiagnostics } = require('../analyzer');

const analyzerRoot = path.join(__dirname, '..');
const fixturePath = (name) => path.join(__dirname, 'fixtures', name);
const REQUIRED_TOP_LEVEL_FIELDS = [
  'schemaVersion', 'project', 'files', 'routes', 'functions', 'sources',
  'sinks', 'variables', 'relationships', 'findings', 'summary'
];

function assertContract(output) {
  assert.deepEqual(Object.keys(output).sort(), [...REQUIRED_TOP_LEVEL_FIELDS].sort());
  assert.equal(output.schemaVersion, '1.0');
  assert.equal(typeof output.project.name, 'string');
  assert.equal(typeof output.project.path, 'string');
  for (const field of ['files', 'routes', 'functions', 'sources', 'sinks', 'variables', 'relationships', 'findings']) {
    assert.ok(Array.isArray(output[field]));
  }
  assert.deepEqual(output.summary, {
    filesAnalyzed: output.files.length,
    routesFound: output.routes.length,
    functionsFound: output.functions.length,
    sourcesFound: output.sources.length,
    sinksFound: output.sinks.length,
    findingsFound: output.findings.length
  });

  const entitiesById = new Map([
    ...output.routes,
    ...output.functions,
    ...output.sources,
    ...output.sinks,
    ...output.variables
  ].map((entity) => [entity.id, entity]));
  assert.ok(output.relationships.every((relationship) => (
    entitiesById.has(relationship.from) && entitiesById.has(relationship.to)
  )));
  assert.ok(output.findings.every((finding) => (
    output.sources.some((source) => source.expression === finding.source) &&
    output.sinks.some((sink) => sink.name === finding.sink) &&
    ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(finding.severity) &&
    (finding.route === null || typeof finding.route === 'string') &&
    typeof finding.evidence === 'string' && finding.evidence.length > 0
  )));
}

test('runs the complete pipeline for a vulnerable project and returns the Phase 1 contract', () => {
  const output = analyzeProject(fixturePath('pipeline-vulnerable'));
  assertContract(output);
  assert.equal(output.files.length, 1);
  assert.equal(output.routes.length, 1);
  assert.equal(output.findings.length, 3);
  assert.deepEqual(output.findings.map((finding) => finding.type), [
    'SQL_INJECTION', 'COMMAND_INJECTION', 'CODE_EXECUTION'
  ]);
  assert.deepEqual(output.findings.map((finding) => finding.id), [
    'finding_001', 'finding_002', 'finding_003'
  ]);
});

test('returns no findings for a safe project without emitting demo data', () => {
  const output = analyzeProject(fixturePath('pipeline-safe'));
  assertContract(output);
  assert.deepEqual(output.findings, []);
  assert.equal(output.summary.findingsFound, 0);
});

test('returns contract-shaped empty output for an empty project', () => {
  const output = analyzeProject(fixturePath('empty-project'));
  assertContract(output);
  assert.deepEqual(output.files, []);
  assert.deepEqual(output.findings, []);
});

test('retains valid-file results after one malformed JavaScript file', () => {
  const result = analyzeProjectWithDiagnostics(fixturePath('pipeline-malformed'));
  assertContract(result.output);
  assert.equal(result.output.files.length, 2);
  assert.equal(result.output.findings.length, 1);
  assert.deepEqual(result.parseErrors.map((item) => item.file), ['broken.js']);
  assert.equal(result.parseErrors[0].error.type, 'PARSE_ERROR');
});

test('CLI writes parseable machine-readable JSON to stdout only', () => {
  const result = spawnSync(process.execPath, ['scanner.js', fixturePath('pipeline-vulnerable')], {
    cwd: analyzerRoot,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  const output = JSON.parse(result.stdout);
  assertContract(output);
  assert.equal(output.findings.length, 3);
});
