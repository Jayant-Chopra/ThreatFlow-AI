'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGraphModel } = require('../src/graphBuilder');
const { extractAttackPaths } = require('../src/pathAnalyzer');
const { makeOutput, singleSqlInjection } = require('./helpers');

function run(output) {
  return extractAttackPaths(buildGraphModel(output));
}

test('builds route -> handler -> source -> variable -> sink for a finding', () => {
  const { paths, unresolvedFindings } = run(singleSqlInjection());
  assert.equal(unresolvedFindings.length, 0);
  assert.equal(paths.length, 1);
  assert.deepEqual(paths[0].nodeIds, ['r1', 'f1', 's1', 'v1', 'k1']);
  assert.equal(paths[0].findingId, 'finding_001');
  assert.equal(paths[0].routeResolved, true);
  assert.deepEqual(
    paths[0].links.map((l) => [l.type, l.derived]),
    [['ROUTE_TO_FUNCTION', false], ['HANDLER_READS_SOURCE', true], ['ASSIGNMENT', false], ['DATA_FLOW', false]]
  );
});

test('a data flow without a finding (e.g. parameterized query) is not an attack path', () => {
  const { paths } = run(singleSqlInjection({ findings: [] }));
  assert.equal(paths.length, 0);
});

test('with two same-named sinks in one file, only the finding location is used', () => {
  const base = singleSqlInjection();
  const output = {
    ...base,
    sinks: [...base.sinks, { id: 'k2', type: 'DATABASE', name: 'db.query', file: 'app.js', line: 9 }],
    variables: [...base.variables, { id: 'v2', name: 'q', file: 'app.js', line: 8 }],
    relationships: [...base.relationships, { from: 's1', to: 'v2', type: 'ASSIGNMENT' }, { from: 'v2', to: 'k2', type: 'DATA_FLOW' }],
    findings: [{ ...base.findings[0], line: 9 }]
  };
  const { paths } = run(output);
  assert.equal(paths.length, 1);
  assert.equal(paths[0].sink.id, 'k2');
  assert.deepEqual(paths[0].nodeIds, ['r1', 'f1', 's1', 'v2', 'k2']);
});

test('a finding with route null keeps the route null and starts at the source', () => {
  const base = singleSqlInjection();
  const { paths } = run({ ...base, findings: [{ ...base.findings[0], route: null }] });
  assert.equal(paths[0].route, null);
  assert.equal(paths[0].routeResolved, false);
  assert.deepEqual(paths[0].nodeIds, ['s1', 'v1', 'k1']);
});

test('routes are matched through ROUTE_TO_FUNCTION, not by "first route in the same file"', () => {
  const base = singleSqlInjection();
  const output = {
    ...base,
    routes: [
      { id: 'r0', method: 'GET', path: '/health', file: 'app.js', line: 9, handler: 'health' },
      ...base.routes
    ],
    functions: [...base.functions, { id: 'f0', name: 'health', file: 'app.js', line: 20 }],
    relationships: [...base.relationships, { from: 'r0', to: 'f0', type: 'ROUTE_TO_FUNCTION' }]
  };
  const { paths } = run(output);
  assert.equal(paths[0].route.id, 'r1');
  assert.equal(paths[0].handler.id, 'f1');
});

test('handler in another file than the source: route is kept, handler is not invented', () => {
  const base = singleSqlInjection();
  const { paths } = run({
    ...base,
    functions: [{ id: 'f1', name: 'getUser', file: 'other.js', line: 1 }]
  });
  assert.equal(paths[0].route.id, 'r1');
  assert.equal(paths[0].handler, null);
  assert.deepEqual(paths[0].nodeIds, ['r1', 's1', 'v1', 'k1']);
  assert.equal(paths[0].links[0].type, 'ROUTE_REACHES_SOURCE');
});

test('an unresolvable finding is reported, not guessed', () => {
  const base = singleSqlInjection();
  const { paths, unresolvedFindings } = run({ ...base, findings: [{ ...base.findings[0], line: 99 }] });
  assert.equal(paths.length, 0);
  assert.equal(unresolvedFindings.length, 1);
  assert.equal(unresolvedFindings[0].findingId, 'finding_001');
});

test('the source must match finding.source, not just any reachable input', () => {
  const base = singleSqlInjection();
  const { unresolvedFindings } = run({ ...base, findings: [{ ...base.findings[0], source: 'req.body.other' }] });
  assert.equal(unresolvedFindings.length, 1);
});

test('cyclic data flow terminates and returns the shortest chain', () => {
  const output = makeOutput({
    sources: [{ id: 's1', type: 'HTTP_INPUT', expression: 'req.query.a', file: 'a.js', line: 1 }],
    variables: [
      { id: 'v1', name: 'a', file: 'a.js', line: 1 },
      { id: 'v2', name: 'b', file: 'a.js', line: 2 }
    ],
    sinks: [{ id: 'k1', type: 'DANGEROUS_CODE_EXECUTION', name: 'eval', file: 'a.js', line: 3 }],
    relationships: [
      { from: 's1', to: 'v1', type: 'ASSIGNMENT' },
      { from: 'v1', to: 'v2', type: 'VARIABLE_TO_VARIABLE' },
      { from: 'v2', to: 'v1', type: 'VARIABLE_TO_VARIABLE' },
      { from: 'v2', to: 'k1', type: 'DATA_FLOW' },
      { from: 'v1', to: 'k1', type: 'DATA_FLOW' }
    ],
    findings: [{ id: 'finding_001', type: 'CODE_EXECUTION', severity: 'HIGH', title: 't', file: 'a.js', line: 3, source: 'req.query.a', sink: 'eval', route: null, evidence: 'e' }]
  });
  const { paths } = run(output);
  assert.deepEqual(paths[0].nodeIds, ['s1', 'v1', 'k1']);
});
