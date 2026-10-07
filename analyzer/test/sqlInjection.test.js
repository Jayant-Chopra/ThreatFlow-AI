const assert = require('node:assert/strict');
const test = require('node:test');

const { parseSource } = require('../parser');
const { buildProgramModel } = require('../model/programModel');
const { evaluateSqlInjection } = require('../rules/sqlInjection');
const { analyzeTaint } = require('../taint/taintAnalyzer');

function evaluate(source) {
  const model = buildProgramModel([parseSource('controllers/users.js', source)]);
  return { findings: evaluateSqlInjection(model, analyzeTaint(model)), model };
}

test('reports direct concatenation of HTTP input into a database query', () => {
  const { findings } = evaluate("db.query('SELECT * FROM users WHERE id=' + req.query.id);");
  assert.deepEqual(findings, [{
    id: 'finding_001',
    type: 'SQL_INJECTION',
    severity: 'HIGH',
    title: 'Potential SQL Injection',
    file: 'controllers/users.js',
    line: 1,
    source: 'req.query.id',
    sink: 'db.query',
    route: null,
    evidence: 'Tainted HTTP input reaches a database query through string concatenation.'
  }]);
});

test('reports a variable that holds concatenated SQL', () => {
  const { findings } = evaluate(
    "const id = req.query.id; const query = 'SELECT * FROM users WHERE id=' + id; db.query(query);"
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'HIGH');
  assert.equal(findings[0].source, 'req.query.id');
  assert.equal(findings[0].sink, 'db.query');
  assert.equal(findings[0].line, 1);
  assert.match(findings[0].evidence, /string concatenation/);
});

test('reports template literals with tainted interpolations', () => {
  const { findings } = evaluate('const id = req.params.id; const query = `SELECT * WHERE id=${id}`; db.query(query);');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].source, 'req.params.id');
  assert.match(findings[0].evidence, /template literal/);
});

test('does not report parameterized queries with tainted parameters', () => {
  const { findings } = evaluate("const id = req.query.id; db.query('SELECT * WHERE id = ?', [id]);");
  assert.deepEqual(findings, []);
});

test('does not report constant queries', () => {
  const { findings } = evaluate("db.query('SELECT * FROM users');");
  assert.deepEqual(findings, []);
});

test('does not report HTTP input used only in non-SQL operations', () => {
  const { findings } = evaluate('const id = req.query.id; exec(id);');
  assert.deepEqual(findings, []);
});

test('does not duplicate a finding for repeated traversal paths to the same source and sink', () => {
  const { findings } = evaluate("let id = req.query.id; let query = 'SELECT ' + id; id = query; db.query(query);");
  assert.equal(findings.length, 1);
  assert.equal(new Set(findings.map((finding) => finding.id)).size, findings.length);
});

test('assigns unique finding IDs when multiple independent vulnerable queries exist', () => {
  const { findings } = evaluate(
    "const id = req.query.id; const name = req.body.name; db.query('SELECT ' + id); db.query(`SELECT ${name}`);"
  );
  assert.deepEqual(findings.map((finding) => finding.id), ['finding_001', 'finding_002']);
  assert.deepEqual(findings.map((finding) => finding.source), ['req.query.id', 'req.body.name']);
});
