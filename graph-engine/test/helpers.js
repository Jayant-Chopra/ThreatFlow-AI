'use strict';

/**
 * Small builder for hand-written analyzer outputs used in unit tests.
 * Real analyzer output is tested separately in integration.test.js.
 */
function makeOutput(partial = {}) {
  return {
    schemaVersion: '1.0',
    project: { name: 'unit', path: 'unit' },
    files: [],
    routes: [],
    functions: [],
    sources: [],
    sinks: [],
    variables: [],
    relationships: [],
    findings: [],
    summary: {},
    ...partial
  };
}

/**
 * One route -> handler -> source -> variable -> sink chain in app.js, plus its finding.
 * Lines: handler 1, source/variable 2, sink 3, route 10.
 */
function singleSqlInjection(overrides = {}) {
  return makeOutput({
    routes: [{ id: 'r1', method: 'GET', path: '/users', file: 'app.js', line: 10, handler: 'getUser' }],
    functions: [{ id: 'f1', name: 'getUser', file: 'app.js', line: 1 }],
    sources: [{ id: 's1', type: 'HTTP_INPUT', expression: 'req.query.id', file: 'app.js', line: 2 }],
    variables: [{ id: 'v1', name: 'id', file: 'app.js', line: 2 }],
    sinks: [{ id: 'k1', type: 'DATABASE', name: 'db.query', file: 'app.js', line: 3 }],
    relationships: [
      { from: 'r1', to: 'f1', type: 'ROUTE_TO_FUNCTION' },
      { from: 's1', to: 'v1', type: 'ASSIGNMENT' },
      { from: 'v1', to: 'k1', type: 'DATA_FLOW' }
    ],
    findings: [{
      id: 'finding_001', type: 'SQL_INJECTION', severity: 'HIGH', title: 'Potential SQL Injection',
      file: 'app.js', line: 3, source: 'req.query.id', sink: 'db.query', route: 'GET /users', evidence: 'test'
    }],
    ...overrides
  });
}

module.exports = { makeOutput, singleSqlInjection };
