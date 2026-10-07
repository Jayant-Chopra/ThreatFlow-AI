const assert = require('node:assert/strict');
const test = require('node:test');

const { parseSource } = require('../parser');
const { buildProgramModel } = require('../model/programModel');
const { analyzeTaint } = require('../taint/taintAnalyzer');
const { evaluateSqlInjection } = require('../rules/sqlInjection');
const { evaluateCommandInjection } = require('../rules/commandInjection');
const { evaluateCodeExecution } = require('../rules/codeExecution');

function analyze(source) {
  const model = buildProgramModel([parseSource('app.js', source)]);
  const taint = analyzeTaint(model);
  return {
    command: evaluateCommandInjection(model, taint),
    code: evaluateCodeExecution(model, taint),
    model,
    sql: evaluateSqlInjection(model, taint)
  };
}

test('resolves SQL injection in a named route handler', () => {
  const { sql } = analyze(`
    function getUser(req, res) {
      const id = req.query.id;
      db.query('SELECT * FROM users WHERE id=' + id);
    }
    app.get('/users', getUser);
  `);

  assert.equal(sql.length, 1);
  assert.equal(sql[0].route, 'GET /users');
});

test('resolves SQL injection in an anonymous route handler', () => {
  const { model, sql } = analyze(`
    app.get('/users', (req, res) => {
      const id = req.query.id;
      db.query('SELECT * FROM users WHERE id=' + id);
    });
  `);

  assert.equal(model.functions[0].name, null);
  assert.equal(model.relationships.some((edge) => edge.type === 'ROUTE_TO_FUNCTION'), true);
  assert.equal(sql[0].route, 'GET /users');
});

test('resolves command injection through a route with middleware', () => {
  const { command } = analyze(`
    function runCommand(req, res) {
      const command = req.query.command;
      exec(command);
    }
    app.post('/commands', auth, runCommand);
  `);

  assert.equal(command.length, 1);
  assert.equal(command[0].route, 'POST /commands');
});

test('resolves dangerous code execution through a route handler', () => {
  const { code } = analyze(`
    const executeCode = (req, res) => {
      const code = req.body.code;
      eval(code);
    };
    router.put('/execute', executeCode);
  `);

  assert.equal(code.length, 1);
  assert.equal(code[0].route, 'PUT /execute');
});

test('leaves a finding outside every route unassociated', () => {
  const { sql } = analyze(`
    const id = req.query.id;
    db.query('SELECT * FROM users WHERE id=' + id);
  `);

  assert.equal(sql.length, 1);
  assert.equal(sql[0].route, null);
});

test('associates each finding with its own route rather than the first route', () => {
  const { sql } = analyze(`
    function first(req, res) {
      const id = req.query.first;
      db.query('SELECT * FROM first WHERE id=' + id);
    }
    function second(req, res) {
      const id = req.query.second;
      db.query('SELECT * FROM second WHERE id=' + id);
    }
    app.get('/first', first);
    app.get('/second', second);
  `);

  assert.deepEqual(sql.map((finding) => finding.route), ['GET /first', 'GET /second']);
});

test('keeps safe route examples free of findings', () => {
  const { code, command, sql } = analyze(`
    function safe(req, res) {
      const id = req.query.id;
      db.query('SELECT * FROM users WHERE id = ?', [id]);
      exec('whoami');
    }
    app.get('/safe', safe);
  `);

  assert.deepEqual(sql, []);
  assert.deepEqual(command, []);
  assert.deepEqual(code, []);
});

test('retains one route-associated finding for one vulnerable source-to-sink pair', () => {
  const { sql } = analyze(`
    function getUser(req, res) {
      const id = req.query.id;
      const query = 'SELECT * FROM users WHERE id=' + id;
      db.query(query);
    }
    app.get('/users', getUser);
  `);

  assert.equal(sql.length, 1);
  assert.equal(sql[0].route, 'GET /users');
  assert.equal(sql[0].id, 'finding_001');
});
