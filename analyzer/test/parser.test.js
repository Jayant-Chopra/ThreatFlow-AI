const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { parseDiscoveredFiles, parseFile, parseSource } = require('../parser');
const { scanProject } = require('../scanner');

test('parses valid simple JavaScript into an internal Babel AST', () => {
  const result = parseSource('simple.js', 'const answer = 42;');
  assert.equal(result.file, 'simple.js');
  assert.equal(result.source, 'const answer = 42;');
  assert.equal(result.ast.type, 'File');
  assert.equal(result.ast.program.body[0].type, 'VariableDeclaration');
  assert.equal(result.error, undefined);
});

test('parses modern JavaScript syntax used by Node.js and Express projects', () => {
  const source = [
    "import express from 'express';",
    'const router = express.Router();',
    "router.get('/users/:id', async (req, res) => {",
    "  const id = req.query?.id ?? 'anonymous';",
    '  await Promise.resolve(id);',
    '  return res.json({ id });',
    '});',
    'export default router;'
  ].join('\n');
  const result = parseSource('routes/users.js', source);
  assert.equal(result.ast.program.sourceType, 'module');
  assert.equal(result.ast.program.body[2].expression.type, 'CallExpression');
  assert.equal(result.error, undefined);
});

test('parses nested expressions', () => {
  const result = parseSource('nested.js', 'const result = fn(a ? one(two(3)) : four({ value: 5 }));');
  const initializer = result.ast.program.body[0].declarations[0].init;
  assert.equal(initializer.type, 'CallExpression');
  assert.equal(initializer.arguments[0].type, 'ConditionalExpression');
});

test('returns a structured parse error for malformed JavaScript', () => {
  const result = parseSource('broken.js', 'const value = ;');
  assert.deepEqual(result.file, 'broken.js');
  assert.equal(result.error.type, 'PARSE_ERROR');
  assert.equal(typeof result.error.message, 'string');
  assert.equal(typeof result.error.line, 'number');
  assert.equal(typeof result.error.column, 'number');
  assert.equal(result.ast, undefined);
});

test('preserves source locations for a request-input expression', () => {
  const source = 'const id = req.query.id;';
  const result = parseSource('app.js', source);
  const declaration = result.ast.program.body[0];
  const identifier = declaration.declarations[0].id;
  const expression = declaration.declarations[0].init;
  assert.equal(declaration.loc.start.line, 1);
  assert.equal(declaration.loc.start.column, 0);
  assert.equal(declaration.loc.start.index, 0);
  assert.equal(identifier.loc.start.column, 6);
  assert.equal(expression.loc.start.column, 11);
  assert.equal(expression.loc.end.column, 23);
  assert.equal(declaration.start, 0);
  assert.equal(declaration.end, source.length);
});

test('continues parsing valid discovered files after a malformed file', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'parser-project');
  const results = parseDiscoveredFiles(scanProject(fixturePath));
  assert.equal(results.length, 2);
  assert.equal(results.find((result) => result.file === 'broken.js').error.type, 'PARSE_ERROR');
  assert.equal(results.find((result) => result.file === 'good.js').ast.type, 'File');
});

test('returns a controlled read error for a file that cannot be opened', () => {
  const result = parseFile(path.join(__dirname, 'fixtures', 'missing.js'), 'missing.js');
  assert.equal(result.file, 'missing.js');
  assert.equal(result.error.type, 'READ_ERROR');
  assert.equal(result.ast, undefined);
});
