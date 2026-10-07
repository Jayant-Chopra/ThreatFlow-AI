'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { analyzeAttackGraph } = require('../src');
const { makeOutput } = require('./helpers');

/**
 * One input (req.query.id -> id) feeding two sinks: a SQL query and a shell command.
 */
function sharedInput() {
  return makeOutput({
    routes: [{ id: 'r1', method: 'GET', path: '/x', file: 'app.js', line: 20, handler: 'h' }],
    functions: [{ id: 'f1', name: 'h', file: 'app.js', line: 1 }],
    sources: [{ id: 's1', type: 'HTTP_INPUT', expression: 'req.query.id', file: 'app.js', line: 2 }],
    variables: [{ id: 'v1', name: 'id', file: 'app.js', line: 2 }],
    sinks: [
      { id: 'k1', type: 'DATABASE', name: 'db.query', file: 'app.js', line: 3 },
      { id: 'k2', type: 'COMMAND_EXECUTION', name: 'exec', file: 'app.js', line: 4 }
    ],
    relationships: [
      { from: 'r1', to: 'f1', type: 'ROUTE_TO_FUNCTION' },
      { from: 's1', to: 'v1', type: 'ASSIGNMENT' },
      { from: 'v1', to: 'k1', type: 'DATA_FLOW' },
      { from: 'v1', to: 'k2', type: 'DATA_FLOW' }
    ],
    findings: [
      { id: 'finding_001', type: 'SQL_INJECTION', severity: 'HIGH', title: 'a', file: 'app.js', line: 3, source: 'req.query.id', sink: 'db.query', route: 'GET /x', evidence: 'e' },
      { id: 'finding_002', type: 'COMMAND_INJECTION', severity: 'HIGH', title: 'b', file: 'app.js', line: 4, source: 'req.query.id', sink: 'exec', route: 'GET /x', evidence: 'e' }
    ]
  });
}

test('a shared input is found as the chokepoint that blocks both paths', () => {
  const { chokepoints } = analyzeAttackGraph(sharedInput());
  assert.equal(chokepoints.primary.nodeId, 's1'); // ties with v1 broken by SOURCE > VARIABLE
  assert.equal(chokepoints.primary.isShared, true);
  assert.deepEqual(chokepoints.primary.newlyBlockedPathIds, ['PATH-001', 'PATH-002']);
  assert.equal(chokepoints.summary.fixesToBlockAllPaths, 1);
  assert.equal(chokepoints.plan[0].cumulativePercent, 100);
  assert.match(chokepoints.primary.recommendation, /fixing each sink is still recommended/);
});

test('routes and handler functions are never proposed as the fix', () => {
  const { chokepoints } = analyzeAttackGraph(sharedInput());
  const categories = new Set(chokepoints.candidates.map((c) => c.category));
  assert.equal(categories.has('ROUTE'), false);
  assert.equal(categories.has('FUNCTION'), false);
});

test('advice matches the sink type', () => {
  const output = sharedInput();
  output.findings = [output.findings[0]]; // only the SQL injection
  const { chokepoints } = analyzeAttackGraph(output);
  assert.equal(chokepoints.primary.nodeId, 'k1'); // single path: SINK preferred
  assert.match(chokepoints.primary.recommendation, /parameterized query/);
  assert.equal(chokepoints.primary.isShared, false);
});

test('no attack paths means no chokepoint', () => {
  const { chokepoints } = analyzeAttackGraph(makeOutput());
  assert.equal(chokepoints.primary, null);
  assert.equal(chokepoints.summary.fixesToBlockAllPaths, 0);
});
