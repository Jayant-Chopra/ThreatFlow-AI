const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { parseFile, parseSource } = require('../parser');
const {
  extractVariables,
  extractVariablesFromParsedFiles,
  getVariableContext
} = require('../extractors/variableExtractor');

const fixturePath = path.join(__dirname, 'fixtures', 'variable-project', 'controller.js');

function extractFixtureVariables() {
  return extractVariables(parseFile(fixturePath, 'controllers/userController.js'));
}

test('extracts const, let, and var declarations with their locations', () => {
  assert.deepEqual(extractFixtureVariables().slice(0, 3), [
    { id: 'var_001', name: 'id', file: 'controllers/userController.js', line: 1 },
    { id: 'var_002', name: 'name', file: 'controllers/userController.js', line: 2 },
    { id: 'var_003', name: 'count', file: 'controllers/userController.js', line: 3 }
  ]);
});

test('keeps reassignment and update locations internally without duplicate variables', () => {
  const variables = extractFixtureVariables();
  const name = variables.find((variable) => variable.name === 'name');
  const count = variables.find((variable) => variable.name === 'count');
  assert.equal(variables.filter((variable) => variable.name === 'name').length, 1);
  assert.equal(variables.filter((variable) => variable.name === 'count').length, 1);
  assert.deepEqual(getVariableContext(name).assignmentNodes.map((node) => node.loc.start.line), [4]);
  assert.deepEqual(getVariableContext(count).assignmentNodes.map((node) => node.loc.start.line), [5]);
});

test('treats same-named bindings in different functions as distinct variables', () => {
  const ids = extractFixtureVariables().filter((variable) => variable.name === 'id');
  assert.deepEqual(ids.map((variable) => variable.line), [1, 8, 12]);
  assert.equal(new Set(ids.map((variable) => variable.id)).size, 3);
  assert.notEqual(getVariableContext(ids[0]).binding, getVariableContext(ids[1]).binding);
  assert.notEqual(getVariableContext(ids[1]).binding, getVariableContext(ids[2]).binding);
});

test('keeps nested block bindings distinct from their enclosing scope', () => {
  const outerVariables = extractFixtureVariables().filter((variable) => variable.name === 'outer');
  assert.deepEqual(outerVariables.map((variable) => variable.line), [16, 18]);
  assert.notEqual(getVariableContext(outerVariables[0]).binding, getVariableContext(outerVariables[1]).binding);
});

test('supports destructuring bindings without turning object property keys into variables', () => {
  const variables = extractFixtureVariables();
  assert.deepEqual(variables.slice(-4).map((variable) => ({ name: variable.name, line: variable.line })), [
    { name: 'userId', line: 21 },
    { name: 'role', line: 21 },
    { name: 'firstItem', line: 22 },
    { name: 'remaining', line: 22 }
  ]);
  assert.equal(variables.some((variable) => variable.name === 'metadata'), false);
});

test('does not treat object property names or property writes as local variables', () => {
  const variables = extractFixtureVariables();
  assert.equal(variables.some((variable) => variable.name === 'Ada'), false);
  assert.equal(variables.filter((variable) => variable.name === 'id').length, 3);
  assert.equal(variables.some((variable) => variable.line === 23), false);
});

test('assigns IDs uniquely across parsed files', () => {
  const parsedFiles = [
    parseSource('one.js', 'const one = 1;'),
    parseSource('two.js', 'let two = 2;')
  ];
  assert.deepEqual(extractVariablesFromParsedFiles(parsedFiles).map((variable) => variable.id), [
    'var_001', 'var_002'
  ]);
});
