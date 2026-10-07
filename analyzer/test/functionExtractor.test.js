const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { parseFile, parseSource } = require('../parser');
const {
  extractFunctions,
  extractFunctionsFromParsedFiles,
  getFunctionContext
} = require('../extractors/functionExtractor');
const { extractRoutes } = require('../extractors/routeExtractor');

const fixturePath = path.join(__dirname, 'fixtures', 'function-project', 'functions.js');

function extractFixtureFunctions() {
  return extractFunctions(parseFile(fixturePath, 'controllers/userController.js'));
}

test('extracts a named function declaration with its source location', () => {
  assert.deepEqual(extractFixtureFunctions()[0], {
    id: 'func_001',
    name: 'getUsers',
    file: 'controllers/userController.js',
    line: 1
  });
});

test('extracts a named function expression', () => {
  const functionExpression = extractFixtureFunctions().find((functionRecord) => (
    functionRecord.name === 'createUserHandler'
  ));
  assert.equal(functionExpression.line, 5);
});

test('uses a direct variable binding as the static name of an arrow function', () => {
  const arrowFunction = extractFixtureFunctions().find((functionRecord) => (
    functionRecord.name === 'updateUser'
  ));
  assert.equal(arrowFunction.line, 6);
});

test('keeps a truly anonymous callback name as null', () => {
  const anonymousCallback = extractFixtureFunctions().find((functionRecord) => functionRecord.line === 7);
  assert.equal(anonymousCallback.name, null);
});

test('extracts multiple and nested functions exactly once', () => {
  const functions = extractFixtureFunctions();
  assert.deepEqual(functions.map((functionRecord) => functionRecord.name), [
    'getUsers', 'createUserHandler', 'updateUser', null, 'outer', 'inner', 'nestedArrow'
  ]);
  assert.equal(new Set(functions.map((functionRecord) => functionRecord.id)).size, functions.length);
  assert.deepEqual(functions.slice(-3).map((functionRecord) => functionRecord.line), [9, 10, 11]);
});

test('does not crash on complex syntax and does not invent anonymous names', () => {
  const parsedFile = parseSource(
    'complex.js',
    'const controller = { async getUser() {}, save: async () => await Promise.resolve() }; setTimeout(() => {}, 0);'
  );
  const functions = extractFunctions(parsedFile);
  assert.deepEqual(functions.map((functionRecord) => functionRecord.name), ['getUser', 'save', null]);
});

test('does not treat route, database, or command calls as function definitions', () => {
  const parsedFile = parseSource(
    'calls.js',
    "const handler = () => {}; app.get('/users', handler); app.post('/users', handler); db.query('SELECT 1'); exec('whoami');"
  );
  const functions = extractFunctions(parsedFile);

  assert.deepEqual(functions.map((functionRecord) => functionRecord.name), ['handler']);
  assert.equal(functions.some((functionRecord) => ['get', 'post', 'query', 'exec'].includes(functionRecord.name)), false);
});

test('retains object methods and declarations because they are real function definitions', () => {
  const parsedFile = parseSource(
    'definitions.js',
    'const app = { get() {}, post() {} }; const db = { query() {} }; function exec() {}'
  );
  const functions = extractFunctions(parsedFile);

  assert.deepEqual(functions.map((functionRecord) => functionRecord.name), ['get', 'post', 'query', 'exec']);
  assert.equal(getFunctionContext(functions[0]).node.type, 'ObjectMethod');
  assert.equal(getFunctionContext(functions[3]).node.type, 'FunctionDeclaration');
});

test('assigns IDs uniquely across parsed files', () => {
  const parsedFiles = [
    parseSource('one.js', 'function one() {}'),
    parseSource('two.js', 'const two = () => {};')
  ];
  assert.deepEqual(extractFunctionsFromParsedFiles(parsedFiles).map((functionRecord) => functionRecord.id), [
    'func_001', 'func_002'
  ]);
});

test('shares a statically identifiable name with a route handler without building a call graph', () => {
  const parsedFile = parseSource('handlers.js', "function getUsers() {} app.get('/users', getUsers);");
  const functions = extractFunctions(parsedFile);
  const routes = extractRoutes(parsedFile);
  assert.equal(functions[0].name, routes[0].handler);
  assert.equal(functions[0].id, 'func_001');
  assert.equal(routes[0].id, 'route_001');
});
