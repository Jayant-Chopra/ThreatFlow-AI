'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateSchema, buildGraphModel } = require('../src/graphBuilder');
const { makeOutput, singleSqlInjection } = require('./helpers');

test('validateSchema accepts schema 1.0', () => {
  assert.equal(validateSchema(makeOutput()), true);
});

test('validateSchema rejects wrong version, non-objects and missing arrays', () => {
  assert.throws(() => validateSchema(makeOutput({ schemaVersion: '2.0' })), /Unsupported schema version/);
  assert.throws(() => validateSchema(null), /expected a JSON object/);
  assert.throws(() => validateSchema([]), /expected a JSON object/);
  const missing = makeOutput();
  delete missing.sinks;
  assert.throws(() => validateSchema(missing), /"sinks"/);
});

test('duplicate entity IDs are rejected instead of silently merged', () => {
  const output = makeOutput({
    sources: [{ id: 'x1', type: 'HTTP_INPUT', expression: 'req.query.a', file: 'a.js', line: 1 }],
    sinks: [{ id: 'x1', type: 'DATABASE', name: 'db.query', file: 'a.js', line: 2 }]
  });
  assert.throws(() => buildGraphModel(output), /Duplicate entity id "x1"/);
});

test('one node per entity and one edge per valid relationship', () => {
  const model = buildGraphModel(singleSqlInjection());
  assert.equal(model.nodes.length, 5);
  assert.equal(model.edges.length, 3);
  assert.deepEqual(
    model.edges.map((e) => [e.source, e.target, e.data.relationshipType]),
    [['r1', 'f1', 'ROUTE_TO_FUNCTION'], ['s1', 'v1', 'ASSIGNMENT'], ['v1', 'k1', 'DATA_FLOW']]
  );
});

test('dangling and duplicate relationships are dropped and counted', () => {
  const base = singleSqlInjection();
  const model = buildGraphModel({
    ...base,
    relationships: [...base.relationships, { from: 'v1', to: 'k1', type: 'DATA_FLOW' }, { from: 'v1', to: 'missing', type: 'DATA_FLOW' }]
  });
  assert.equal(model.edges.length, 3);
  assert.equal(model.diagnostics.droppedRelationships, 1);
});

test('a dynamic route path stays null and is not replaced by an invented path', () => {
  const model = buildGraphModel(makeOutput({
    routes: [{ id: 'r1', method: 'POST', path: null, file: 'app.js', line: 4, handler: null }]
  }));
  const node = model.nodes[0];
  assert.equal(node.data.entity.path, null);
  assert.equal(node.data.label, 'POST (dynamic path)');
});

test('nodes carry analyzer locations and React Flow types', () => {
  const model = buildGraphModel(singleSqlInjection());
  const sink = model.nodes.find((n) => n.id === 'k1');
  assert.equal(sink.type, 'sinkNode');
  assert.equal(sink.data.location, 'app.js:3');
  assert.equal(sink.data.badge, 'DATABASE');
  assert.equal(sink.data.isVulnerable, false); // set only by the attack-path stage
});
