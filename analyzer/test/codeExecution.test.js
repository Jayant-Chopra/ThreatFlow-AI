const assert = require('node:assert/strict');
const test = require('node:test');

const { parseSource } = require('../parser');
const { buildProgramModel } = require('../model/programModel');
const { analyzeTaint } = require('../taint/taintAnalyzer');
const { evaluateCodeExecution } = require('../rules/codeExecution');

function evaluate(source) {
  const model = buildProgramModel([parseSource('controllers/code.js', source)]);
  return { findings: evaluateCodeExecution(model, analyzeTaint(model)), model };
}

test('reports HTTP query input passed to eval', () => {
  const { findings } = evaluate('const code = req.query.code; eval(code);');
  assert.deepEqual(findings, [{
    id: 'finding_001',
    type: 'CODE_EXECUTION',
    severity: 'HIGH',
    title: 'Potential Dangerous Code Execution',
    file: 'controllers/code.js',
    line: 1,
    source: 'req.query.code',
    sink: 'eval',
    route: null,
    evidence: 'Tainted HTTP input reaches eval as executable code.'
  }]);
});

test('reports HTTP body input passed to Function', () => {
  const { findings } = evaluate('const code = req.body.code; Function(code);');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].source, 'req.body.code');
  assert.equal(findings[0].sink, 'Function');
  assert.equal(findings[0].severity, 'HIGH');
});

test('reports a tainted variable passed to new Function', () => {
  const { findings } = evaluate('const code = req.params.code; new Function(code);');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].sink, 'Function');
  assert.equal(findings[0].source, 'req.params.code');
});

test('uses the final Function argument as the executable body', () => {
  const { findings } = evaluate("const code = req.query.code; new Function('name', code);");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].source, 'req.query.code');
});

test('does not report unrelated variables or constant code under taint-only policy', () => {
  assert.deepEqual(evaluate("const code = 'return 1'; eval(code);").findings, []);
  assert.deepEqual(evaluate("new Function('return 1');").findings, []);
});

test('does not report normal function calls, database sinks, or command sinks', () => {
  const { findings } = evaluate('const code = req.query.code; run(code); db.query(code); exec(code);');
  assert.deepEqual(findings, []);
});

test('does not duplicate cyclic taint findings and assigns unique IDs', () => {
  const { findings } = evaluate('let code = req.query.code; let alias = code; code = alias; eval(code); new Function(req.body.code);');
  assert.deepEqual(findings.map((finding) => finding.id), ['finding_001', 'finding_002']);
  assert.equal(new Set(findings.map((finding) => finding.id)).size, findings.length);
});
