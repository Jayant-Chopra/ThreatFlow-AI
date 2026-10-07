const assert = require('node:assert/strict');
const test = require('node:test');

const { parseSource } = require('../parser');
const { buildProgramModel } = require('../model/programModel');
const { analyzeTaint } = require('../taint/taintAnalyzer');
const { buildFindings } = require('../output/findingBuilder');
const { collectSqlInjectionCandidates } = require('../rules/sqlInjection');
const { collectCommandInjectionCandidates } = require('../rules/commandInjection');
const { collectCodeExecutionCandidates } = require('../rules/codeExecution');

function buildRuleModel() {
  return buildProgramModel([parseSource(
    'controllers/handler.js',
    "function handler(req) { const id = req.query.id; db.query('SELECT ' + id); exec(id); eval(id); } app.get('/users', handler);"
  )]);
}

test('normalizes candidates from all rules into one external finding shape', () => {
  const model = buildRuleModel();
  const taint = analyzeTaint(model);
  const candidates = [
    ...collectSqlInjectionCandidates(model, taint),
    ...collectCommandInjectionCandidates(model, taint),
    ...collectCodeExecutionCandidates(model, taint)
  ];
  const findings = buildFindings(model, candidates);
  assert.deepEqual(findings.map((finding) => finding.id), ['finding_001', 'finding_002', 'finding_003']);
  assert.deepEqual(findings.map((finding) => finding.type), [
    'SQL_INJECTION', 'COMMAND_INJECTION', 'CODE_EXECUTION'
  ]);
  assert.ok(findings.every((finding) => (
    finding.severity === 'HIGH' && finding.file === 'controllers/handler.js' && finding.line === 1 &&
    finding.source === 'req.query.id' && typeof finding.sink === 'string' && finding.route === 'GET /users' &&
    typeof finding.evidence === 'string' && finding.evidence.length > 0
  )));
});

test('deduplicates identical vulnerabilities and keeps IDs unique within one build', () => {
  const model = buildRuleModel();
  const candidate = collectSqlInjectionCandidates(model, analyzeTaint(model))[0];
  const findings = buildFindings(model, [candidate, candidate]);
  assert.deepEqual(findings.map((finding) => finding.id), ['finding_001']);
});

test('normalizes aliases and severity while resolving source, sink, and known route display values', () => {
  const model = buildRuleModel();
  const findings = buildFindings(model, [{
    type: 'DANGEROUS_CODE_EXECUTION',
    severity: 'high',
    sourceId: model.sources[0].id,
    sinkId: model.sinks.find((sink) => sink.name === 'eval').id,
    routeId: model.routes[0].id,
    evidence: '  Tainted source reaches eval.  '
  }]);
  assert.deepEqual(findings[0], {
    id: 'finding_001',
    type: 'CODE_EXECUTION',
    severity: 'HIGH',
    title: 'Potential Dangerous Code Execution',
    file: 'controllers/handler.js',
    line: 1,
    source: 'req.query.id',
    sink: 'eval',
    route: 'GET /users',
    evidence: 'Tainted source reaches eval.'
  });
});

test('rejects malformed candidates and unknown entity references', () => {
  const model = buildRuleModel();
  assert.throws(() => buildFindings(model, [{ type: 'SQL_INJECTION' }]), /requires sourceId, sinkId, and non-empty evidence/);
  assert.throws(() => buildFindings(model, [{
    type: 'SQL_INJECTION',
    sourceId: 'source_unknown',
    sinkId: model.sinks[0].id,
    evidence: 'Observed flow.'
  }]), /must reference Program Model entities/);
});
