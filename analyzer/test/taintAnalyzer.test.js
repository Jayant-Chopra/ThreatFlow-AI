const assert = require('node:assert/strict');
const test = require('node:test');

const { parseSource } = require('../parser');
const { buildProgramModel } = require('../model/programModel');
const { analyzeTaint, getSinkTaint } = require('../taint/taintAnalyzer');

function analyze(source) {
  const model = buildProgramModel([parseSource('taint.js', source)]);
  return { model, result: analyzeTaint(model) };
}

function sinkAtLine(model, result, line) {
  return getSinkTaint(result, model.sinks.find((sink) => sink.line === line).id);
}

test('finds direct source-to-sink taint', () => {
  const { model, result } = analyze('db.query(req.query.id);');
  const sinkTaint = sinkAtLine(model, result, 1);
  assert.equal(sinkTaint.isTainted, true);
  assert.deepEqual(sinkTaint.sourceIds, ['source_001']);
  assert.deepEqual(sinkTaint.arguments[0].paths[0].relationships, [
    { from: 'source_001', to: 'sink_001', type: 'DATA_FLOW' }
  ]);
});

test('finds source-to-variable-to-sink taint', () => {
  const { model, result } = analyze('const id = req.query.id; db.query(id);');
  const sinkTaint = sinkAtLine(model, result, 1);
  assert.deepEqual(sinkTaint.arguments[0].sourceIds, ['source_001']);
  assert.deepEqual(sinkTaint.arguments[0].paths[0].relationships.map((edge) => edge.type), [
    'ASSIGNMENT', 'DATA_FLOW'
  ]);
});

test('finds multi-variable taint chains and records string concatenation', () => {
  const { model, result } = analyze(
    "const id = req.query.id; const query = 'SELECT ' + id; db.query(query);"
  );
  const sinkTaint = sinkAtLine(model, result, 1);
  assert.deepEqual(sinkTaint.arguments[0].paths[0].relationships.map((edge) => edge.type), [
    'ASSIGNMENT', 'VARIABLE_TO_VARIABLE', 'DATA_FLOW'
  ]);
  assert.ok(sinkTaint.arguments[0].paths[0].operations.includes('STRING_CONCATENATION'));
});

test('finds template-literal taint', () => {
  const { model, result } = analyze('const id = req.query.id; const query = `SELECT ${id}`; db.query(query);');
  const sinkTaint = sinkAtLine(model, result, 1);
  assert.equal(sinkTaint.isTainted, true);
  assert.ok(sinkTaint.arguments[0].paths[0].operations.includes('TEMPLATE_LITERAL'));
});

test('does not taint constant-only sinks', () => {
  const { model, result } = analyze("db.query('SELECT 1');");
  const sinkTaint = sinkAtLine(model, result, 1);
  assert.equal(sinkTaint.isTainted, false);
  assert.deepEqual(sinkTaint.sourceIds, []);
});

test('reports tainted parameterized SQL arguments without making a finding', () => {
  const { model, result } = analyze("const id = req.query.id; db.query('SELECT * WHERE id = ?', [id]);");
  const sinkTaint = sinkAtLine(model, result, 1);
  assert.equal(sinkTaint.isTainted, true);
  assert.equal(sinkTaint.isParameterized, true);
  assert.equal(sinkTaint.arguments[0].isTainted, false);
  assert.equal(sinkTaint.arguments[1].isTainted, true);
  assert.deepEqual(model.findings, []);
});

test('does not connect unrelated source and sink paths', () => {
  const { model, result } = analyze("const id = req.query.id; const constant = 'SELECT 1'; db.query(constant);");
  const sinkTaint = sinkAtLine(model, result, 1);
  assert.equal(sinkTaint.isTainted, false);
  assert.equal(result.sinks.length, 1);
});

test('preserves independent sources and deterministic source paths', () => {
  const source = 'const id = req.query.id; const name = req.body.name; db.query(id + name);';
  const first = analyze(source);
  const second = analyze(source);
  const firstTaint = sinkAtLine(first.model, first.result, 1);
  const secondTaint = sinkAtLine(second.model, second.result, 1);
  assert.deepEqual(firstTaint.sourceIds, ['source_001', 'source_002']);
  assert.deepEqual(firstTaint, secondTaint);
});

test('does not leak same-named variables between scopes', () => {
  const { model, result } = analyze(
    "function safe() { const id = 'constant'; db.query(id); } function unsafe() { const id = req.query.id; db.query(id); }"
  );
  assert.equal(sinkAtLine(model, result, 1).isTainted, false);
  assert.equal(model.sinks[1].line, 1);
  assert.equal(getSinkTaint(result, model.sinks[1].id).isTainted, true);
});

test('terminates on cyclic relationships without duplicate paths', () => {
  const { model, result } = analyze('let a = req.query.id; let b = a; a = b; db.query(a);');
  const sinkTaint = sinkAtLine(model, result, 1);
  assert.equal(sinkTaint.isTainted, true);
  assert.equal(sinkTaint.arguments[0].paths.length, 1);
  assert.deepEqual(sinkTaint.arguments[0].sourceIds, ['source_001']);
});
