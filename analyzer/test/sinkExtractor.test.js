const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { parseFile, parseSource } = require('../parser');
const { extractSinks, extractSinksFromParsedFiles, getSinkContext } = require('../extractors/sinkExtractor');

const fixturePath = path.join(__dirname, 'fixtures', 'sink-project', 'controller.js');

function extractFixtureSinks() {
  return extractSinks(parseFile(fixturePath, 'controllers/userController.js'));
}

test('extracts db.query with type, name, and source location', () => {
  assert.deepEqual(extractFixtureSinks()[0], {
    id: 'sink_001',
    type: 'DATABASE',
    name: 'db.query',
    file: 'controllers/userController.js',
    line: 1
  });
});

test('extracts parameterized database calls without classifying vulnerabilities', () => {
  const sink = extractFixtureSinks()[1];
  const context = getSinkContext(sink);
  assert.equal(sink.type, 'DATABASE');
  assert.equal(sink.line, 2);
  assert.equal(context.arguments.length, 2);
  assert.equal(context.arguments[0].type, 'StringLiteral');
  assert.equal(context.arguments[1].type, 'ArrayExpression');
  assert.deepEqual(Object.keys(sink), ['id', 'type', 'name', 'file', 'line']);
});

test('extracts exec, execSync, spawn, and spawnSync as command sinks', () => {
  const sinks = extractFixtureSinks();
  assert.deepEqual(sinks.filter((sink) => sink.type === 'COMMAND_EXECUTION').map((sink) => ({
    name: sink.name,
    line: sink.line
  })), [
    { name: 'exec', line: 3 },
    { name: 'execSync', line: 4 },
    { name: 'spawn', line: 5 },
    { name: 'spawnSync', line: 12 }
  ]);
});

test('extracts eval, Function, and new Function as code-execution sinks', () => {
  const sinks = extractFixtureSinks().filter((sink) => sink.type === 'DANGEROUS_CODE_EXECUTION');
  assert.deepEqual(sinks.map((sink) => ({ name: sink.name, line: sink.line })), [
    { name: 'eval', line: 6 },
    { name: 'Function', line: 7 },
    { name: 'Function', line: 8 }
  ]);
  assert.equal(getSinkContext(sinks[2]).node.type, 'NewExpression');
});

test('does not classify unrelated method calls as sinks', () => {
  const sinks = extractFixtureSinks();
  assert.equal(sinks.some((sink) => sink.name === 'logger.query'), false);
  assert.equal(sinks.some((sink) => sink.name === 'utility.exec'), false);
  assert.equal(sinks.length, 10);
});

test('keeps AST context internal and inspectable for later taint analysis', () => {
  const sink = extractFixtureSinks()[0];
  const context = getSinkContext(sink);
  assert.equal(context.node.type, 'CallExpression');
  assert.equal(context.callee.type, 'MemberExpression');
  assert.equal(context.arguments[0].value, 'SELECT * FROM users');
  assert.equal(JSON.stringify(sink).includes('CallExpression'), false);
});

test('extracts multiple sinks once with unique scan-local IDs', () => {
  const sinks = extractFixtureSinks();
  assert.deepEqual(sinks.map((sink) => sink.id), [
    'sink_001', 'sink_002', 'sink_003', 'sink_004', 'sink_005',
    'sink_006', 'sink_007', 'sink_008', 'sink_009', 'sink_010'
  ]);
  assert.equal(new Set(sinks.map((sink) => sink.id)).size, sinks.length);
});

test('assigns sink IDs uniquely across parsed files', () => {
  const parsedFiles = [
    parseSource('one.js', "db.query('SELECT 1');"),
    parseSource('two.js', 'eval(code);')
  ];
  assert.deepEqual(extractSinksFromParsedFiles(parsedFiles).map((sink) => sink.id), [
    'sink_001', 'sink_002'
  ]);
});
