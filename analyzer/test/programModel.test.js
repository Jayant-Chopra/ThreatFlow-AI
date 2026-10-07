const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { parseFile, parseSource } = require('../parser');
const { buildProgramModel, getProgramModelContext } = require('../model/programModel');

const fixturePath = path.join(__dirname, 'fixtures', 'program-model-project', 'app.js');

function buildFixtureModel() {
  const parsedFile = parseFile(fixturePath, 'app.js');
  return buildProgramModel([parsedFile], { name: 'program-model-project', path: '/program-model-project' });
}

function findByLine(entities, line) {
  return entities.find((entity) => entity.line === line);
}

function hasRelationship(model, from, to, type) {
  return model.relationships.some((relationship) => (
    relationship.from === from && relationship.to === to && relationship.type === type
  ));
}

test('creates direct source-to-variable, variable-to-variable, and variable-to-sink edges', () => {
  const model = buildFixtureModel();
  const source = findByLine(model.sources, 2);
  const id = findByLine(model.variables, 2);
  const query = findByLine(model.variables, 3);
  const sink = findByLine(model.sinks, 4);
  assert.ok(hasRelationship(model, source.id, id.id, 'ASSIGNMENT'));
  assert.ok(hasRelationship(model, id.id, query.id, 'VARIABLE_TO_VARIABLE'));
  assert.ok(hasRelationship(model, query.id, sink.id, 'DATA_FLOW'));
});

test('creates a route-to-function relationship from the resolved handler binding', () => {
  const model = buildFixtureModel();
  const route = findByLine(model.routes, 6);
  const functionRecord = findByLine(model.functions, 1);
  assert.ok(hasRelationship(model, route.id, functionRecord.id, 'ROUTE_TO_FUNCTION'));
});

test('does not connect unrelated same-named variables across scopes', () => {
  const model = buildFixtureModel();
  const requestId = findByLine(model.variables, 2);
  const safeId = findByLine(model.variables, 9);
  const localId = findByLine(model.variables, 19);
  assert.notEqual(requestId.id, safeId.id);
  assert.notEqual(requestId.id, localId.id);
  assert.equal(hasRelationship(model, requestId.id, safeId.id, 'VARIABLE_TO_VARIABLE'), false);
  assert.equal(hasRelationship(model, requestId.id, localId.id, 'VARIABLE_TO_VARIABLE'), false);
});

test('preserves parameterized-query argument metadata without generating findings', () => {
  const model = buildFixtureModel();
  const parameterizedSink = findByLine(model.sinks, 10);
  const details = getProgramModelContext(model).sinkDetails.get(parameterizedSink.id);
  assert.equal(parameterizedSink.type, 'DATABASE');
  assert.equal(details.isParameterized, true);
  assert.deepEqual(details.arguments.map((argument) => argument.kind), ['CONSTANT', 'ARRAY']);
  assert.deepEqual(model.findings, []);
});

test('preserves constant-query expression metadata', () => {
  const model = buildFixtureModel();
  const constantQuery = findByLine(model.variables, 14);
  const values = getProgramModelContext(model).variableValues.get(constantQuery.id);
  assert.deepEqual(values, [{
    kind: 'DECLARATION',
    expression: { kind: 'CONSTANT', sourceIds: [], variableIds: [] }
  }]);
});

test('keeps AST-free descriptors for concatenation, templates, and parameterized arguments', () => {
  const model = buildProgramModel([parseSource(
    'expressions.js',
    "const id = req.query.id; const concatenated = 'id=' + id; const templated = `id=${id}`; db.query('SELECT * WHERE id = ?', [id]);"
  )]);
  const context = getProgramModelContext(model);
  const id = model.variables.find((variable) => variable.name === 'id');
  const concatenated = model.variables.find((variable) => variable.name === 'concatenated');
  const templated = model.variables.find((variable) => variable.name === 'templated');
  const sink = model.sinks[0];
  const sinkDetails = context.sinkDetails.get(sink.id);
  assert.equal(context.variableValues.get(concatenated.id)[0].expression.kind, 'STRING_CONCATENATION');
  assert.equal(context.variableValues.get(templated.id)[0].expression.kind, 'TEMPLATE_LITERAL');
  assert.deepEqual(sinkDetails.arguments.map((argument) => argument.kind), ['CONSTANT', 'ARRAY']);
  assert.deepEqual(sinkDetails.arguments[1].variableIds, [id.id]);
  assert.equal(JSON.stringify(sinkDetails).includes('MemberExpression'), false);
});

test('uses only existing entity IDs and does not duplicate relationships', () => {
  const model = buildFixtureModel();
  const entityIds = new Set([
    ...model.routes,
    ...model.functions,
    ...model.variables,
    ...model.sources,
    ...model.sinks
  ].map((entity) => entity.id));
  const relationshipKeys = model.relationships.map((relationship) => (
    `${relationship.from}|${relationship.to}|${relationship.type}`
  ));
  assert.ok(model.relationships.every((relationship) => (
    entityIds.has(relationship.from) && entityIds.has(relationship.to)
  )));
  assert.equal(new Set(relationshipKeys).size, relationshipKeys.length);
});

test('serializes external output without AST nodes while retaining AST-free rule metadata', () => {
  const model = buildFixtureModel();
  const output = model.toOutput();
  const serialized = JSON.stringify(output);
  const contextSerialized = JSON.stringify({
    sinkDetails: [...getProgramModelContext(model).sinkDetails],
    variableValues: [...getProgramModelContext(model).variableValues]
  });
  assert.equal(JSON.parse(serialized).schemaVersion, '1.0');
  assert.equal(serialized.includes('CallExpression'), false);
  assert.equal(contextSerialized.includes('CallExpression'), false);
  assert.equal(Object.hasOwn(output, 'ast'), false);
});
